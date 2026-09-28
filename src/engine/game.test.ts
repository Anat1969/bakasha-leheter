import { content } from '../content';
import { DIE_FACES, buildRoute, createReducer, mursheChecks, pathAvailability, scorePlayer, stationSequence } from './game';
import type { DieFace, GameState, Square } from './types';

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
  cityMarks: number[];
  cityRises: number;
  routeLength: number;
}

function simulate(track: 'extension' | 'house' | 'building' | 'mamad', seed: number, wrongRate: number): SimResult {
  const r = botRandom(seed * 7919 + 13);
  let s = start(track, ['בוט'], seed);
  const p0 = content.plots.find((p) => p.id === s.players[0].plotId)!;
  const allowed = pathAvailability(p0).filter((a) => a.allowed);
  const path = allowed[Math.floor(r() * allowed.length)].path;
  s = reducer(s, { type: 'CHOOSE_PATH', path })!;

  let steps = 0;
  let cityRises = 0;
  while (s.phase.name !== 'ended' && steps < 4000) {
    steps++;
    const cityBefore = s.players[0].res.city;
    const ph = s.phase;
    if (ph.name === 'turn') s = reducer(s, { type: 'ROLL' })!;
    else if (ph.name === 'station') {
      const st = content.stations.find((x) => x.id === ph.stationId)!;
      const correct = st.options.find((o) => o.correct) ?? st.options[0];
      const wrong = st.options.find((o) => !o.correct) ?? st.options[0];
      s = reducer(s, { type: 'ANSWER', optionId: r() < wrongRate ? wrong.id : correct.id })!;
    } else if (ph.name === 'stationResult' || ph.name === 'card') s = reducer(s, { type: 'CONTINUE' })!;
    else break;
    const rise = s.players[0].res.city - cityBefore;
    if (rise > 0) cityRises += rise;
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
    cityMarks: p.cityMarks,
    cityRises,
    routeLength: p.route.length,
  };
}

describe('ביצועים משפיעים על אמון ועל מדד העיר', () => {
  const questions = content.stations.filter((s) => s.kind === 'question' && s.options.some((o) => o.correct));
  const correctOf = (id: string) => content.stations.find((s) => s.id === id)!.options.find((o) => o.correct)!;

  it('תשובה נכונה בתחנת "צריך" מוסיפה אמון אחד', () => {
    for (const st of questions.filter((s) => s.category === 'need')) {
      expect(correctOf(st.id).effects?.trust, st.id).toBe(1);
    }
  });

  it('תשובה נכונה בתחנת "רוצים" מוסיפה נקודת מדד עיר אחת', () => {
    for (const st of questions.filter((s) => s.category === 'want')) {
      expect(correctOf(st.id).effects?.city, st.id).toBe(1);
    }
  });

  it('תחנות "חובה" ו"הליך" לא מחלקות אמון או מדד — הן חוק, לא שיפוט', () => {
    for (const st of questions.filter((s) => s.category === 'must' || s.category === 'process')) {
      const e = correctOf(st.id).effects ?? {};
      expect(e.trust ?? 0, st.id).toBe(0);
      expect(e.city ?? 0, st.id).toBe(0);
    }
  });

  /**
   * הכלל החדש: תשובה שגויה עולה זמן וכסף, לא מוניטין.
   * בתחנות "החלטה" אין תשובה שגויה — לכל בחירה מחיר משלה, ולכן מדד שלילי שם תקין.
   * שש התשובות שלהלן הן תוכן שנכתב לפני הכלל, ומופיעות כאן במפורש כדי
   * שלא ייווצרו חדשות בשקט. ההחלטה אם לשנות אותן היא של בעלת התוכן.
   */
  const LEGACY_PENALTIES = [
    'design-plan/d',
    'design-fence/b',
    'design-extension/b',
    'design-facade/b',
    'agency-waste/b',
    'agency-properties/c',
  ];

  it('תשובה שגויה לא מורידה אמון ולא מדד — בלי עונש כפול', () => {
    const offenders: string[] = [];
    for (const st of content.stations) {
      if (st.kind !== 'question') continue; // החלטה אינה "שגויה"
      for (const o of st.options) {
        if (o.correct) continue;
        const e = o.effects ?? {};
        if ((e.trust ?? 0) < 0 || (e.city ?? 0) < 0) offenders.push(`${st.id}/${o.id}`);
      }
    }
    expect(offenders.sort()).toEqual([...LEGACY_PENALTIES].sort());
  });

  it('במשחק בפועל: מענה נכון בתחנת "צריך" מעלה אמון', () => {
    let s = start('building', ['א'], 42);
    s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    // תחנת "צריך" אמיתית מתוך המסלול שנבנה לשחקן הזה
    const needIds = s.players[0].route
      .filter((q) => q.type === 'station' && q.stationId)
      .map((q) => content.stations.find((x) => x.id === q.stationId)!)
      .filter((x) => x.category === 'need' && x.kind === 'question')
      .map((x) => x.id);
    expect(needIds.length, 'אין תחנת "צריך" במסלול הבדיקה').toBeGreaterThan(0);
    const target = needIds[0];

    let guard = 0;
    let before = -1;
    while (s.phase.name !== 'ended' && guard++ < 3000) {
      const ph = s.phase;
      if (ph.name === 'turn') s = reducer(s, { type: 'ROLL' })!;
      else if (ph.name === 'station') {
        const st = content.stations.find((x) => x.id === ph.stationId)!;
        if (st.id === target) before = s.players[0].res.trust;
        s = reducer(s, { type: 'ANSWER', optionId: (st.options.find((o) => o.correct) ?? st.options[0]).id })!;
      } else if (ph.name === 'stationResult') {
        const hit = ph.stationId === target && ph.passed;
        s = reducer(s, { type: 'CONTINUE' })!;
        if (hit) {
          expect(before).toBeGreaterThanOrEqual(0);
          expect(s.players[0].res.trust).toBe(before + 1);
          return;
        }
      } else if (ph.name === 'card') s = reducer(s, { type: 'CONTINUE' })!;
      else break;
    }
    throw new Error(`התחנה ${target} לא נפגשה במסלול`);
  });
});

