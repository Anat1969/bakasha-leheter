import css from '../styles.css?raw';

/**
 * ניגודיות AA לתוויות — DESIGN.md סעיף 10.
 * נמצא בבדיקה אוטומטית שהתווית "רוצים" לא עמדה ב-4.5, ולכן הבדיקה הזו נשארת
 * כדי שטוקן שיתעדכן בעתיד לא יפיל אותה בשקט.
 */
function tokens(blockStart: string): Record<string, string> {
  const i = css.indexOf(blockStart);
  const block = css.slice(i, css.indexOf('}', i));
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) out[m[1]] = m[2];
  return out;
}

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function ratio(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** זוגות טקסט-על-רקע שמופיעים ב-styles.css בתוויות ובשבבים */
const PAIRS: [string, string, string][] = [
  ['חובה', '--stamp', '--stamp-soft'],
  ['צריך', '--approve', '--approve-soft'],
  ['רוצים', '--warn', '--warn-soft'],
  ['לפי מקור', '--approve', '--approve-soft'],
  ['חוק משחק', '--muted', '--surface-2'],
  ['טקסט גוף', '--ink', '--surface'],
  ['טקסט משני', '--muted', '--surface'],
];

describe.each([
  ['בהיר', ':root {'],
  ['כהה', ":root[data-theme='dark'] {"],
])('ניגודיות AA — ערכה %s', (_name, block) => {
  const t = { ...tokens(':root {'), ...tokens(block) };

  it.each(PAIRS)('%s עומד ב-4.5', (_label, fg, bg) => {
    expect(t[fg], `חסר ${fg}`).toBeTruthy();
    expect(t[bg], `חסר ${bg}`).toBeTruthy();
    expect(Number(ratio(t[fg], t[bg]).toFixed(2))).toBeGreaterThanOrEqual(4.5);
  });
});
