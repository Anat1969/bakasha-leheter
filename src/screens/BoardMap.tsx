import { useEffect, useRef, useState } from 'react';
import { stationById } from '../content';
import type { GameState, Player } from '../engine/types';
import { play } from '../sound';
import { DECK_COLOR, layoutRoute, pathBetween, stationShape, type BoardMode, type StationShape } from './boardLayout';
import { MOTION } from './motion';

/** צבעי הכלים לפי סדר השחקנים */
export const PAWN = ['var(--stamp)', 'var(--brick)', 'var(--leaf)', 'var(--gold)'];

export function useBoardMode(): BoardMode {
  const [mode, setMode] = useState<BoardMode>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches ? 'tall' : 'wide',
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const on = () => setMode(mq.matches ? 'tall' : 'wide');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mode;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * מיקום מוצג לכל שחקן. המנוע מקפיץ את position מיד, וכאן הכלי הולך
 * משבצת-משבצת עד שהוא משלים את המרחק. holdMs = המתנה עד שהקובייה נוחתת.
 */
function useWalk(players: Player[], reduced: boolean, holdMs: number): Record<number, number> {
  const [shown, setShown] = useState<Record<number, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.position])),
  );
  const shownRef = useRef(shown);
  shownRef.current = shown;

  useEffect(() => {
    const target: Record<number, number> = Object.fromEntries(players.map((p) => [p.id, p.position]));
    if (reduced) {
      setShown(target);
      return;
    }
    let interval: number | null = null;
    const tick = () => {
      const prev = shownRef.current;
      const next: Record<number, number> = { ...prev };
      let moving = false;
      let stepped = false;
      for (const p of players) {
        const cur = next[p.id] ?? p.position;
        if (cur < p.position) {
          next[p.id] = cur + 1;
          moving = moving || cur + 1 < p.position;
          stepped = true;
        } else if (cur > p.position) {
          // חזרה אחורה (כרטיס אחריות) — קופצים, לא הולכים לאחור
          next[p.id] = p.position;
        }
      }
      if (stepped) play('step');
      shownRef.current = next;
      setShown(next);
      if (!moving && interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
    };
    const needs = players.some((p) => (shownRef.current[p.id] ?? p.position) !== p.position);
    if (!needs) return;
    const start = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, MOTION.step);
    }, holdMs);
    return () => {
      window.clearTimeout(start);
      if (interval !== null) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map((p) => `${p.id}:${p.position}`).join(','), reduced]);

  return shown;
}

interface Props {
  game: GameState;
  fit: boolean;
  /** המתנה לפני שהכלי יוצא לדרך, כדי שהקובייה תנחת קודם */
  holdMs: number;
  /** משבצת מסומנת מהיומן או מציר הזמן */
  focus: number | null;
  onFocus: (at: number | null) => void;
  /** נקרא כשכל הכלים הגיעו ליעד — רק אז נחשף מה שמחכה במשבצת */
  onSettled?: () => void;
}