describe('קובייה של סוגי משבצות', () => {
  /** מריץ ROLL עם פאה כפויה, בלי להסתמך על ה-rng */
  function rollWithFace(route: Square[], position: number, resolved: string[], face: DieFace) {
    // חיקוי הכלל: התחנה הראשונה שטרם נפתרה חוסמת, אחרת המשבצת הראשונה מהסוג
    for (let i = position + 1; i < route.length; i++) {
      const sq = route[i];
      const gate = sq.type === 'station' && !!sq.stationId && !resolved.includes(sq.stationId);
      if (gate || sq.type === face) return i;
    }
    return -1;
  }

  it('שש פאות בדיוק, וכולן חוקיות', () => {
    expect(DIE_FACES).toHaveLength(6);
    const legal: DieFace[] = ['event', 'knowledge', 'neighborhood', 'responsibility', 'cityArchitect', 'station'];
    for (const f of DIE_FACES) expect(legal).toContain(f);
  });

  it.each([...new Set(DIE_FACES)])('הפאה %s נוחתת על המשבצת הראשונה מסוגה', (face) => {
    // מסלול מלאכותי: משבצת מכל אחד מחמשת הסוגים, ואז תחנה
    const route: Square[] = [
      { type: 'station', stationId: 'a' },
      { type: 'event' },
      { type: 'knowledge' },
      { type: 'neighborhood' },
      { type: 'responsibility' },
      { type: 'cityArchitect' },
      { type: 'station', stationId: 'b' },
    ];
    const landed = rollWithFace(route, 0, ['a'], face);
    if (face === 'station') expect(route[landed].stationId).toBe('b');
    else expect(route[landed].type).toBe(face);
  });

  it('פאה שאין לה משבצת לפני התחנה — עוצרים בתחנה', () => {
    const route: Square[] = [
      { type: 'station', stationId: 'a' },
      { type: 'event' },
      { type: 'station', stationId: 'b' },
      { type: 'knowledge' },
    ];
    // knowledge קיים רק אחרי תחנה b, והיא חוסמת
    const landed = rollWithFace(route, 0, ['a'], 'knowledge');
    expect(route[landed].stationId).toBe('b');
  });

  it('תחנה שטרם נפתרה תמיד חוסמת, בכל פאה', () => {
    const route: Square[] = [
      { type: 'station', stationId: 'a' },
      { type: 'station', stationId: 'b' },
      { type: 'event' },
    ];
    for (const face of new Set(DIE_FACES)) {
      expect(route[rollWithFace(route, 0, ['a'], face)].stationId, face).toBe('b');
    }
  });

  it('במשחק אמיתי: lastRoll הוא פאה, והשחקן נוחת עליה או בתחנה', () => {
    let s = start('building', ['א'], 21);
    s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    let rolls = 0;
    let guard = 0;
    while (s.phase.name !== 'ended' && guard++ < 3000) {
      const ph = s.phase;
      if (ph.name === 'turn') {
        const before = s.players[0].position;
        s = reducer(s, { type: 'ROLL' })!;
        const face = s.lastRoll;
        if (face) {
          rolls++;
          expect(typeof face).toBe('string');
          const p = s.players[0];
          if (p.position !== before) {
            const sq = p.route[p.position];
            const ok = sq.type === face || sq.type === 'station';
            expect(ok, `פאה ${face} נחתה על ${sq.type}`).toBe(true);
          }
        }
      } else if (ph.name === 'station') {
        const st = content.stations.find((x) => x.id === ph.stationId)!;
        s = reducer(s, { type: 'ANSWER', optionId: (st.options.find((o) => o.correct) ?? st.options[0]).id })!;
      } else if (ph.name === 'stationResult' || ph.name === 'card') s = reducer(s, { type: 'CONTINUE' })!;
      else break;
    }
    expect(rolls).toBeGreaterThan(5);
    expect(s.phase.name).toBe('ended');
  });
});

