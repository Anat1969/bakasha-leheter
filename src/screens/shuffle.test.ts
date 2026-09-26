import { content } from '../content';
import { seededOrder } from './shuffle';

const ids = (arr: { id: string }[]) => arr.map((o) => o.id).join(',');
const station = (id: string) => content.stations.find((s) => s.id === id)!;

describe('ערבוב סדר התשובות', () => {
  it('אותו seed ואותה תחנה — תמיד אותו סדר', () => {
    const st = station('zoning-check');
    const a = ids(seededOrder(st.options, st.id, 12345));
    for (let i = 0; i < 20; i++) expect(ids(seededOrder(st.options, st.id, 12345))).toBe(a);
  });

  it('תחנות שונות באותו seed מקבלות סדר שונה', () => {
    const seed = 777;
    const orders = content.stations
      .filter((s) => s.options.length >= 4)
      .map((s) => ids(seededOrder(s.options, s.id, seed)));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('seed שונה מזיז את הסדר באותה תחנה', () => {
    const st = station('zoning-check');
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) seen.add(ids(seededOrder(st.options, st.id, seed)));
    expect(seen.size).toBeGreaterThan(1);
  });

  it('הערבוב הוא תמורה: אותם פריטים בדיוק, בלי כפילות ובלי אובדן', () => {
    for (const st of content.stations) {
      for (const seed of [0, 1, 99, 2 ** 31]) {
        const out = seededOrder(st.options, st.id, seed);
        expect(out).toHaveLength(st.options.length);
        expect(out.map((o) => o.id).sort()).toEqual(st.options.map((o) => o.id).sort());
      }
    }
  });

  it('לא משנה את המערך המקורי', () => {
    const st = station('zoning-check');
    const before = ids(st.options);
    seededOrder(st.options, st.id, 5);
    expect(ids(st.options)).toBe(before);
  });

  it('התשובה הנכונה לא נשארת תמיד ראשונה', () => {
    // בתוכן היא כמעט תמיד options[0]; אחרי ערבוב היא אמורה לנדוד
    const withCorrect = content.stations.filter((s) => s.options.some((o) => o.correct));
    let firstCount = 0;
    for (const st of withCorrect) {
      const out = seededOrder(st.options, st.id, 42);
      if (out[0].correct) firstCount++;
    }
    expect(firstCount).toBeLessThan(withCorrect.length * 0.6);
  });
});
