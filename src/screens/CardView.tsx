import type { Card } from '../engine/types';
import { DECK_LABEL, EffectList } from '../components/common';

/**
 * כרטיס שנשלף מהחפיסה: גב עם דוגמה של החפיסה, ואז היפוך לפנים.
 * הגב והפנים הם שני צדדים של אותו אובייקט בתלת-ממד — DESIGN.md סעיף 3.
 */
export default function CardView({ card }: { card: Card }) {
  const hand = card.deck === 'cityArchitect';
  return (
    <div className={`card3d deck-${card.deck}`}>
      <div className="card3d-inner">
        <div className="card-back" aria-hidden="true">
          <span className="card-back-frame">
            <span className="card-back-title">{DECK_LABEL[card.deck]}</span>
          </span>
        </div>
        <div className="card-front">
          <span className="perf" aria-hidden="true" />
          <div className="card-head">
            <span className="deck-name">{DECK_LABEL[card.deck]}</span>
            <span className="card-no">{card.id.toUpperCase()}</span>
          </div>
          <h2 className={hand ? 'hand-title' : ''}>{card.title}</h2>
          <p className={hand ? 'hand-note' : ''}>{card.text}</p>
          <EffectList effects={card.effects} />
        </div>
      </div>
    </div>
  );
}
