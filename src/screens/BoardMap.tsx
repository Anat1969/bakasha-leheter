import { useEffect, useRef, useState } from 'react';
import { stationById } from '../content';
import type { GameState, Player } from '../engine/types';
import { DECK_COLOR, layoutRoute, stationShape, treeSlots, type BoardMode, type StationShape } from './boardLayout';

const STEP_MS = 180; // משך צעד אחד במסלול, לפי DESIGN.md סעיף 5

/** צבעי הכלים לפי סדר השחקנים */
const PAWN = ['var(--stamp)', 'var(--brick)', 'var(--leaf)', 'var(--gold)'];

function useBoardMode(): BoardMode {
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

function useReducedMotion(): boolean {
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
 * מיקום מוצג לכל שחקן. המנוע מקפיץ את position מיד,
 * וכאן הכלי הולך משבצת-משבצת עד שהוא משלים את המרחק.
 */
function useWalk(players: Player[], reduced: boolean): Record<number, number> {
  const [shown, setShown] = useState<Record<number, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.position])),
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const target: Record<number, number> = Object.fromEntries(players.map((p) => [p.id, p.position]));
    if (reduced) {
      setShown(target);
      return;
    }
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setShown((prev) => {
        let done = true;
        const next: Record<number, number> = { ...prev };
        for (const p of players) {
          const cur = next[p.id] ?? p.position;
          if (cur < p.position) {
            next[p.id] = cur + 1;
            done = false;
          } else if (cur > p.position) {
            // חזרה אחורה (כרטיס אחריות) — קופצים, לא הולכים לאחור
            next[p.id] = p.position;
          }
        }
        if (done && timer.current !== null) {
          window.clearInterval(timer.current);
          timer.current = null;
        }
        return next;
      });
    }, STEP_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.map((p) => `${p.id}:${p.position}`).join(','), reduced]);

  return shown;
}

