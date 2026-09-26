import { content } from '../content';
import { buildRoute, createReducer, mursheChecks, pathAvailability, scorePlayer, stationSequence } from './game';
import type { GameState } from './types';

const reducer = createReducer(content);
const plot = (id: string) => content.plots.find((p) => p.id === id)!;

function start(track: 'extension' | 'house' | 'building' | 'mamad', names = ['ענת'], seed = 42) {
  return reducer(null, { type: 'START', track, names, seed }) as GameState;
}

/** משחק אוטומטי: עונה תמיד נכון / בוחר אפשרות ראשונה, עד הסוף */
function autoplay(s: GameState, maxSteps = 2000): GameState {
  for (let i = 0; i < maxSteps && s.phase.name !== 'ended'; i++) {
    const ph = s.phase;
    if (ph.name === 'turn') s = reducer(s, { type: 'ROLL' })!;
    else if (ph.name === 'station') {
      const st = content.stations.find((x) => x.id === ph.stationId)!;
      const opt = st.options.find((o) => o.correct) ?? st.options[0];
      s = reducer(s, { type: 'ANSWER', optionId: opt.id })!;
    } else s = reducer(s, { type: 'CONTINUE' })!;
  }
  return s;
}

describe('שער מורשה להיתר', () => {
  it('בית צמוד קרקע קטן עובר', () => {
    expect(mursheChecks(plot('p-room')).every((c) => c.pass)).toBe(true);
  });
  it('מבנה לשימור עם 60% מגורים נכשל', () => {
    const failed = mursheChecks(plot('p-heritage')).filter((c) => !c.pass).map((c) => c.id);
    expect(failed).toEqual(expect.arrayContaining(['residential', 'preservation']));
  });
  it('בניין בלי חתימת כל הבעלים נכשל', () => {
    expect(mursheChecks(plot('p-balcony')).find((c) => c.id === 'owners')!.pass).toBe(false);
  });
});

describe('זמינות דרכים', () => {
  it('הריסה ובנייה חוסמת את מסלול תיקון 160', () => {
    expect(pathAvailability(plot('p-rebuild')).find((a) => a.path === 'oldBuilding')!.allowed).toBe(false);
  });
  it('בניין ותיק בלי הריסה פותח את מסלול תיקון 160', () => {
    expect(pathAvailability(plot('p-balcony')).find((a) => a.path === 'oldBuilding')!.allowed).toBe(true);
  });
});

describe('בניית מסלול', () => {
  it('תוכנית עיצוב ובינוי נכנסת רק כשהתב"ע דורשת', () => {
    expect(stationSequence(content, plot('p-tower'), 'conforming')).toContain('design-plan');
    expect(stationSequence(content, plot('p-newhouse'), 'conforming')).not.toContain('design-plan');
  });
  it('מורשה להיתר מדלג על הוועדה ומוסיף משבצות אחריות', () => {
    const seq = stationSequence(content, plot('p-room'), 'murshe');
    expect(seq).not.toContain('committee');
    expect(buildRoute(content, plot('p-room'), 'murshe').some((q) => q.type === 'responsibility')).toBe(true);
  });
  it('הקלה מוסיפה פרסום אחרי ההגשה', () => {
    const seq = stationSequence(content, plot('p-newhouse'), 'relief');
    expect(seq.indexOf('publication')).toBeGreaterThan(seq.indexOf('submission'));
  });
  it('אחרי תוכנית עיצוב ובינוי באות הערות אדריכלית העיר', () => {
    const r = buildRoute(content, plot('p-tower'), 'conforming');
    const i = r.findIndex((q) => q.stationId === 'design-plan');
    expect(r[i + 1].type).toBe('cityArchitect');
  });
  it('ממ"ד בבניין משותף מחייב תוכנית צל', () => {
    expect(stationSequence(content, plot('p-mamad-apt'), 'conforming')).toContain('design-extension');
  });
  it('המסלול מסתיים בהיתר', () => {
    const r = buildRoute(content, plot('p-tower'), 'conforming');
    expect(r[r.length - 1].stationId).toBe('permit');
  });
});

