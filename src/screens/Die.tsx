import type { CSSProperties } from 'react';
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

/**
 * קובייה אמיתית בתלת-ממד: שש פאות, וכל אחת יושבת על צלע אחרת של הקובייה.
 * place = איפה הפאה יושבת, show = הסיבוב של הקובייה שמביא אותה מול העין.
 */
const FACES: { face: DieFace; place: string; rx: number; ry: number }[] = [
  { face: 'knowledge', place: 'rotateY(0deg)', rx: 0, ry: 0 },
  { face: 'event', place: 'rotateY(180deg)', rx: 0, ry: 180 },
  { face: 'neighborhood', place: 'rotateY(90deg)', rx: 0, ry: -90 },
  { face: 'responsibility', place: 'rotateY(-90deg)', rx: 0, ry: 90 },
  { face: 'cityArchitect', place: 'rotateX(90deg)', rx: -90, ry: 0 },
  { face: 'station', place: 'rotateX(-90deg)', rx: 90, ry: 0 },
];

interface Props {
  value: DieFace | null | undefined;
  /** מתגלגלת פעם אחת כשהיא נכנסת למסך */
  rolling?: boolean;
  small?: boolean;
  /** בלי שורת הטקסט שלצד הקובייה */
  bare?: boolean;
}

export default function Die({ value, rolling = false, small = false, bare = false }: Props) {
  const label = value ? FACE_LABEL[value] : null;
  const show = FACES.find((f) => f.face === value) ?? { rx: -22, ry: 32 };
  return (
    <span className={`die-wrap ${small ? 'small' : ''}`}>
      <span className="die-stage" aria-hidden="true">
        <span
          className={`die-cube ${rolling && value ? 'rolling' : ''} ${value ? '' : 'idle'}`}
          style={{ '--rx': `${show.rx}deg`, '--ry': `${show.ry}deg` } as CSSProperties}
        >
          {FACES.map((f) => (
            <span key={f.face} className={`die-face face-${f.face}`} style={{ '--place': f.place } as CSSProperties}>
              <span className="pips">
                {Array.from({ length: FACE_MARKS[f.face] }, (_, i) => (
                  <span key={i} className="pip" />
                ))}
              </span>
              <span className="face-word">{FACE_LABEL[f.face]}</span>
            </span>
          ))}
        </span>
        <span className={`die-shadow ${rolling && value ? 'rolling' : ''}`} />
      </span>
      {!bare && (
        <span className="die-name" aria-live="polite">
          {label ? `יצא: ${label}` : 'טרם הוטלה קובייה'}
        </span>
      )}
    </span>
  );
}
