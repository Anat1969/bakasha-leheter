/**
 * ערבוב דטרמיניסטי לסדר התשובות — שכבת תצוגה בלבד.
 * בקובצי התוכן התשובה הנכונה היא כמעט תמיד הראשונה, ובלי ערבוב אפשר
 * לנצח בלי לקרוא. הערבוב נגזר ממזהה התחנה ומ-rng של המשחק, ולכן הוא
 * דטרמיניסטי, ניתן לשחזור בבדיקות, ואינו נוגע במנוע.
 */

/** hash יציב למחרוזת (FNV-1a) */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function xorshift(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Fisher-Yates עם מחולל זרעי. מחזיר מערך חדש, לא משנה את המקור. */
export function seededOrder<T>(items: readonly T[], key: string, seed: number): T[] {
  const out = [...items];
  const rnd = xorshift((hashString(key) ^ (seed >>> 0)) >>> 0);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
