/**
 * משכי רגעי המשחק, לפי docs/DESIGN.md סעיף 5.
 * זהו מקור האמת: אותם מספרים מוגדרים כמשתני CSS (--t-*) ב-styles.css,
 * ובדיקה ב-motion.test.ts מוודאת שהאפיון, הקוד וה-CSS לא סוטים זה מזה.
 */
export const MOTION = {
  die: 600, // הטלת קובייה
  step: 180, // תנועת כלי, לכל משבצת
  gate: 300, // עצירה בשער: התחנה נפתחת כחלון
  approve: 350, // חותמת "אושר"
  reject: 300, // חותמת "הוחזר לתיקון"
  card: 450, // שליפת כרטיס והיפוכו
  responsibility: 600, // כרטיס אחריות במסלול מורשה
  permit: 900, // תעודת ההיתר נפרשת
  reduced: 150, // prefers-reduced-motion: הכל הופך ל-fade קצר
} as const;

export type Moment = keyof typeof MOTION;

/** שם משתנה ה-CSS המתאים לכל רגע */
export const cssVar = (m: Moment) => `--t-${m}`;
