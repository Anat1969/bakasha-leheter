import type { JournalEntry } from '../engine/types';
import { pathBetween, smoothPath, layoutRoute } from './boardLayout';
import { timelineModel } from './timelineModel';

const e = (kind: JournalEntry['kind'], ref: string, from: number, to: number, at = 0): JournalEntry => ({
  kind,
  ref,
  at,
  from,
  to,
  delta: to - from ? { months: to - from } : {},
});

describe('ציר הזמן', () => {
  it('יומן ריק נותן ציר של שנה לפחות', () => {
    const m = timelineModel([], 6, 0);
    expect(m.maxMonth).toBe(12);
    expect(m.bars).toEqual([]);
    expect(m.links).toEqual([]);
  });

  it('תחנות בשורה אחת, כרטיסים בשורה אחרת, ורצף בין התחנות', () => {
    const m = timelineModel([e('pass', 'a', 0, 2), e('card', 'c1', 2, 3), e('reject', 'b', 3, 4), e('pass', 'b', 4, 6)], 6, 6);
    expect(m.bars.map((b) => b.lane)).toEqual(['station', 'card', 'station', 'station']);
    const seq = m.links.filter((l) => l.kind === 'sequence');
    expect(seq).toHaveLength(2);
    // אחרי החזרה לתיקון הקשר מסומן, כי העבודה חוזרת על עצמה
    expect(seq.map((l) => l.ok)).toEqual([true, false]);
    // שורה לכל תחנה: התיקון והאישור של b באותה שורה
    expect(m.rows.map((r) => [r.ref, r.bars.map((b) => b.kind)])).toEqual([
      ['a', ['pass']],
      ['b', ['reject', 'pass']],
    ]);
  });

  it('נסח טאבו פותח חלון תוקף, וההגשה בתוכו מסומנת כתקינה', () => {
    const m = timelineModel([e('pass', 'survey-tabu', 0, 2), e('pass', 'submission', 2, 5)], 6, 5);
    expect(m.windows).toEqual([{ start: 2, end: 8 }]);
    const v = m.links.find((l) => l.kind === 'validity')!;
    expect(v.ok).toBe(true);
    expect(v.from.month).toBe(2);
    expect(v.to.month).toBe(5);
  });

  it('נסח שפג: הקשר מסומן כשבור, ונפתח חלון חדש', () => {
    const m = timelineModel(
      [e('pass', 'survey-tabu', 0, 1), e('pass', 'submission', 1, 9), e('tabuRenewed', 'submission', 9, 10)],
      6,
      10,
    );
    expect(m.windows).toEqual([
      { start: 1, end: 7 },
      { start: 10, end: 16 },
    ]);
    expect(m.links.find((l) => l.kind === 'validity')!.ok).toBe(false);
    expect(m.maxMonth).toBeGreaterThanOrEqual(16);
    expect(m.maxMonth % 3).toBe(0);
  });
});

describe('הקו המדויו על הלוח', () => {
  const pts = layoutRoute(12, 'wide').points;

  it('הקטע המלא זהה למסלול המלא', () => {
    expect(pathBetween(pts, 0, pts.length - 1)).toBe(smoothPath(pts));
  });

  it('קטע אחד מתחיל בנקודה הנכונה ומכיל עקומה אחת', () => {
    const d = pathBetween(pts, 3, 4);
    expect(d.startsWith(`M ${Math.round(pts[3].x * 10) / 10} `)).toBe(true);
    expect(d.match(/ C /g)).toHaveLength(1);
  });

  it('גבולות מחוץ לטווח לא שוברים את הנתיב', () => {
    expect(pathBetween(pts, -2, 99)).toBe(smoothPath(pts));
    expect(pathBetween([], 0, 3)).toBe('');
    expect(pathBetween(pts, 5, 2)).not.toContain(" C ");
  });
});
