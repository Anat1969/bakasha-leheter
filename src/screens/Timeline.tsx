import { useEffect, useRef } from 'react';
import { cardById, stationById } from '../content';
import { TABU_VALID_MONTHS } from '../engine/game';
import type { Player } from '../engine/types';
import { CATEGORY_LABEL, DECK_LABEL } from '../components/common';
import type { BoardMode } from './boardLayout';
import { timelineModel, type TLBar } from './timelineModel';

const KIND_LABEL: Record<TLBar['kind'], string> = {
  pass: 'אושר',
  reject: 'הוחזר לתיקון',
  shielded: 'כרטיס ידע ביטל קנס',
  card: 'כרטיס',
  tabuRenewed: 'נסח טאבו חודש',
};

interface Props {
  player: Player;
  mode: BoardMode;
  /** משבצת מסומנת — מקשרת בין ציר הזמן, היומן והלוח */
  focus: number | null;
  onFocus: (at: number | null) => void;
  /** מספר התחנה במסלול, לפי מזהה */
  stationNo: Record<string, number>;
  /** בזמן הטלה: מציגים רק את מה שכבר נחשף */
  upTo?: number | null;
}

/**
 * ציר הזמן כגאנט של פרויקט: שורה לכל תחנה, פסים לפי חודשים, קשרי רצף
 * בין תחנות, וחלון התוקף של נסח הטאבו — התלות שמכתיבה את הקצב.
 * הזמן זורם מימין לשמאל, כמו המסלול בלוח.
 */
