import { content, validateContent } from './index';

describe('תוכן המשחק', () => {
  it('עובר בדיקת שלמות', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('לכל פריט יש תווית תקינה', () => {
    const all = [...content.stations, ...content.cards, ...content.plots, ...content.paths, ...content.glossary, ...content.exemptions];
    for (const item of all) expect(['source', 'rule']).toContain(item.meta.status);
  });

  it('פריט "לפי מקור" מציין מקור', () => {
    const all = [...content.stations, ...content.cards, ...content.paths, ...content.glossary, ...content.exemptions];
    for (const item of all) {
      if (item.meta.status === 'source') expect(item.meta.source || item.meta.sourceUrl).toBeTruthy();
    }
  });

  it('לכל מסלול יש לפחות שני מגרשים', () => {
    for (const t of content.tracks) {
      expect(content.plots.filter((p) => p.track === t.id).length).toBeGreaterThanOrEqual(2);
    }
  });
});