export default function BoardMap({ game, fit, holdMs, focus, onFocus, onSettled }: Props) {
  const mode = useBoardMode();
  const reduced = useReducedMotion();
  const shown = useWalk(game.players, reduced, holdMs);
  const pawnRef = useRef<SVGGElement>(null);

  const current = game.players[game.current];
  const route = current.route;
  const lay = layoutRoute(route.length, mode);
  const city = current.res.city;
  // עץ נשתל במשבצת שבה מדד העיר עלה בפועל. משחק שמור ישן עוד בלי הסימונים.
  const trees = current.cityMarks ?? [];
  const dry = city < 0;

  const shownPos = shown[current.id] ?? current.position;
  const arrived = shownPos === current.position;
  const settled = game.players.every((p) => (shown[p.id] ?? p.position) === p.position);
  useEffect(() => {
    if (settled) onSettled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, shownPos]);
  const gate = game.phase.name === 'station' && arrived ? lay.points[current.position] : null;

  // גלילה אוטומטית אחרי הכלי
  useEffect(() => {
    if (fit) return;
    const el = pawnRef.current;
    if (!el) return;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [shownPos, reduced, fit]);

  const totalStations = route.filter((sq) => sq.type === 'station').length;
  const approved = current.resolved.filter((id) => route.some((q) => q.stationId === id)).length;
  const approvedText =
    approved === 0 ? 'עוד לא אושרה תחנה' : approved === 1 ? 'אושרה תחנה אחת' : `אושרו ${approved} תחנות`;

  let stationCount = 0;

  return (
    <div className={`boardmap ${mode} ${dry ? 'dry' : ''} ${fit ? 'fit' : ''}`}>
      <svg
        viewBox={`0 0 ${lay.width} ${lay.height}`}
        className="boardmap-svg"
        role="img"
        aria-label={`לוח המשחק. ${current.name} במשבצת ${shownPos + 1} מתוך ${route.length}. ${approvedText} מתוך ${totalStations}. גיליון הדרישות, בכפתור שמעל הלוח, מציג את אותו מידע כטקסט.`}
      >
        <defs>
          <pattern id="grid-minor" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" className="grid-minor" />
          </pattern>
          <pattern id="grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#grid-minor)" />
            <path d="M 100 0 L 0 0 0 100" className="grid-major" />
          </pattern>
          <pattern id="sea-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <line x1="0" y1="0" x2="0" y2="9" className="sea-hatch" />
          </pattern>
          <pattern id="sand-stipple" width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="3" r="0.9" className="stipple" />
            <circle cx="8" cy="8" r="0.7" className="stipple" />
            <circle cx="6" cy="1" r="0.5" className="stipple" />
          </pattern>
          <pattern id="poche" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" className="poche" />
          </pattern>
          {/* מסכה: שחור ולבן כאן הם ערכי שקיפות, לא צבעים שנראים על המסך */}
          <radialGradient id="spot-grad">
            <stop offset="0.55" stopColor="#000" />
            <stop offset="1" stopColor="#fff" />
          </radialGradient>
          <mask id="spot-mask">
            <rect x="0" y="0" width={lay.width} height={lay.height} fill="#fff" />
            {gate && <circle cx={gate.x} cy={gate.y} r={mode === 'wide' ? 120 : 105} fill="url(#spot-grad)" />}
          </mask>
        </defs>

        <Scenery lay={lay} />

        {/* הדרך: רחוב בתוכנית, קו מרכזי מקווקו */}
        <path d={lay.d} className="road-edge" />
        <path d={lay.d} className="road" />
        <path d={lay.d} className="road-center" />

        {/* הקו המדויו: הדרך שכבר עברתם, מצוירת בעט */}
        {shownPos > 0 && <path d={pathBetween(lay.points, 0, shownPos - 1)} className="ink-trail" />}
        {shownPos > 0 && (
          <path key={`seg-${shownPos}`} d={pathBetween(lay.points, shownPos - 1, shownPos)} className="ink-trail fresh" pathLength={1} />
        )}

        {/* עצים: אחד לכל נקודה שבה מדד העיר עלה, ליד המשבצת שבה זה קרה */}
        {trees.map((idx, i) => {
          const p = lay.points[Math.min(idx, lay.points.length - 1)];
          if (!p) return null;
          // כמה עליות באותה משבצת — מתפזרות סביבה במקום להיערם
          const sameSpot = trees.slice(0, i).filter((x) => x === idx).length;
          const side = (i + sameSpot) % 2 === 0 ? -1 : 1;
          return <Tree key={`t${i}`} x={p.x + side * (46 + sameSpot * 16)} y={p.y + 28 + sameSpot * 9} seed={i} />;
        })}

        {/* משבצות */}
        {route.map((sq, i) => {
          const p = lay.points[i];
          if (!p) return null;
          const hot = focus === i;
          if (sq.type !== 'station') {
            const tilt = ((i * 37) % 17) - 8;
            return (
              <g
                key={i}
                className={`sq-card ${i === shownPos ? 'here' : ''} ${i < shownPos ? 'past' : ''} ${hot ? 'hot' : ''}`}
                transform={`translate(${p.x}, ${p.y}) rotate(${tilt})`}
                onMouseEnter={() => onFocus(i)}
                onMouseLeave={() => onFocus(null)}
              >
                {hot && <circle r="17" className="hot-ring" />}
                <rect x="-7.5" y="-10.5" width="15" height="21" rx="2.2" className="sq-card-shadow" transform="translate(1.6, 1.8)" />
                <rect x="-7.5" y="-10.5" width="15" height="21" rx="2.2" fill={DECK_COLOR[sq.type] ?? 'var(--line)'} className="sq-card-face" />
                <rect x="-4.5" y="-7.5" width="9" height="15" rx="1" className="sq-card-inset" />
              </g>
            );
          }
          const st = stationById(sq.stationId!);
          if (!st) return null;
          stationCount++;
          const passed = current.resolved.includes(st.id);
          return (
            <Station
              key={i}
              x={p.x}
              y={p.y}
              no={stationCount}
              shape={stationShape(st.id, st.agency)}
              title={st.title}
              category={st.category}
              passed={passed}
              here={i === shownPos}
              open={!!gate && i === current.position}
              hot={hot}
              mode={mode}
              onEnter={() => onFocus(i)}
              onLeave={() => onFocus(null)}
            />
          );
        })}

        {/* הזרקור: כשעוצרים בתחנה, כל השאר נסוג */}
        <rect x="0" y="0" width={lay.width} height={lay.height} mask="url(#spot-mask)" className={`spotlight ${gate ? 'on' : ''}`} pointerEvents="none" />

        {/* כלי המשחק */}
        {game.players.map((p, pi) => {
          const pos = shown[p.id] ?? p.position;
          const pt = lay.points[Math.min(pos, lay.points.length - 1)];
          if (!pt) return null;
          const mates = game.players.filter((q) => (shown[q.id] ?? q.position) === pos);
          const slot = mates.findIndex((q) => q.id === p.id);
          const spread = mates.length > 1 ? (slot - (mates.length - 1) / 2) * 20 : 0;
          const isCurrent = p.id === current.id;
          const color = PAWN[pi % PAWN.length];
          const landed = (shown[p.id] ?? p.position) === p.position;
          return (
            <g
              key={p.id}
              ref={isCurrent ? pawnRef : undefined}
              className={`pawn ${isCurrent ? 'current' : ''}`}
              transform={`translate(${pt.x + spread}, ${pt.y})`}
            >
              {isCurrent && landed && <circle key={`land-${pos}`} r="16" className="land-ring" />}
              <ellipse cx="2" cy="1" rx="16" ry="5.5" className="pawn-shadow" />
              <g key={`hop-${pos}`} className="hop">
                <g transform="translate(0, -12)">
                  <ellipse cx="0" cy="10" rx="15" ry="6" fill={color} className="pawn-base" />
                  <rect x="-15" y="0" width="30" height="10" fill={color} className="pawn-side" />
                  <ellipse cx="0" cy="0" rx="15" ry="6" fill={color} className="pawn-top" />
                  <ellipse cx="0" cy="0" rx="10" ry="3.8" className="pawn-inlay" />
                  <text x="0" y="-11" className="pawn-letter">
                    {p.name.trim().charAt(0) || String(pi + 1)}
                  </text>
                </g>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** קו חוף מתפתל — אותה פונקציה לים, לחול ולטיילת */
const coast = (seaX: number, y: number) => seaX + 7 * Math.sin(y / 55) + 4 * Math.sin(y / 23 + 1);

function coastPath(seaX: number, height: number, offset: number): string {
  let d = `M ${coast(seaX, 0) + offset} 0`;
  for (let y = 10; y <= height; y += 10) d += ` L ${(coast(seaX, y) + offset).toFixed(1)} ${y}`;
  return d;
}

/** רצועה בין שני קווי חוף מוסטים — החול שבין הטיילת לים */
function bandPath(seaX: number, height: number, a: number, b: number): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let y = 0; y <= height; y += 10) {
    left.push(`${(coast(seaX, y) + a).toFixed(1)} ${y}`);
    right.unshift(`${(coast(seaX, y) + b).toFixed(1)} ${y}`);
  }
  return `M ${left.join(' L ')} L ${right.join(' L ')} Z`;
}

/** פסאודו-אקראי קבוע לפי מספר — הנוף זהה בכל טעינה */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/**
 * רקע: תוכנית מצב של עיר חוף. ים מקווקו, חול מנוקד, קווי גובה של דיונות,
 * טיילת, גושי בניינים בהצללה, חץ צפון וקנה מידה. רמז לעיר — לא מפה.
 */
function Scenery({ lay }: { lay: ReturnType<typeof layoutRoute> }) {
  const { width, height, mode } = lay;
  const seaW = mode === 'wide' ? width * 0.13 : width * 0.17;
  const seaX = width - seaW;

  // גושי בניינים בין שורות המסלול (מחשב) או בצד הפנוי של העיקול (טלפון)
  const blocks: { x: number; y: number; w: number; h: number; k: number }[] = [];
  if (mode === 'wide') {
    const rows = Math.round((height - 185) / 155) + 1;
    for (let r = 0; r < rows - 1; r++) {
      const y = 100 + r * 155 + 60;
      for (let c = 0; c < 3; c++) {
        const k = r * 3 + c;
        if (hash(k) < 0.22) continue;
        const w = 110 + hash(k + 50) * 40;
        blocks.push({ x: 150 + c * 165 + hash(k + 9) * 20, y, w, h: 36 + hash(k + 3) * 10, k });
      }
    }
  } else {
    lay.points.forEach((p, i) => {
      if (i % 2 === 0 && p.x > 250) blocks.push({ x: 14, y: p.y - 30, w: 70, h: 50, k: i });
      if (i % 2 === 0 && p.x < 170) blocks.push({ x: 262, y: p.y - 26, w: 54, h: 44, k: i + 100 });
    });
  }

  return (
    <g aria-hidden="true" className="scenery">
      <rect x="0" y="0" width={width} height={height} className="land" />
      <rect x="0" y="0" width={width} height={height} fill="url(#grid-major)" />

      {/* ים: מילוי, הצללה אלכסונית, קו חוף */}
      <path d={`${coastPath(seaX, height, 0)} L ${width} ${height} L ${width} 0 Z`} className="sea" />
      <path d={`${coastPath(seaX, height, 0)} L ${width} ${height} L ${width} 0 Z`} fill="url(#sea-hatch)" />
      <path d={bandPath(seaX, height, -30, 0)} className="sand-fill" />
      <path d={bandPath(seaX, height, -30, 0)} fill="url(#sand-stipple)" />
      <path d={coastPath(seaX, height, 0)} className="coastline" />
      <path d={coastPath(seaX, height, -12)} className="contour" />
      <path d={coastPath(seaX, height, -21)} className="contour faint" />
      <path d={coastPath(seaX, height, -32)} className="promenade" />
      <text
        className="sea-label"
        transform={`translate(${width - seaW / 2 + 4}, ${Math.min(height * 0.5, 420)}) rotate(90)`}
      >
        הים התיכון
      </text>

      {/* גושים: קו מגרש, ובתוכו בניינים בהצללה */}
      {blocks.map((b) => {
        const n = 2 + Math.floor(hash(b.k + 21) * 3);
        const bw = (b.w - 10 - (n - 1) * 6) / n;
        return (
          <g key={b.k} className="block">
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3" className="block-lot" />
            {Array.from({ length: n }, (_, j) => {
              const hh = b.h - 10 - hash(b.k + j * 7) * 10;
              return (
                <rect key={j} x={b.x + 5 + j * (bw + 6)} y={b.y + 5} width={bw} height={hh} className="footprint" />
              );
            })}
          </g>
        );
      })}

      {/* חץ צפון */}
      <g className="north" transform={`translate(${mode === 'wide' ? 36 : 30}, 40)`}>
        <circle r="15" />
        <path d="M 0 -12 L 6 8 L 0 4 Z" className="north-fill" />
        <path d="M 0 -12 L -6 8 L 0 4 Z" />
        <text y="-19" className="north-letter">צ</text>
      </g>

      {/* קנה מידה — בכוונה לא אמיתי */}
      <g className="scalebar" transform={`translate(${mode === 'wide' ? 22 : 16}, ${height - 22})`}>
        <rect x="0" y="0" width="20" height="5" className="sb-dark" />
        <rect x="20" y="0" width="20" height="5" className="sb-light" />
        <rect x="40" y="0" width="40" height="5" className="sb-dark" />
        <text x="0" y="-5" className="sb-text">לא בקנ״מ</text>
      </g>

      {/* מסגרת הגיליון */}
      <rect x="6" y="6" width={width - 12} height={height - 12} className="sheet-frame" />
    </g>
  );
}

function Tree({ x, y, seed }: { x: number; y: number; seed: number }) {
  const r = 9 + hash(seed) * 3;
  // צמרת בתוכנית: עיגול גלי כמו בשרטוט נוף, ונקודת גזע במרכז
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    const rr = r + (i % 2 ? 1.6 : -0.6);
    return `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
  });
  return (
    <g className="tree" transform={`translate(${x}, ${y})`} aria-hidden="true">
      <g className="tree-grow">
        <ellipse cx="2.5" cy="3" rx={r} ry={r * 0.9} className="tree-shade" />
        <polygon points={pts.join(' ')} className="canopy" />
        <circle r={r * 0.45} className="canopy-inner" />
        <circle r="1.4" className="trunk" />
      </g>
    </g>
  );
}

interface StationProps {
  x: number;
  y: number;
  no: number;
  shape: StationShape;
  title: string;
  category: string;
  passed: boolean;
  here: boolean;
  open: boolean;
  hot: boolean;
  mode: BoardMode;
  onEnter: () => void;
  onLeave: () => void;
}

function Station({ x, y, no, shape, title, category, passed, here, open, hot, mode, onEnter, onLeave }: StationProps) {
  return (
    <g
      className={`station ${passed ? 'passed' : ''} ${here ? 'here' : ''} ${open ? 'open' : ''} ${hot ? 'hot' : ''} cat-${category}`}
      transform={`translate(${x}, ${y})`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {open && <circle r="36" className="gate-ring" />}
      {hot && <circle r="34" className="hot-ring" />}
      {/* בלוק בתוכנית: גוף, צל אקסונומטרי, וגג */}
      <rect x="-21" y="-21" width="42" height="42" rx="5" className="station-extrude" transform="translate(4, 4)" />
      <rect x="-21" y="-21" width="42" height="42" rx="5" className="station-base" />
      <g transform="translate(0, 1)">
        <Shape shape={shape} />
      </g>
      <g className="station-no" transform="translate(21, -21)">
        <circle r="9" />
        <text>{String(no).padStart(2, '0')}</text>
      </g>
      {passed && (
        <g className="station-stamp" transform="translate(-19, -19)">
          <g className="stamp-in">
            <circle cx="0" cy="0" r="10" />
            <path d="M -4.5 0 L -1.2 3.6 L 4.8 -3.2" />
          </g>
        </g>
      )}
      <text x="0" y={mode === 'wide' ? 42 : 40} className="station-label" textAnchor="middle">
        {title}
      </text>
    </g>
  );
}

/** צורות גאומטריות בלבד, ממורכזות סביב (0,0) בערך 22×22 */
export function Shape({ shape }: { shape: StationShape }) {
  switch (shape) {
    case 'columns':
      return (
        <g className="glyph">
          <path d="M -13 -8 L 0 -14 L 13 -8 Z" />
          <rect x="-10" y="-6" width="3.5" height="13" />
          <rect x="-1.75" y="-6" width="3.5" height="13" />
          <rect x="6.5" y="-6" width="3.5" height="13" />
          <rect x="-13" y="7" width="26" height="3" />
        </g>
      );
    case 'watertower':
      return (
        <g className="glyph">
          <rect x="-9" y="-13" width="18" height="10" rx="2" />
          <path d="M -6 -3 L -8 9" />
          <path d="M 6 -3 L 8 9" />
          <rect x="-9" y="9" width="18" height="2.5" />
        </g>
      );
    case 'drafting':
      return (
        <g className="glyph">
          <path d="M -13 4 L -4 -12 L 13 -12 L 4 4 Z" />
          <path d="M -4 8 L -4 -2" />
          <path d="M 6 8 L 6 -2" />
        </g>
      );
    case 'road':
      return (
        <g className="glyph">
          <path d="M -12 10 L -5 -12 L 5 -12 L 12 10 Z" />
          <path d="M 0 -8 L 0 -3" className="dash" />
          <path d="M 0 1 L 0 6" className="dash" />
        </g>
      );
    case 'canopy':
      return (
        <g className="glyph">
          <rect x="-2" y="-1" width="4" height="12" />
          <path d="M 0 -14 L 11 -1 L -11 -1 Z" />
        </g>
      );
    case 'ledger':
      return (
        <g className="glyph">
          <rect x="-11" y="-12" width="22" height="23" rx="1.5" />
          <path d="M -6 -6 L 6 -6" />
          <path d="M -6 0 L 6 0" />
          <path d="M -6 6 L 1 6" />
        </g>
      );
    case 'waves':
      return (
        <g className="glyph">
          <rect x="-12" y="-13" width="24" height="9" rx="1.5" />
          <path d="M -12 0 q 6 -5 12 0 t 12 0" />
          <path d="M -12 7 q 6 -5 12 0 t 12 0" />
        </g>
      );
    case 'bin':
      return (
        <g className="glyph">
          <path d="M -9 -8 L 9 -8 L 7 11 L -7 11 Z" />
          <rect x="-11" y="-12" width="22" height="3.5" rx="1" />
        </g>
      );
    case 'shelter':
      return (
        <g className="glyph">
          <rect x="-11" y="-11" width="22" height="22" rx="2" />
          <rect x="-5" y="-5" width="10" height="10" rx="1" />
        </g>
      );
    case 'facade':
      return (
        <g className="glyph">
          <rect x="-11" y="-13" width="22" height="24" rx="1.5" />
          <path d="M -5.5 -13 L -5.5 11" />
          <path d="M 0 -13 L 0 11" />
          <path d="M 5.5 -13 L 5.5 11" />
        </g>
      );
    case 'screen':
      return (
        <g className="glyph">
          <rect x="-12" y="-11" width="24" height="16" rx="2" />
          <path d="M -5 9 L 5 9" />
          <path d="M 0 5 L 0 9" />
        </g>
      );
    case 'seal':
      return (
        <g className="glyph seal">
          <circle cx="0" cy="0" r="12" />
          <circle cx="0" cy="0" r="8" />
        </g>
      );
    default:
      return (
        <g className="glyph">
          <path d="M -12 -2 L 0 -13 L 12 -2 Z" />
          <rect x="-9" y="-2" width="18" height="13" />
          <rect x="-3" y="3" width="6" height="8" />
        </g>
      );
  }
}
