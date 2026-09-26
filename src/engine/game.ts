// ============================================================
// מנוע המשחק — פונקציות טהורות בלבד (ללא React, ללא DOM)
// ============================================================
import type {
  Action,
  Card,
  CardDeck,
  Content,
  Effects,
  GameState,
  PathId,
  Player,
  Plot,
  Resources,
  Square,
  Station,
} from './types';

export const START_RESOURCES: Resources = { budget: 100, months: 0, trust: 0, city: 0, shields: 0 };
export const TABU_VALID_MONTHS = 6;
export const DIE_SIDES = 6;

// ---------- אקראיות עם זרע (לשחזור ולבדיקות) ----------
export function nextRandom(state: number): [number, number] {
  let t = (state + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return [value, t];
}

// ---------- מורשה להיתר: שער הכשירות ----------
export interface GateCheck {
  id: string;
  label: string;
  pass: boolean;
  reason: string;
}

export function mursheChecks(plot: Plot): GateCheck[] {
  const smallBuilding = plot.floors <= 2 && plot.units <= 5;
  return [
    {
      id: 'residential',
      label: 'לפחות 80% מהבניין מיועדים למגורים',
      pass: plot.residentialPct >= 80,
      reason: `במגרש הזה ${plot.residentialPct}% מגורים.`,
    },
    {
      id: 'scope',
      label: 'עד 2 קומות ו-5 יחידות דיור, או בקרת תכן במכון בקרה',
      pass: smallBuilding || plot.controlInstitute,
      reason: smallBuilding
        ? `${plot.floors} קומות ו-${plot.units} יחידות.`
        : plot.controlInstitute
          ? 'הבניין גדול, אבל בקרת התכן נעשית במכון בקרה.'
          : `${plot.floors} קומות ו-${plot.units} יחידות, בלי מכון בקרה.`,
    },
    {
      id: 'noRelief',
      label: 'בלי הקלה ובלי שימוש חורג',
      pass: true,
      reason: 'במסלול המורשה בונים לפי התוכנית בלבד.',
    },
    {
      id: 'preservation',
      label: 'המבנה אינו מיועד לשימור',
      pass: !plot.preservation,
      reason: plot.preservation ? 'המבנה מיועד לשימור.' : 'המבנה אינו לשימור.',
    },
    {
      id: 'owners',
      label: 'כל בעלי הזכויות חתמו',
      pass: plot.allOwnersSigned,
      reason: plot.allOwnersSigned ? 'כל הבעלים חתמו.' : 'לא כל בעלי הזכויות בבניין חתמו.',
    },
  ];
}

export interface PathAvailability {
  path: PathId;
  allowed: boolean;
  reason: string;
}

export function pathAvailability(plot: Plot): PathAvailability[] {
  const oldOk = plot.buildingAge >= 8 && !plot.demolition;
  const mursheOk = mursheChecks(plot).every((c) => c.pass);
  return [
    { path: 'conforming', allowed: true, reason: 'תמיד אפשרי.' },
    { path: 'flexibility', allowed: true, reason: 'רק לשינוי זניח בנושא שבתקנות.' },
    { path: 'relief', allowed: true, reason: 'רק בנושא שברשימה הסגורה.' },
    {
      path: 'oldBuilding',
      allowed: oldOk,
      reason:
        plot.buildingAge === 0
          ? 'אין בניין קיים במגרש.'
          : plot.demolition
            ? 'הריסה ובנייה מחדש מוחרגת מתיקון 160.'
            : plot.buildingAge < 8
              ? 'הבניין הושלם לפני פחות מ-8 שנים.'
              : `הבניין קיים ${plot.buildingAge} שנים, בלי הריסה.`,
    },
    {
      path: 'murshe',
      allowed: mursheOk,
      reason: mursheOk ? 'כל תנאי הכשירות מתקיימים.' : 'לפחות תנאי אחד בשער הכשירות לא מתקיים.',
    },
  ];
}

// ---------- בניית מסלול המשבצות ----------
export function stationSequence(c: Content, plot: Plot, pathId: PathId): string[] {
  const track = c.tracks.find((t) => t.id === plot.track);
  const path = c.paths.find((p) => p.id === pathId);
  if (!track || !path) throw new Error('מסלול או דרך לא נמצאו');
  const seq: string[] = [];
  for (const id of track.stations) {
    if (id === '@designPlan') {
      if (plot.requiresDesignPlan) seq.push('design-plan');
    } else if (id === '@pathPre') seq.push(...path.preStations);
    else if (id === '@pathPost') seq.push(...path.postStations);
    else if (id === '@agencies') seq.push(...plot.agencies);
    else seq.push(id);
  }
  return seq.filter((id) => !path.skipStations.includes(id));
}

/**
 * המשבצות שבין תחנה לתחנה. האורך משתנה בכוונה (3–5), כדי שהטלת הקובייה
 * תיתן תחושת התקדמות אמיתית ולא תגיע כמעט תמיד לתחנה הבאה במכה אחת.
 */
const FILLERS: CardDeck[][] = [
  ['event', 'neighborhood', 'knowledge'],
  ['knowledge', 'event', 'neighborhood', 'event'],
  ['neighborhood', 'knowledge', 'event', 'knowledge', 'neighborhood'],
  ['event', 'knowledge', 'neighborhood'],
  ['knowledge', 'neighborhood', 'event', 'knowledge'],
];

export function buildRoute(c: Content, plot: Plot, pathId: PathId): Square[] {
  const path = c.paths.find((p) => p.id === pathId);
  const route: Square[] = [];
  let prev = '';
  stationSequence(c, plot, pathId).forEach((stationId, i) => {
    if (i > 0) {
      let fill = [...FILLERS[i % FILLERS.length]];
      if (path?.responsibilitySquares && i % 2 === 0) fill[0] = 'responsibility';
      // אחרי תוכנית עיצוב ובינוי: הערות אדריכלית העיר (נספח א')
      if (prev === 'design-plan') fill = ['cityArchitect', 'cityArchitect', 'cityArchitect'];
      for (const deck of fill) route.push({ type: deck });
    }
    route.push({ type: 'station', stationId });
    prev = stationId;
  });
  return route;
}

// ---------- עזרי מצב ----------
function applyEffects(res: Resources, e: Effects = {}): Resources {
  return {
    budget: res.budget + (e.budget ?? 0),
    months: Math.max(0, res.months + (e.months ?? 0)),
    trust: res.trust + (e.trust ?? 0),
    city: res.city + (e.city ?? 0),
    shields: Math.max(0, res.shields + (e.shields ?? 0)),
  };
}

/**
 * מחיל אפקטים על שחקן, ואם מדד העיר עלה — מסמן את המשבצת שבה זה קרה.
 * כך העץ נשתל על הלוח במקום שבו ההחלטה התקבלה, ולא במרווח שרירותי.
 */
function withEffects(p: Player, ...effects: (Effects | undefined)[]): Player {
  let res = p.res;
  for (const e of effects) res = applyEffects(res, e);
  const rose = res.city - p.res.city;
  const cityMarks = rose > 0 ? [...(p.cityMarks ?? []), ...Array.from({ length: rose }, () => p.position)] : (p.cityMarks ?? []);
  return { ...p, res, cityMarks };
}

function updatePlayer(state: GameState, idx: number, fn: (p: Player) => Player): GameState {
  return { ...state, players: state.players.map((p, i) => (i === idx ? fn(p) : p)) };
}

export function currentSquare(p: Player): Square | undefined {
  return p.route[p.position];
}

export function isOnOpenStation(p: Player): boolean {
  const sq = currentSquare(p);
  return !!sq && sq.type === 'station' && !!sq.stationId && !p.resolved.includes(sq.stationId);
}

function drawCard(c: Content, state: GameState, deck: CardDeck, path: PathId | null): [Card | null, GameState] {
  const pool = c.cards.filter((card) => card.deck === deck && (!card.onlyPaths || (path && card.onlyPaths.includes(path))));
  if (!pool.length) return [null, state];
  let available = pool.filter((card) => !state.usedCards.includes(card.id));
  let used = state.usedCards;
  if (!available.length) {
    // החפיסה נגמרה — מערבבים מחדש
    used = used.filter((id) => !pool.some((card) => card.id === id));
    available = pool;
  }
  const [r, rng] = nextRandom(state.rng);
  const card = available[Math.floor(r * available.length)];
  return [card, { ...state, rng, usedCards: [...used, card.id] }];
}

function nextTurn(state: GameState): GameState {
  if (state.players.every((p) => p.finished)) return { ...state, phase: { name: 'ended' }, lastRoll: null };
  let next = state.current;
  for (let i = 0; i < state.players.length; i++) {
    next = (next + 1) % state.players.length;
    if (!state.players[next].finished) break;
  }
  return { ...state, current: next, phase: { name: 'turn' }, lastRoll: null };
}

/** בדיקת תוקף נסח טאבו — מחזירה הערות ומצב שחקן מעודכן */
function checkTabu(p: Player): { player: Player; notes: string[] } {
  if (p.tabuAt === null || p.res.months - p.tabuAt <= TABU_VALID_MONTHS) return { player: p, notes: [] };
  const res = applyEffects(p.res, { months: 1, budget: -2 });
  return {
    player: { ...p, res, tabuAt: res.months },
    notes: [`נסח הטאבו פג: עברו יותר מ-${TABU_VALID_MONTHS} חודשים. הפקתם נסח חדש (חודש אחד ו-2 נקודות תקציב).`],
  };
}

// ---------- ניקוד ----------
export interface ScoreLine {
  label: string;
  value: number;
}

export function scorePlayer(p: Player, playersCount: number): { total: number; lines: ScoreLine[] } {
  const lines: ScoreLine[] = [
    { label: 'היתר התקבל', value: p.finished ? 50 : 0 },
    { label: 'מדד עיר (×5)', value: p.res.city * 5 },
    { label: 'אמון שכנים (×3)', value: p.res.trust * 3 },
    { label: 'בונוס זמן (30 פחות חודשים)', value: Math.max(0, 30 - p.res.months) },
    { label: 'יתרת תקציב (÷10)', value: Math.floor(Math.max(0, p.res.budget) / 10) },
  ];
  if (playersCount > 1 && p.finishOrder === 1) lines.push({ label: 'ראשונים להיתר', value: 10 });
  return { total: lines.reduce((s, l) => s + l.value, 0), lines };
}

// ---------- ה-reducer ----------
export function createReducer(c: Content) {
  const station = (id: string): Station => {
    const s = c.stations.find((x) => x.id === id);
    if (!s) throw new Error(`תחנה לא נמצאה: ${id}`);
    return s;
  };
  const plotOf = (p: Player): Plot => {
    const plot = c.plots.find((x) => x.id === p.plotId);
    if (!plot) throw new Error(`מגרש לא נמצא: ${p.plotId}`);
    return plot;
  };

  return function reducer(state: GameState | null, action: Action): GameState | null {
    if (action.type === 'LOAD') return action.state;

    if (action.type === 'START') {
      let rng = action.seed >>> 0;
      const trackPlots = c.plots.filter((p) => p.track === action.track);
      const order: number[] = [];
      const players: Player[] = action.names.map((name, id) => {
        let pick: number;
        const unused = trackPlots.map((_, i) => i).filter((i) => !order.includes(i));
        const pool = unused.length ? unused : trackPlots.map((_, i) => i);
        const [r, next] = nextRandom(rng);
        rng = next;
        pick = pool[Math.floor(r * pool.length)];
        order.push(pick);
        return {
          id,
          name: name.trim() || `שחקן ${id + 1}`,
          plotId: trackPlots[pick].id,
          path: null,
          route: [],
          position: 0,
          resolved: [],
          res: { ...START_RESOURCES },
          tabuAt: null,
          cityMarks: [],
          finished: false,
          finishOrder: null,
          log: [],
        };
      });
      return {
        version: 1,
        track: action.track,
        players,
        current: 0,
        phase: { name: 'pathChoice', player: 0 },
        rng,
        lastRoll: null,
        finishedCount: 0,
        usedCards: [],
      };
    }

    if (!state) return state;
    const cur = state.players[state.current];

    switch (action.type) {
      case 'CHOOSE_PATH': {
        if (state.phase.name !== 'pathChoice') return state;
        const idx = state.phase.player;
        const plot = plotOf(state.players[idx]);
        const avail = pathAvailability(plot).find((a) => a.path === action.path);
        if (!avail?.allowed) return state;
        const route = buildRoute(c, plot, action.path);
        let s = updatePlayer(state, idx, (p) => ({ ...p, path: action.path, route, position: 0 }));
        s =
          idx + 1 < s.players.length
            ? { ...s, phase: { name: 'pathChoice', player: idx + 1 } }
            : { ...s, current: 0, phase: { name: 'turn' } };
        return s;
      }

      case 'ROLL': {
        if (state.phase.name !== 'turn' || cur.finished) return state;
        // עומדים בתחנה פתוחה? עונים עליה במקום להטיל
        if (isOnOpenStation(cur)) {
          return { ...state, phase: { name: 'station', stationId: currentSquare(cur)!.stationId! } };
        }
        const [r, rng] = nextRandom(state.rng);
        const roll = 1 + Math.floor(r * DIE_SIDES);
        let pos = cur.position;
        for (let step = 0; step < roll && pos < cur.route.length - 1; step++) {
          pos++;
          const sq = cur.route[pos];
          if (sq.type === 'station' && sq.stationId && !cur.resolved.includes(sq.stationId)) break; // שער
        }
        let s: GameState = { ...state, rng, lastRoll: roll };
        s = updatePlayer(s, s.current, (p) => ({ ...p, position: pos }));
        const moved = s.players[s.current];
        const sq = currentSquare(moved)!;
        if (sq.type === 'station') {
          return { ...s, phase: { name: 'station', stationId: sq.stationId! } };
        }
        const [card, s2] = drawCard(c, s, sq.type, moved.path);
        if (!card) return nextTurn(s2);
        const notes: string[] = [];
        let after = updatePlayer(s2, s2.current, (p) => {
          let np: Player = { ...withEffects(p, card.effects), log: [...p.log, `כרטיס: ${card.title}`] };
          if (card.action === 'backToRegularTrack' && np.path === 'murshe') {
            const plot = plotOf(np);
            const route = buildRoute(c, plot, 'conforming');
            const lastResolvedIdx = route.reduce(
              (m, q, i) => (q.type === 'station' && q.stationId && np.resolved.includes(q.stationId) ? i : m),
              0,
            );
            np = { ...np, path: 'conforming', route, position: lastResolvedIdx };
            notes.push('עברתם למסלול הרגיל. תחנת הוועדה נוספה למסלול.');
          }
          return np;
        });
        after = { ...after, phase: { name: 'card', cardId: card.id, notes } };
        return after;
      }

      case 'ANSWER': {
        if (state.phase.name !== 'station') return state;
        const st = station(state.phase.stationId);
        const opt = st.options.find((o) => o.id === action.optionId);
        if (!opt) return state;
        const track = c.tracks.find((t) => t.id === state.track)!;
        const notes: string[] = [];
        const passed = st.kind === 'decision' || !!opt.correct;
        let s = state;

        if (passed) {
          const base = st.id === 'committee' ? track.committeeMonths : st.baseMonths;
          s = updatePlayer(s, s.current, (p) => {
            let np: Player = {
              ...withEffects(p, { months: base }, opt.effects),
              resolved: [...p.resolved, st.id],
              log: [...p.log, `עבר: ${st.title}`],
            };
            if (st.id === 'survey-tabu') np = { ...np, tabuAt: np.res.months };
            if (st.id === 'submission' || st.id === 'permit') {
              const t = checkTabu(np);
              np = t.player;
              notes.push(...t.notes);
            }
            return np;
          });
          if (st.id === 'permit') {
            const order = s.finishedCount + 1;
            s = updatePlayer({ ...s, finishedCount: order }, s.current, (p) => ({ ...p, finished: true, finishOrder: order }));
          }
        } else {
          s = updatePlayer(s, s.current, (p) => {
            if (p.res.shields > 0) {
              notes.push('כרטיס הידע ביטל את הקנס. נסו שוב בתור הבא.');
              return { ...p, res: { ...p.res, shields: p.res.shields - 1 } };
            }
            return { ...withEffects(p, opt.effects), log: [...p.log, `טעות: ${st.title}`] };
          });
        }
        return { ...s, phase: { name: 'stationResult', stationId: st.id, optionId: opt.id, passed, notes } };
      }

      case 'CONTINUE': {
        if (state.phase.name === 'stationResult' || state.phase.name === 'card') return nextTurn(state);
        return state;
      }
      default:
        return state;
    }
  };
}