export default function BoardMap({ game, fit }: { game: GameState; fit: boolean }) {
  const mode = useBoardMode();
  const reduced = useReducedMotion();
  const shown = useWalk(game.players, reduced);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pawnRef = useRef<SVGGElement>(null);

  const current = game.players[game.current];
  const route = current.route;
  const lay = layoutRoute(route.length, mode);
  const city = current.res.city;
  const trees = treeSlots(city, route.length);
  const dry = city < 0;

  const shownPos = shown[current.id] ?? current.position;

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

  return (
    <div className={`boardmap ${mode} ${dry ? 'dry' : ''} ${fit ? 'fit' : ''}`} ref={wrapRef}>
      <svg
        viewBox={`0 0 ${lay.width} ${lay.height}`}
        className="boardmap-svg"
        role="img"
        aria-label={`לוח המשחק. ${current.name} במשבצת ${shownPos + 1} מתוך ${route.length}. ${approvedText} מתוך ${totalStations}. גיליון הדרישות, בכפתור שמעל הלוח, מציג את אותו מידע כטקסט.`}
      >
        <defs>
          <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.5" fill="var(--ink)" opacity="0.05" />
          </pattern>
        </defs>

        <Scenery lay={lay} />
        <rect x="0" y="0" width={lay.width} height={lay.height} fill="url(#grain)" pointerEvents="none" />

        {/* המסלול */}
        <path d={lay.d} className="track-shadow" />
        <path d={lay.d} className="track" />

        {/* עצים וצל לפי מדד העיר */}
        {trees.map((idx, i) => {
          const p = lay.points[Math.min(idx, lay.points.length - 1)];
          if (!p) return null;
          const side = i % 2 === 0 ? -1 : 1;
          return <Tree key={`t${i}`} x={p.x + side * 46} y={p.y + 30} />;
        })}

        {/* משבצות */}
        {route.map((sq, i) => {
          const p = lay.points[i];
          if (!p) return null;
          if (sq.type !== 'station') {
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={9}
                className={`sq-card ${i === shownPos ? 'here' : ''}`}
                fill={DECK_COLOR[sq.type] ?? 'var(--line)'}
              />
            );
          }
          const st = stationById(sq.stationId!);
          if (!st) return null;
          const passed = current.resolved.includes(st.id);
          return (
            <Station
              key={i}
              x={p.x}
              y={p.y}
              shape={stationShape(st.id, st.agency)}
              title={st.title}
              category={st.category}
              passed={passed}
              here={i === shownPos}
              mode={mode}
            />
          );
        })}

        {/* כלי המשחק */}
        {game.players.map((p, pi) => {
          const pos = shown[p.id] ?? p.position;
          const pt = lay.points[Math.min(pos, lay.points.length - 1)];
          if (!pt) return null;
          const mates = game.players.filter((q) => (shown[q.id] ?? q.position) === pos);
          const slot = mates.findIndex((q) => q.id === p.id);
          const spread = mates.length > 1 ? (slot - (mates.length - 1) / 2) * 17 : 0;
          const isCurrent = p.id === current.id;
          return (
            <g
              key={p.id}
              ref={isCurrent ? pawnRef : undefined}
              className={`pawn ${isCurrent ? 'current' : ''}`}
              transform={`translate(${pt.x + spread}, ${pt.y - 32})`}
            >
              <ellipse cx="0" cy="15" rx="13" ry="4" className="pawn-shadow" />
              <circle cx="0" cy="0" r="14" fill={PAWN[pi % PAWN.length]} className="pawn-disc" />
              <circle cx="0" cy="-2" r="14" fill={PAWN[pi % PAWN.length]} className="pawn-top" />
              <text x="0" y="2" className="pawn-letter">
                {p.name.trim().charAt(0) || String(pi + 1)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** רקע: קו ים, רצועת חול, גושי רבעים. רמז לעיר חוף, לא מפה. */
function Scenery({ lay }: { lay: ReturnType<typeof layoutRoute> }) {
  const { width, height, mode } = lay;
  const seaW = mode === 'wide' ? width * 0.13 : width * 0.17;
  const blocks =
    mode === 'wide'
      ? [
          { x: 0.33, y: 0.1, w: 0.1, h: 0.07 },
          { x: 0.6, y: 0.24, w: 0.13, h: 0.06 },
          { x: 0.28, y: 0.45, w: 0.12, h: 0.08 },
          { x: 0.66, y: 0.62, w: 0.1, h: 0.07 },
          { x: 0.42, y: 0.8, w: 0.14, h: 0.06 },
        ]
      : [
          { x: 0.55, y: 0.08, w: 0.2, h: 0.04 },
          { x: 0.5, y: 0.3, w: 0.26, h: 0.035 },
          { x: 0.56, y: 0.55, w: 0.2, h: 0.04 },
          { x: 0.5, y: 0.78, w: 0.24, h: 0.035 },
        ];
  return (
    <g aria-hidden="true" className="scenery">
      <rect x="0" y="0" width={width} height={height} className="land" />
      {/* הים בצד ימין: ההתחלה של המסלול */}
      <rect x={width - seaW} y="0" width={seaW} height={height} className="sea" />
      <rect x={width - seaW - 26} y="0" width="26" height={height} className="sand" />
      {Array.from({ length: Math.ceil(height / 90) }, (_, i) => (
        <path
          key={i}
          d={`M ${width - seaW + 8} ${40 + i * 90} q 14 -9 28 0 t 28 0`}
          className="wave"
        />
      ))}
      {blocks.map((b, i) => (
        <rect
          key={i}
          x={b.x * width}
          y={b.y * height}
          width={b.w * width}
          height={b.h * height}
          rx="3"
          className="district"
        />
      ))}
    </g>
  );
}

function Tree({ x, y }: { x: number; y: number }) {
  return (
    <g className="tree" transform={`translate(${x}, ${y})`} aria-hidden="true">
      <rect x="-1.5" y="0" width="3" height="10" className="trunk" />
      <circle cx="0" cy="-4" r="9" className="canopy" />
    </g>
  );
}

interface StationProps {
  x: number;
  y: number;
  shape: StationShape;
  title: string;
  category: string;
  passed: boolean;
  here: boolean;
  mode: BoardMode;
}

function Station({ x, y, shape, title, category, passed, here, mode }: StationProps) {
  return (
    <g className={`station ${passed ? 'passed' : ''} ${here ? 'here' : ''} cat-${category}`} transform={`translate(${x}, ${y})`}>
      <circle cx="0" cy="0" r="24" className="station-base" />
      <g transform="translate(0, -3)">
        <Shape shape={shape} />
      </g>
      {passed && (
        <g className="station-stamp" transform="translate(16, -16) rotate(-8)">
          <circle cx="0" cy="0" r="9" />
          <path d="M -4 0 L -1 3.4 L 4.4 -3" />
        </g>
      )}
      <text
        x="0"
        y={mode === 'wide' ? 44 : 42}
        className="station-label"
        textAnchor="middle"
      >
        {title}
      </text>
    </g>
  );
}

/** צורות גאומטריות בלבד, ממורכזות סביב (0,0) בערך 22×22 */
function Shape({ shape }: { shape: StationShape }) {
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
