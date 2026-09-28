import type { DieFace } from '../engine/types';

// קובייה של סוגי משבצות. הצבע לקוח מטוקני המשחק, והשם נאמר בטקסט
// כי צבע לבדו אינו נגיש — DESIGN.md סעיף 10.
export const FACE_LABEL: Record<DieFace, string> = {
  knowledge: 'ידע',
  event: 'אירוע',
  neighborhood: 'שכונה',
  responsibility: 'אחריות',
  cityArchitect: 'הערת אדריכלית',
  station: 'תחנה',
};

/** הדוגמה שמבדילה בין הפאות גם בלי צבע: מספר הסימנים על הפאה */
const FACE_MARKS: Record<DieFace, number> = {
  knowledge: 1,
  event: 2,
  neighborhood: 3,
  responsibility: 4,
  cityArchitect: 5,
  station: 6,
};

interface Props {
  value: DieFace | null | undefined;
  /** מתגלגלת פעם אחת כשהיא נכנסת למסך */
  rolling?: boolean;
  small?: boolean;
}

export default function Die({ value, rolling = false, small = false }: Props) {
  const label = value ? FACE_LABEL[value] : null;
  return (
    <span className="die-wrap">
      <span
        className={`die-3d face-${value ?? 'none'} ${rolling ? 'rolling' : ''} ${small ? 'small' : ''}`}
        aria-hidden="true"
      >
        {value &&
          Array.from({ length: FACE_MARKS[value] }, (_, i) => <span key={i} className="pip" />)}
      </span>
      <span className="die-name" aria-live="polite">
        {label ? `יצא: ${label}` : 'טרם הוטלה קובייה'}
      </span>
    </span>
  );
}