describe('סימוני מדד העיר על הלוח', () => {
  it('משחק חדש מתחיל בלי סימונים', () => {
    const s = start('building', ['א'], 11);
    expect(s.players[0].cityMarks).toEqual([]);
  });

  it('עלייה במדד מסמנת את המשבצת שבה היא קרתה', () => {
    let s = start('extension', ['א'], 4);
    s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    let guard = 0;
    while (s.phase.name !== 'ended' && guard++ < 3000) {
      const before = s.players[0];
      const ph = s.phase;
      if (ph.name === 'turn') s = reducer(s, { type: 'ROLL' })!;
      else if (ph.name === 'station') {
        const st = content.stations.find((x) => x.id === ph.stationId)!;
        s = reducer(s, { type: 'ANSWER', optionId: (st.options.find((o) => o.correct) ?? st.options[0]).id })!;
      } else if (ph.name === 'stationResult' || ph.name === 'card') s = reducer(s, { type: 'CONTINUE' })!;
      else break;

      const after = s.players[0];
      const rose = after.res.city - before.res.city;
      if (rose > 0) {
        // נוספו בדיוק כמה סימונים כמו גודל העלייה, כולם במשבצת שעליה השחקן עומד
        // כשהאפקט חל — בהטלה זו משבצת הנחיתה, בתשובה זו משבצת התחנה.
        expect(after.cityMarks.length - before.cityMarks.length).toBe(rose);
        for (const m of after.cityMarks.slice(before.cityMarks.length)) expect(m).toBe(after.position);
      }
    }
    expect(s.phase.name).toBe('ended');
  });

  it('מספר הסימונים שווה לסך העליות במדד לאורך המשחק', () => {
    for (const track of ['extension', 'house', 'building', 'mamad'] as const) {
      for (const seed of [7, 23, 101]) {
        const r = simulate(track, seed, 0.2);
        expect(r.cityMarks.length, `${track}/${seed}`).toBe(r.cityRises);
        expect(r.cityMarks.every((m) => m >= 0 && m < r.routeLength), `${track}/${seed}`).toBe(true);
      }
    }
  });

  it('ירידה במדד לא מוסיפה סימון', () => {
    let s = start('building', ['א'], 5);
    s = reducer(s, { type: 'CHOOSE_PATH', path: 'conforming' })!;
    const before = s.players[0].cityMarks.length;
    // תחנה עם אפשרות שמורידה מדד
    const st = content.stations.find((x) => x.options.some((o) => (o.effects?.city ?? 0) < 0))!;
    const bad = st.options.find((o) => (o.effects?.city ?? 0) < 0)!;
    const forced: GameState = { ...s, phase: { name: 'station', stationId: st.id } };
    const after = reducer(forced, { type: 'ANSWER', optionId: bad.id })!;
    expect(after.players[0].res.city).toBeLessThan(0);
    expect(after.players[0].cityMarks.length).toBe(before);
  });
});

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
