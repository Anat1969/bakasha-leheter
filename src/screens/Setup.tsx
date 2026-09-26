import { useState } from 'react';
import { content } from '../content';
import type { TrackId } from '../engine/types';

interface Props {
  onStart: (track: TrackId, names: string[]) => void;
  onCancel: () => void;
}

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

      <div className="choices" role="group" aria-label="סוג הבקשה">
        {content.tracks.map((t) => (
          <button key={t.id} className="choice" aria-pressed={track === t.id} onClick={() => setTrack(t.id)}>
            <h3>{t.title}</h3>
            <span>{t.summary}</span>
          </button>
        ))}
      </div>

      <div className="sheet flat stack">
        <h3>מי משחק?</h3>
        <div className="row" role="group" aria-label="מספר שחקנים">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className="btn" aria-pressed={count === n} onClick={() => setCount(n)}
              style={count === n ? { borderColor: 'var(--stamp)', color: 'var(--stamp)' } : undefined}>
              {n === 1 ? 'לבד' : `${n} שחקנים`}
            </button>
          ))}
        </div>
        <div className="stack">
          {Array.from({ length: count }, (_, i) => (
            <div className="field" key={i}>
              <label htmlFor={`name-${i}`}>שם {count > 1 ? `שחקן ${i + 1}` : 'השחקן'}</label>
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
