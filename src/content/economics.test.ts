import { content, validateContent } from './index';
import { economics, economicsFor } from './economics';

describe('שכבת המידע הכלכלי', () => {
  it('התוכן עובר בדיקת שלמות', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('כל פריט מצורף לתחנה קיימת', () => {
    for (const e of economics) {
      expect(content.stations.some((s) => s.id === e.stationId), `${e.id} -> ${e.stationId}`).toBe(true);
    }
  });

  it('כל פריט "לפי מקור" מציין מקור, וכל "חוק משחק" מסביר למה', () => {
    for (const e of economics) {
      if (e.meta.status === 'source') expect(e.meta.source || e.meta.sourceUrl, e.id).toBeTruthy();
      else expect(e.meta.note, e.id).toBeTruthy();
    }
  });

  it('economicsFor מחזיר רק את הפריטים של אותה תחנה', () => {
    expect(economicsFor('fees').map((e) => e.id)).toEqual(['econ-fee', 'econ-betterment']);
    expect(economicsFor('architect').map((e) => e.id)).toEqual(['econ-sqm']);
    expect(economicsFor('permit')).toEqual([]);
  });

  it('השכבה אינה חלק מהתוכן שהמנוע מקבל', () => {
    expect('economics' in content).toBe(false);
  });
});
