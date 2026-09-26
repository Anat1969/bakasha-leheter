import css from '../styles.css?raw';
import design from '../../docs/DESIGN.md?raw';
import { MOTION, cssVar, type Moment } from './motion';

/** קורא ערך של משתנה CSS מתוך :root */
function cssMs(name: string): number | null {
  const m = css.match(new RegExp(`${name}:\\s*(\\d+)ms`));
  return m ? Number(m[1]) : null;
}

/** קורא את עמודת המשך מטבלת רגעי המשחק ב-DESIGN.md */
function designMs(rowLabel: string): number | null {
  const row = design.split('\n').find((l) => l.startsWith('|') && l.includes(rowLabel));
  const m = row?.match(/(\d+)ms/);
  return m ? Number(m[1]) : null;
}

describe('רגעי המשחק', () => {
  it('לכל רגע יש משתנה CSS תואם', () => {
    for (const key of Object.keys(MOTION) as Moment[]) {
      expect(cssMs(cssVar(key)), `חסר ${cssVar(key)} ב-styles.css`).toBe(MOTION[key]);
    }
  });

  // הטבלה ב-DESIGN.md היא האפיון. הקוד לא אמור לסטות ממנה בלי לעדכן אותה.
  const fromSpec: [Moment, string][] = [
    ['die', 'הטלת קובייה'],
    ['gate', 'עצירה בשער'],
    ['approve', 'תשובה נכונה'],
    ['reject', 'טעות'],
    ['card', 'כרטיס |'],
    ['responsibility', 'כרטיס אחריות'],
    ['permit', 'היתר |'],
  ];

  it.each(fromSpec)('%s תואם לטבלה ב-DESIGN.md', (key, label) => {
    expect(designMs(label), `לא נמצאה שורה "${label}" בטבלה`).toBe(MOTION[key]);
  });

  it('תנועת הכלי היא 180ms לצעד, כפי שכתוב באפיון', () => {
    expect(MOTION.step).toBe(180);
    expect(design).toContain('180ms לכל צעד');
  });
});

describe('prefers-reduced-motion', () => {
  const block = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

  it('קיים טיפול ייעודי, ולא ביטול גורף של אנימציות', () => {
    expect(block).toContain('var(--t-reduced)');
    expect(css).not.toContain('* { transition: none !important; animation: none !important; }');
  });

  it('הקובייה מציגה את התוצאה מיד, בלי גלגול', () => {
    expect(block).toMatch(/\.die\.rolling\s*{\s*animation:\s*none/);
  });

  it('הפחתת התנועה מכסה את כל הרגעים המונפשים', () => {
    for (const cls of ['.stamp.animate', '.card-face.draw', '.certificate', '.gate-open']) {
      expect(block, `${cls} לא מכוסה`).toContain(cls);
    }
  });
});

describe('כל אנימציה משתמשת בטוקן ולא במספר קשיח', () => {
  it('אין משכי אנימציה קשיחים בשניות בהגדרות האנימציה', () => {
    const hard = css.match(/animation:[^;]*?\b\d+(\.\d+)?s\b/g) ?? [];
    expect(hard).toEqual([]);
  });
});