describe('משחק מלא', () => {
  it('שחקן יחיד מגיע להיתר בכל מסלול ובכל דרך מותרת', () => {
    for (const track of ['extension', 'house', 'building', 'mamad'] as const) {
      for (let seed = 1; seed <= 5; seed++) {
        let s = start(track, ['א'], seed);
        const p = content.plots.find((x) => x.id === s.players[0].plotId)!;
        for (const a of pathAvailability(p).filter((x) => x.allowed)) {
          let g = reducer(s, { type: 'CHOOSE_PATH', path: a.path })!;
          g = autoplay(g);
          expect(g.phase.name).toBe('ended');
          expect(g.players[0].finished).toBe(true);
        }
      }
    }
  });

  it('ארבעה שחקנים — כולם מסיימים ויש סדר סיום', () => {
    let s = start('house', ['א', 'ב', 'ג', 'ד'], 7);
    for (let i = 0; i < 4; i++) s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    s = autoplay(s);
    expect(s.players.every((p) => p.finished)).toBe(true);
    expect(s.players.map((p) => p.finishOrder).sort()).toEqual([1, 2, 3, 4]);
  });

  it('תשובה שגויה משאירה בתחנה ומוסיפה זמן', () => {
    let s = start('extension', ['א'], 3);
    s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    s = reducer(s, { type: 'ROLL' })!; // עומדים בתחנה הראשונה
    expect(s.phase.name).toBe('station');
    const st = content.stations.find((x) => x.id === 'zoning-check')!;
    const wrong = st.options.find((o) => !o.correct)!;
    s = reducer(s, { type: 'ANSWER', optionId: wrong.id })!;
    expect(s.players[0].resolved).not.toContain('zoning-check');
    expect(s.players[0].res.months).toBe(1);
  });

  it('הניקוד כולל בונוס היתר', () => {
    let s = start('extension', ['א'], 9);
    s = autoplay(reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!);
    expect(scorePlayer(s.players[0], 1).lines[0].value).toBe(50);
  });
});

// ============================================================
// סימולציה רחבה — שומרת על המנוע כשמכווננים את קצב המשחק
// ============================================================

/** אקראיות דטרמיניסטית לבוט, כדי שכישלון יהיה ניתן לשחזור */
function botRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

interface SimResult {
  track: string;
  seed: number;
  plotId: string;
  path: string;
  steps: number;
  ended: boolean;
  reachedPermit: boolean;
  score: number;
  months: number;
  trust: number;
  city: number;
}

function simulate(track: 'extension' | 'house' | 'building' | 'mamad', seed: number, wrongRate: number): SimResult {
  const r = botRandom(seed * 7919 + 13);
  let s = start(track, ['בוט'], seed);
  const p0 = content.plots.find((p) => p.id === s.players[0].plotId)!;
  const allowed = pathAvailability(p0).filter((a) => a.allowed);
  const path = allowed[Math.floor(r() * allowed.length)].path;
  s = reducer(s, { type: 'CHOOSE_PATH', path })!;

  let steps = 0;
  while (s.phase.name !== 'ended' && steps < 4000) {
    steps++;
    const ph = s.phase;
    if (ph.name === 'turn') s = reducer(s, { type: 'ROLL' })!;
    else if (ph.name === 'station') {
      const st = content.stations.find((x) => x.id === ph.stationId)!;
      const correct = st.options.find((o) => o.correct) ?? st.options[0];
      const wrong = st.options.find((o) => !o.correct) ?? st.options[0];
      s = reducer(s, { type: 'ANSWER', optionId: r() < wrongRate ? wrong.id : correct.id })!;
    } else if (ph.name === 'stationResult' || ph.name === 'card') s = reducer(s, { type: 'CONTINUE' })!;
    else break;
  }

  const p = s.players[0];
  return {
    track,
    seed,
    plotId: p0.id,
    path,
    steps,
    ended: s.phase.name === 'ended',
    reachedPermit: p.resolved.includes('permit'),
    score: scorePlayer(p, 1).total,
    months: p.res.months,
    trust: p.res.trust,
    city: p.res.city,
  };
}

