import { content } from '../content';
import { buildRoute } from '../engine/game';
import { DECK_COLOR, layoutRoute, smoothPath, stationIndexes, stationShape, treeSlots } from './boardLayout';

const plot = (id: string) => content.plots.find((p) => p.id === id)!;

describe('גאומטריית הלוח', () => {
  it('נקודה לכל משבצת, בשני המצבים', () => {
    for (const mode of ['wide', 'tall'] as const) {
      for (const n of [1, 13, 37]) {
        expect(layoutRoute(n, mode).points).toHaveLength(n);
      }
    }
  });

  it('בטלפון המסלול יורד מלמעלה למטה', () => {
    const { points } = layoutRoute(20, 'tall');
    for (let i = 1; i < points.length; i++) expect(points[i].y).toBeGreaterThan(points[i - 1].y);
  });

  it('במחשב השורה הראשונה מתקדמת מימין לשמאל', () => {
    const { points } = layoutRoute(10, 'wide');
    expect(points[1].x).toBeLessThan(points[0].x);
    expect(points[0].y).toBe(points[1].y);
  });

  it('כל הנקודות בתוך גבולות הלוח', () => {
    for (const mode of ['wide', 'tall'] as const) {
      const lay = layoutRoute(37, mode);
      for (const p of lay.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(lay.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(lay.height);
      }
    }
  });

  it('נתיב ה-SVG מתחיל ב-M ואינו מכיל NaN', () => {
    const d = layoutRoute(15, 'wide').d;
    expect(d.startsWith('M ')).toBe(true);
    expect(d).not.toContain('NaN');
  });

  it('smoothPath עומד במקרי קצה', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 1, y: 2 }])).toBe('M 1 2');
  });
});

describe('סימני הלוח', () => {
  it('לכל תחנה במשחק יש צורה', () => {
    for (const st of content.stations) {
      expect(stationShape(st.id, st.agency)).toBeTruthy();
    }
  });

  it('גורמים שונים מקבלים צורות שונות', () => {
    expect(stationShape('agency-water', 'תאגיד המים יובלים')).toBe('watertower');
    expect(stationShape('design-plan', 'אדריכלית העיר')).toBe('drafting');
    expect(stationShape('committee')).toBe('columns');
    expect(stationShape('permit')).toBe('seal');
    expect(stationShape('zoning-check')).toBe('office');
  });

  it('לכל חפיסה יש צבע משבצת', () => {
    for (const deck of ['event', 'knowledge', 'neighborhood', 'responsibility', 'cityArchitect']) {
      expect(DECK_COLOR[deck]).toBeTruthy();
    }
  });
});

describe('מדד העיר על הלוח', () => {
  it('מדד אפס או שלילי — בלי עצים', () => {
    expect(treeSlots(0, 30)).toEqual([]);
    expect(treeSlots(-3, 30)).toEqual([]);
  });

  it('עץ לכל נקודת מדד, בתוך גבולות המסלול', () => {
    const slots = treeSlots(4, 30);
    expect(slots).toHaveLength(4);
    for (const s of slots) {
      expect(s).toBeGreaterThan(0);
      expect(s).toBeLessThan(30);
    }
  });

  it('מספר העצים מוגבל', () => {
    expect(treeSlots(99, 40).length).toBeLessThanOrEqual(10);
  });
});

describe('הלוח מכסה מסלול אמיתי', () => {
  it('לכל מסלול יש נקודה לכל משבצת ותחנות מזוהות', () => {
    const route = buildRoute(content, plot('p-tower'), 'conforming');
    const lay = layoutRoute(route.length, 'wide');
    expect(lay.points).toHaveLength(route.length);
    const stations = stationIndexes(route);
    expect(stations.length).toBe(route.filter((q) => q.type === 'station').length);
    for (const i of stations) expect(lay.points[i]).toBeDefined();
  });
});
