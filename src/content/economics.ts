// שכבת "מה זה עולה באמת" — מידע כלכלי לצד המשחק.
// היא אינה חלק מ-Content שהמנוע מקבל, ובכוונה: המנוע לא קורא אותה,
// היא לא משפיעה על משאבים, על ניקוד או על מהלך התור.
import type { Meta } from '../engine/types';
import data from './economics.json';

export interface EconomicFact {
  id: string;
  /** התחנה שאליה הפריט מצורף */
  stationId: string;
  title: string;
  body: string;
  meta: Meta;
}

export const economics = data as EconomicFact[];

/** הפריטים הכלכליים של תחנה מסוימת, אם יש */
export function economicsFor(stationId: string): EconomicFact[] {
  return economics.filter((e) => e.stationId === stationId);
}