describe('מרווח בין תחנות', () => {
  /** גדלי המרווחים בין תחנות עוקבות במסלול */
  function gaps(route: { type: string; stationId?: string }[]): number[] {
    const out: number[] = [];
    let run = 0;
    let seenStation = false;
    for (const sq of route) {
      if (sq.type === 'station') {
        if (seenStation) out.push(run);
        seenStation = true;
        run = 0;
      } else run++;
    }
    return out;
  }

  const routes = content.plots.flatMap((p) =>
    pathAvailability(p)
      .filter((a) => a.allowed)
      .map((a) => ({ id: `${p.id}/${a.path}`, route: buildRoute(content, p, a.path) })),
  );

  it('כל מרווח הוא בין 3 ל-5 משבצות', () => {
    const bad: string[] = [];
    for (const r of routes) {
      for (const g of gaps(r.route)) if (g < 3 || g > 5) bad.push(`${r.id}: מרווח ${g}`);
    }
    expect(bad).toEqual([]);
  });

  it('המרווח לא קבוע — הקובייה צריכה להרגיש', () => {
    const long = routes.filter((r) => gaps(r.route).length >= 6);
    expect(long.length).toBeGreaterThan(0);
    for (const r of long) {
      expect(new Set(gaps(r.route)).size, `${r.id} מרווח אחיד`).toBeGreaterThan(1);
    }
  });

  it('ממוצע המרווחים בטווח שנקבע', () => {
    const all = routes.flatMap((r) => gaps(r.route));
    const avg = all.reduce((a, b) => a + b, 0) / all.length;
    expect(avg).toBeGreaterThanOrEqual(3);
    expect(avg).toBeLessThanOrEqual(5);
  });
});

describe('סימולציה: 300 משחקים', () => {
  const TRACKS = ['extension', 'house', 'building', 'mamad'] as const;
  const results: SimResult[] = [];
  const crashes: string[] = [];
  for (const track of TRACKS) {
    for (let i = 0; i < 75; i++) {
      const seed = i * 977 + 1;
      try {
        results.push(simulate(track, seed, i % 5 === 0 ? 0.45 : 0.15));
      } catch (e) {
        crashes.push(`${track}/${seed}: ${(e as Error).message}`);
      }
    }
  }
  const steps = results.map((x) => x.steps);
  const avgSteps = steps.reduce((a, b) => a + b, 0) / steps.length;

  it('אין קריסה, וכל 300 המשחקים הורצו', () => {
    expect(crashes).toEqual([]);
    expect(results).toHaveLength(300);
  });

  it('כל משחק מסתיים ומגיע להיתר', () => {
    expect(results.filter((x) => !x.ended).map((x) => `${x.track}/${x.seed}`)).toEqual([]);
    expect(results.filter((x) => !x.reachedPermit).map((x) => `${x.track}/${x.seed}`)).toEqual([]);
  });

  it('הניקוד תמיד מספר סופי ובטווח שפוי', () => {
    for (const x of results) {
      expect(Number.isFinite(x.score), `${x.track}/${x.seed}`).toBe(true);
      expect(x.score).toBeGreaterThan(0);
      expect(x.score).toBeLessThan(300);
    }
  });

  it('כל המגרשים וכל הדרכים המותרות נבדקים', () => {
    const plots = new Set(results.map((x) => x.plotId));
    expect(content.plots.filter((p) => !plots.has(p.id)).map((p) => p.id)).toEqual([]);
    expect(new Set(results.map((x) => x.path)).size).toBeGreaterThanOrEqual(4);
  });

  // תקרת קצב: כיוונון מרחק המשבצות לא יאריך את המשחק בלי גבול.
  // הבסיס לפני הארכת FILLERS היה ממוצע ~68 צעדים, והתקרה היא 40% מעליו.
  it('אורך משחק ממוצע נשאר מתחת לתקרה', () => {
    expect(avgSteps).toBeLessThanOrEqual(95);
    expect(Math.max(...steps)).toBeLessThan(400);
  });
});
