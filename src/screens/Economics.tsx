import { useState } from 'react';
import { economicsFor } from '../content';
import { SourceLine } from '../components/common';

/**
 * "מה זה עולה באמת" — תוסף מידע אופציונלי לתחנה.
 * נפתח במקום, בלי מודאל חוסם, ואינו משפיע על המשחק.
 */
export default function Economics({ stationId }: { stationId: string }) {
  const facts = economicsFor(stationId);
  const [open, setOpen] = useState(false);
  if (facts.length === 0) return null;

  return (
    <div className="econ">
      <button className="btn ghost econ-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? 'סגירת המידע הכלכלי' : 'מה זה עולה באמת?'}
      </button>
      {open && (
        <div className="econ-body">
          {facts.map((f) => (
            <div className="econ-item" key={f.id}>
              <h4>{f.title}</h4>
              <p>{f.body}</p>
              <SourceLine meta={f.meta} />
            </div>
          ))}
          <p className="econ-foot">המספרים כאן אינם חלק מהניקוד. הם נועדו לתת סדר גודל לפני פגישה עם עורך בקשה.</p>
        </div>
      )}
    </div>
  );
}
