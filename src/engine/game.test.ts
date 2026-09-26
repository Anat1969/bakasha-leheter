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