export default function Timeline({ player, mode, focus, onFocus, stationNo, upTo = null }: Props) {
  const all = player.journal ?? [];
  const journal = upTo === null ? all : all.slice(0, upTo);
  const now = journal.length ? journal[journal.length - 1].to : player.res.months;
  const m = timelineModel(journal, TABU_VALID_MONTHS, upTo === null ? player.res.months : now);
  const boxRef = useRef<HTMLDivElement>(null);

  const W = mode === 'wide' ? 760 : 400;
  const padR = mode === 'wide' ? 46 : 38;
  const padL = 14;
  const top = 30;
  const rowH = mode === 'wide' ? 17 : 19;
  const barH = mode === 'wide' ? 9 : 11;
  const rowsH = Math.max(m.rows.length, 1) * rowH;
  const cardY = top + rowsH + 14;
  const H = cardY + 26;
  const sx = (W - padR - padL) / m.maxMonth;
  const x = (month: number) => W - padR - month * sx;
  const rowY = (ref: string) => top + m.rows.findIndex((r) => r.ref === ref) * rowH + rowH / 2;

  // השורה האחרונה תמיד בתמונה
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [journal.length]);

  const ticks = Array.from({ length: m.maxMonth + 1 }, (_, i) => i);
  const seq = m.rows.slice(1).map((r, i) => ({ a: m.rows[i], b: r }));

  return (
    <figure className="timeline">
      <figcaption className="tl-head">
        <span className="tl-title">ציר הזמן</span>
        <span className="tl-legend" aria-hidden="true">
          <span className="lg pass">אושר</span>
          <span className="lg reject">תיקון</span>
          <span className="lg window">תוקף נסח טאבו</span>
          <span className="lg card">כרטיס</span>
        </span>
        <span className="tl-now">חודש {player.res.months}</span>
      </figcaption>
      <div className="tl-scroll" ref={boxRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="tl-svg"
          role="img"
          aria-label={`ציר הזמן של ${player.name}: ${m.rows.length} תחנות בתהליך, ${player.res.months} חודשים עד עכשיו. היומן שליד הלוח מציג את אותם אירועים כטקסט.`}
        >
          <defs>
            <pattern id="tl-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="tl-hatch-bg" />
              <line x1="0" y1="0" x2="0" y2="5" className="tl-hatch-line" />
            </pattern>
            <marker id="tl-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 6 3 L 0 6 Z" className="tl-arrowhead" />
            </marker>
          </defs>

          {/* רשת החודשים */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={top - 6} y2={cardY + 18} className={`tl-grid ${t % 3 === 0 ? 'major' : ''}`} />
              {t % 3 === 0 && (
                <text x={x(t)} y={top - 12} className="tl-tick">
                  {t}
                </text>
              )}
            </g>
          ))}

          {/* חלון התוקף של נסח הטאבו */}
          {m.windows.map((w, i) => (
            <g key={`w${i}`} className="tl-window">
              <rect x={x(w.end)} y={top - 4} width={x(w.start) - x(w.end)} height={rowsH + 8} />
              <path d={`M ${x(w.start)} ${top - 4} v -5 H ${x(w.end)} v 5`} className="tl-bracket" />
            </g>
          ))}

          {/* קשרי רצף: סוף תחנה אחת → תחילת הבאה */}
          {seq.map(({ a, b }, i) => {
            const end = a.bars[a.bars.length - 1];
            const start = b.bars[0];
            const x1 = x(end.to);
            const x2 = x(start.from);
            const y1 = rowY(a.ref);
            const y2 = rowY(b.ref);
            return (
              <path
                key={`s${i}`}
                d={`M ${x1} ${y1} H ${Math.min(x1, x2) - 3} V ${y2 - barH / 2 - 1}`}
                className={`tl-link ${end.kind === 'reject' ? 'broken' : ''}`}
                markerEnd="url(#tl-arrow)"
              />
            );
          })}

          {/* תלות תוקף: הטאבו → ההגשה וההיתר */}
          {m.links
            .filter((l) => l.kind === 'validity')
            .map((l, i) => {
              const row = m.rows.find((r) => r.bars.some((b) => b.kind === 'pass' && b.to === l.to.month && (b.ref === 'submission' || b.ref === 'permit')));
              const tabuRow = m.rows.find((r) => r.ref === 'survey-tabu');
              if (!row || !tabuRow) return null;
              const x1 = x(l.from.month);
              const x2 = x(l.to.month);
              const y1 = rowY(tabuRow.ref);
              const y2 = rowY(row.ref);
              return (
                <path
                  key={`v${i}`}
                  d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2 - barH / 2 - 1}`}
                  className={`tl-dep ${l.ok ? 'ok' : 'late'}`}
                  markerEnd="url(#tl-arrow)"
                >
                  <title>{l.ok ? 'נסח הטאבו היה בתוקף בבדיקה' : 'הנסח פג לפני הבדיקה והופק מחדש'}</title>
                </path>
              );
            })}

          {/* שורות התחנות */}
          {m.rows.map((r) => {
            const st = stationById(r.ref);
            const y = rowY(r.ref);
            const hot = r.bars.some((b) => b.at === focus);
            return (
              <g
                key={r.ref}
                className={`tl-row ${hot ? 'hot' : ''} cat-${st?.category ?? 'process'}`}
                onMouseEnter={() => onFocus(r.bars[0].at)}
                onMouseLeave={() => onFocus(null)}
              >
                <rect x={0} y={y - rowH / 2} width={W} height={rowH} className="tl-row-bg" />
                <text x={W - 8} y={y} className="tl-rowno">
                  {String(stationNo[r.ref] ?? 0).padStart(2, '0')}
                </text>
                {r.bars.map((b) => {
                  const w = Math.max(x(b.from) - x(b.to), 0);
                  const tip = `${st?.title ?? ''} · ${KIND_LABEL[b.kind]} · חודש ${b.from}${b.to !== b.from ? `–${b.to}` : ''}${st ? ` · ${CATEGORY_LABEL[st.category]}` : ''}`;
                  if (w < 2) {
                    return (
                      <path key={b.idx} d={`M ${x(b.to)} ${y - 5} l 5 5 l -5 5 l -5 -5 Z`} className={`tl-mile ${b.kind}`}>
                        <title>{tip}</title>
                      </path>
                    );
                  }
                  return (
                    <rect key={b.idx} x={x(b.to)} y={y - barH / 2} width={w} height={barH} rx="2" className={`tl-bar ${b.kind}`}>
                      <title>{tip}</title>
                    </rect>
                  );
                })}
              </g>
            );
          })}

          {/* שורת הכרטיסים */}
          <line x1={padL} x2={W - padR} y1={cardY} y2={cardY} className="tl-cardline" />
          <text x={W - 8} y={cardY} className="tl-rowno">כרט׳</text>
          {m.bars
            .filter((b) => b.lane === 'card')
            .map((b) => {
              const card = cardById(b.ref);
              const dm = b.to - b.from;
              const tip = `${card?.title ?? ''} · ${card ? DECK_LABEL[card.deck] : ''} · ${dm > 0 ? `+${dm}` : dm < 0 ? `${dm}` : 'בלי שינוי'} חודשים`;
              return (
                <g
                  key={b.idx}
                  className={`tl-card deck-${card?.deck ?? 'event'} ${b.at === focus ? 'hot' : ''}`}
                  onMouseEnter={() => onFocus(b.at)}
                  onMouseLeave={() => onFocus(null)}
                >
                  {dm !== 0 && <rect x={x(Math.max(b.from, b.to))} y={cardY - 3} width={Math.abs(dm) * sx} height={6} rx="3" className="tl-card-span" />}
                  <rect x={x(b.from) - 4} y={cardY - 7} width={8} height={12} rx="1.5" className="tl-card-chip" />
                  <title>{tip}</title>
                </g>
              );
            })}

          {/* עכשיו */}
          <g className="tl-today">
            <line x1={x(m.now)} x2={x(m.now)} y1={top - 8} y2={cardY + 14} />
            <circle cx={x(m.now)} cy={top - 8} r="3" />
          </g>
        </svg>
      </div>
      {m.rows.length === 0 && <p className="tl-empty">הציר יתמלא עם התחנה הראשונה שתאושר.</p>}
    </figure>
  );
}
