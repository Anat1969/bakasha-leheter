import { content, validateContent } from './index';

describe('תוכן המשחק', () => {
  it('עובר בדיקת שלמות', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('לכל פריט יש סטטוס אימות', () => {
    const all = [...content.stations, ...content.cards, ...content.plots, ...content.paths, ...content.glossary];
    for (const item of all) expect(['verified', 'pending', 'illustrative']).toContain(item.meta.status);
  });

  it('לכל מסלול יש לפחות שני מגרשים', () => {
    for (const t of content.tracks) {
      expect(content.plots.filter((p) => p.track === t.id).length).toBeGreaterThanOrEqual(2);
    }
  });
});
