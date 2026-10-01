import type { Category, CardDeck, ContentStatus, Effects, Meta } from '../engine/types';

export const CATEGORY_LABEL: Record<Category, string> = {
  must: 'חובה',
  need: 'צריך',
  want: 'רוצים',
  process: 'הליך',
};

export const CATEGORY_HINT: Record<Category, string> = {
  must: 'מה שהחוק מחייב',
  need: 'מה שהעיר צריכה',
  want: 'מה שהתושב חולם עליו',
  process: 'שלב בתהליך',
};

export const DECK_LABEL: Record<CardDeck, string> = {
  event: 'כרטיס אירוע',
  knowledge: 'כרטיס ידע',
  neighborhood: 'כרטיס שכונה',
  responsibility: 'כרטיס אחריות',
  cityArchitect: 'הערת אדריכלית העיר',
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  source: 'לפי מקור',
  rule: 'חוק משחק',
};

export function CategoryChip({ category }: { category: Category }) {
  return (
    <span className={`chip ${category}`} title={CATEGORY_HINT[category]}>
      {CATEGORY_LABEL[category]}
    </span>
  );
}

export function SourceLine({ meta }: { meta: Meta }) {
  return (
    <div className="source">
      <span className={`chip ${meta.status}`}>{STATUS_LABEL[meta.status]}</span>
      {meta.source &&
        (meta.sourceUrl ? (
          <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
            {meta.source}
          </a>
        ) : (
          <span>{meta.source}</span>
        ))}
      {!meta.source && meta.sourceUrl && (
        <a href={meta.sourceUrl} target="_blank" rel="noreferrer">
          מקור
        </a>
      )}
      {meta.note && <span>· {meta.note}</span>}
    </div>
  );
}

const EFFECT_LABEL: Record<keyof Effects, string> = {
  budget: 'תקציב',
  months: 'חודשים',
  trust: 'אמון',
  city: 'מדד עיר',
  shields: 'כרטיס ידע',
};

export function EffectList({ effects }: { effects?: Effects }) {
  if (!effects) return null;
  const items = (Object.keys(effects) as (keyof Effects)[]).filter((k) => effects[k]);
  if (!items.length) return null;
  return (
    <div className="effects" aria-label="השפעות">
      {items.map((k) => (
        <span key={k} className={(effects[k]! > 0) === (k !== 'months') ? 'good' : 'bad'}>
          {EFFECT_LABEL[k]} {effects[k]! > 0 ? '+' : '−'}
          {Math.abs(effects[k]!)}
        </span>
      ))}
    </div>
  );
}
