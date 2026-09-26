import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** הדרכה בכניסה — DESIGN.md סעיף 9. שלוש שכבות על הלוח, עם "דלג". */
const KEY = 'bakasha-leheter:onboarded';

export const STEPS = [
  { title: 'זו הקובייה', text: 'מטילים ומתקדמים במסלול. התוצאה נשארת על המסך.' },
  { title: 'זו תחנה, כאן עוצרים', text: 'כל תחנה היא שער: עונים, ורק אז ממשיכים. טעות עולה בזמן, לא במשחק.' },
  { title: 'זה מדד העיר', text: 'כל החלטה שמשפרת את הרחוב שותלת עץ על הלוח. הציון בסוף כולל אותו.' },
];

export function seenOnboarding(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // אין אחסון — לא מציקים בכל טעינה
  }
}

function remember(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* אחסון לא זמין — ההדרכה תופיע שוב, וזה בסדר */
  }
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  const finish = () => {
    remember();
    onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // כל עוד ההדרכה פתוחה, שאר המסך לא מקבל פוקוס ולא נקרא בקורא מסך
  useEffect(() => {
    const app = document.querySelector('.app');
    app?.setAttribute('inert', '');
    return () => app?.removeAttribute('inert');
  }, []);

  // מחוץ ל-.app, אחרת ה-inert היה חל גם על ההדרכה עצמה
  return createPortal(
    <div className="onboard" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div className="onboard-card">
        <span className="eyebrow">
          {step + 1} מתוך {STEPS.length}
        </span>
        <h3 id="onboard-title">{STEPS[step].title}</h3>
        <p>{STEPS[step].text}</p>
        <div className="row">
          <button className="btn primary" autoFocus onClick={() => (last ? finish() : setStep(step + 1))}>
            {last ? 'מתחילים' : 'הבא'}
          </button>
          <button className="btn ghost" onClick={finish}>
            דלג
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
