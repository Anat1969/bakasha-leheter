import { useState } from 'react';
import { content } from '../content';
import type { TrackId } from '../engine/types';

interface Props {
  onStart: (track: TrackId, names: string[]) => void;
  onCancel: () => void;
}

/** צבעי הדיסקיות, בסדר השחקנים — תואם לכלים על הלוח */
const DISC = ['var(--stamp)', 'var(--brick)', 'var(--leaf)', 'var(--gold)'];

export default function Setup({ onStart, onCancel }: Props) {
  const [track, setTrack] = useState<TrackId>('extension');
  const [count, setCount] = useState(1);
  const [names, setNames] = useState<string[]>(['', '', '', '']);

  return (
    <section className="stack-lg">
      <div className="stack">
        <span className="eyebrow">שלב 1 מתוך 2 · פתיחת תיק</span>
        <h2>מה בונים?</h2>
      </div>

      {/* כרטיסי תיק עם לשונית */}
      <div className="tabs" role="radiogroup" aria-label="סוג הבקשה">
        {content.tracks.map((t) => (
          <button
            key={t.id}
            className="filecard"
            role="radio"
            aria-checked={track === t.id}
            onClick={() => setTrack(t.id)}
          >
            <span className="tab">{t.title}</span>
            <span className="filecard-body">{t.summary}</span>
          </button>
        ))}
      </div>

      <div className="sheet flat stack">
        <h3>מי משחק?</h3>
        <div className="discs" role="radiogroup" aria-label="מספר שחקנים">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className="disc-pick"
              role="radio"
              aria-checked={count === n}
              onClick={() => setCount(n)}
            >
              <span className="disc-row" aria-hidden="true">
                {Array.from({ length: n }, (_, i) => (
                  <span key={i} className="disc" style={{ background: DISC[i] }} />
                ))}
              </span>
              <span className="disc-label">{n === 1 ? 'לבד' : `${n} שחקנים`}</span>
            </button>
          ))}
        </div>

        <div className="stack">
          {Array.from({ length: count }, (_, i) => (
            <div className="field named" key={i}>
              <span className="disc" style={{ background: DISC[i] }} aria-hidden="true" />
              <label htmlFor={`name-${i}`}>{count > 1 ? `שם שחקן ${i + 1}` : 'שם השחקן'}</label>
              <input
                id={`name-${i}`}
                value={names[i]}
                placeholder={`שחקן ${i + 1}`}
                onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
              />
            </div>
          ))}
        </div>
        {count > 1 && <p className="lead">כל שחקן מקבל מגרש משלו. משחקים בתורות על אותו מכשיר.</p>}
      </div>

      <div className="row">
        <button className="btn primary" onClick={() => onStart(track, names.slice(0, count))}>
          פתיחת תיק ושליפת מגרש
        </button>
        <button className="btn ghost" onClick={onCancel}>
          חזרה
        </button>
      </div>
    </section>
  );
}
