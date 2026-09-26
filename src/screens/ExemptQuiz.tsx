import { useState } from 'react';
import { content } from '../content';
import type { ExemptAnswer } from '../engine/types';
import { SourceLine } from '../components/common';

const ANSWERS: { id: ExemptAnswer; label: string; hint: string }[] = [
  { id: 'exempt', label: 'פטור מהיתר', hint: 'אפשר לבצע בלי היתר ובלי דיווח' },
  { id: 'exemptReport', label: 'פטור, עם דיווח', hint: 'בלי היתר, אבל חובה לדווח לוועדה' },
  { id: 'permit', label: 'צריך היתר', hint: 'מחוץ לתנאי הפטור' },
];

export default function ExemptQuiz({ onBack }: { onBack: () => void }) {
  const items = content.exemptions;
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<ExemptAnswer | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= items.length;

  if (done) {
    return (
      <section className="stack-lg">
        <span className="stamp big animate" style={{ justifySelf: 'start' }}>
          {score}/{items.length}
        </span>
        <h2>סיימתם את הבדיקה המהירה</h2>
        <p className="lead">
          גם עבודה פטורה מהיתר חייבת לעמוד בתקנות, בתוכנית ובהנחיות המרחביות. בבניין לשימור וברצועת החוף אין פטור.
          כשלא בטוחים, בודקים באתר הוועדה או שואלים את מחלקת הרישוי.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => { setI(0); setScore(0); setPicked(null); }}>שוב מההתחלה</button>
          <button className="btn" onClick={onBack}>חזרה</button>
        </div>
      </section>
    );
  }

  const item = items[i];
  const right = picked === item.answer;
  return (
    <section className="stack-lg">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="stack">
          <span className="eyebrow">בדיקה מהירה · {i + 1} מתוך {items.length}</span>
          <h2>צריך היתר?</h2>
        </div>
        <button className="btn" onClick={onBack}>חזרה</button>
      </div>

      <div className="sheet stack">
        <p style={{ fontSize: '1.2rem' }}>{item.work}</p>
        <div className="options">
          {ANSWERS.map((a) => (
            <button
              key={a.id}
              className="option"
              disabled={picked !== null}
              aria-pressed={picked === a.id}
              style={
                picked !== null && a.id === item.answer
                  ? { borderColor: 'var(--approve)', boxShadow: 'inset 0 0 0 1px var(--approve)' }
                  : picked === a.id
                    ? { borderColor: 'var(--danger)' }
                    : undefined
              }
              onClick={() => {
                setPicked(a.id);
                if (a.id === item.answer) setScore((s) => s + 1);
              }}
            >
              <strong>{a.label}</strong>
              <span className="sub" style={{ display: 'block', color: 'var(--muted)', fontSize: '0.9rem' }}>{a.hint}</span>
            </button>
          ))}
        </div>

        {picked !== null && (
          <>
            <span className={right ? 'result-ok' : 'result-no'}>
              {right ? 'נכון.' : `לא בדיוק. התשובה: ${ANSWERS.find((a) => a.id === item.answer)!.label}.`}
            </span>
            <div className="why">
              <span className="eyebrow">למה?</span>
              <p>{item.explanation}</p>
            </div>
            <SourceLine meta={item.meta} />
            <div className="row">
              <button className="btn primary" autoFocus onClick={() => { setI(i + 1); setPicked(null); }}>
                {i + 1 < items.length ? 'לשאלה הבאה' : 'לתוצאה'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
