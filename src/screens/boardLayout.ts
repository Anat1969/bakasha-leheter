// גאומטריה טהורה של הלוח. בלי React ובלי DOM — כדי שאפשר יהיה לבדוק אותה.
import type { Square } from '../engine/types';

export interface Pt {
  x: number;
  y: number;
}

/** רחב = מחשב, מסלול מתפתל מימין לשמאל ובחזרה. גבוה = טלפון, מסלול אנכי. */
export type BoardMode = 'wide' | 'tall';

export interface Layout {
  mode: BoardMode;
  width: number;
  height: number;
  points: Pt[];
  /** נתיב SVG חלק שעובר בכל הנקודות */
  d: string;
}

const WIDE = { width: 780, cols: 4, marginX: 95, marginTop: 100, rowH: 155, marginBottom: 85 };
const TALL = { width: 420, amp: 108, stepY: 96, marginTop: 90, marginBottom: 80 };

export function layoutRoute(count: number, mode: BoardMode): Layout {
  const n = Math.max(count, 1);
  const points: Pt[] = [];

  if (mode === 'wide') {
    const { width, cols, marginX, marginTop, rowH, marginBottom } = WIDE;
    const colW = (width - marginX * 2) / (cols - 1);
    const rows = Math.ceil(n / cols);
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      // שורה זוגית מתקדמת מימין לשמאל (RTL), שורה אי-זוגית חוזרת
      const x = row % 2 === 0 ? width - marginX - col * colW : marginX + col * colW;
      points.push({ x, y: marginTop + row * rowH });
    }
    return {
      mode,
      width,
      height: marginTop + (rows - 1) * rowH + marginBottom,
      points,
      d: smoothPath(points),
    };
  }

  const { width, amp, stepY, marginTop, marginBottom } = TALL;
  for (let i = 0; i < n; i++) {
    points.push({ x: width / 2 + amp * Math.sin(i * 0.55), y: marginTop + i * stepY });
  }
  return {
    mode,
    width,
    height: marginTop + (n - 1) * stepY + marginBottom,
    points,
    d: smoothPath(points),
  };
}

/** Catmull-Rom → Bezier: מקטע אחד לכל זוג נקודות עוקבות */
function segments(pts: Pt[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    out.push(` C ${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(p2.x)} ${r(p2.y)}`);
  }
  return out;
}

/** Catmull-Rom → Bezier. נותן מסלול מתפתל ולא שבור. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length === 0) return '';
  return `M ${r(pts[0].x)} ${r(pts[0].y)}` + segments(pts).join('');
}

/**
 * הקטע של המסלול מנקודה from עד נקודה to, באותן עקומות בדיוק כמו המסלול המלא.
 * כך הקו "המדויו" שמאחורי הכלי מונח בדיוק על קו העיפרון.
 */
export function pathBetween(pts: Pt[], from: number, to: number): string {
  const a = Math.max(0, Math.min(from, pts.length - 1));
  const b = Math.max(a, Math.min(to, pts.length - 1));
  if (!pts.length) return '';
  return `M ${r(pts[a].x)} ${r(pts[a].y)}` + segments(pts).slice(a, b).join('');
}

const r = (v: number) => Math.round(v * 10) / 10;

// ------------------------------------------------------------
// צורות התחנות: כל גורם מקבל צורה גאומטרית משלו. לא אייקונים.
// ------------------------------------------------------------

export type StationShape =
  | 'columns' // ועדה ורשות רישוי — מבנה עם עמודים
  | 'watertower' // תאגיד המים
  | 'drafting' // אדריכלית העיר — שולחן שרטוט
  | 'road' // תכנון כבישים וחניה
  | 'canopy' // נטיעות ופיתוח
  | 'ledger' // מחלקת נכסים
  | 'waves' // ניקוז ונחלים
  | 'bin' // תברואה
  | 'shelter' // פיקוד העורף — ממ"ד
  | 'facade' // הנחיות מרחביות
  | 'screen' // רישוי זמין, הגשה מקוונת
  | 'seal' // היתר
  | 'office'; // ברירת מחדל

const BY_AGENCY: Record<string, StationShape> = {
  'אדריכלית העיר': 'drafting',
  'תאגיד המים יובלים': 'watertower',
  'תכנון כבישים וחניה': 'road',
  'נטיעות ופיתוח': 'canopy',
  'מחלקת נכסים': 'ledger',
  'ניקוז ונחלים': 'waves',
  תברואה: 'bin',
  'פיקוד העורף': 'shelter',
  'הנחיות מרחביות': 'facade',
};

const BY_ID: Record<string, StationShape> = {
  committee: 'columns',
  'design-control': 'columns',
  submission: 'screen',
  'murshe-appoint': 'screen',
  permit: 'seal',
  'survey-tabu': 'ledger',
  'agency-waste': 'bin',
};

export function stationShape(stationId: string, agency?: string): StationShape {
  if (agency && BY_AGENCY[agency]) return BY_AGENCY[agency];
  return BY_ID[stationId] ?? 'office';
}

/** צבע משבצת כרטיס לפי החפיסה */
export const DECK_COLOR: Record<string, string> = {
  event: 'var(--brick)',
  knowledge: 'var(--sea)',
  neighborhood: 'var(--leaf)',
  responsibility: 'var(--gold)',
  cityArchitect: 'var(--tracing-ink)',
};

/** אינדקסים של משבצות שהן תחנה — לשימוש בתוויות ובגלילה */
export function stationIndexes(route: Square[]): number[] {
  return route.map((sq, i) => (sq.type === 'station' ? i : -1)).filter((i) => i >= 0);
}
