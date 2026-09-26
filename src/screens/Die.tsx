// קובייה מצוירת. התלת-ממד מזויף ב-CSS transform בלבד — DESIGN.md סעיף 5.

/** מיקומי הנקודות ברשת 3×3, לכל ערך קובייה */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

interface Props {
  value: number | null | undefined;
  /** מתגלגלת פעם אחת כשהיא נכנסת למסך */
  rolling?: boolean;
  small?: boolean;
}

export default function Die({ value, rolling = false, small = false }: Props) {
  const v = value && value >= 1 && value <= 6 ? value : null;
  const cells = v ? PIPS[v] : [];
  return (
    <span
      className={`die-3d ${rolling ? 'rolling' : ''} ${small ? 'small' : ''}`}
      role="img"
      aria-label={v ? `קובייה: ${v}` : 'טרם הוטלה קובייה'}
      aria-live="polite"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i}>{cells.includes(i) && <span className="pip" />}</span>
      ))}
    </span>
  );
}
