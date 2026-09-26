// טוען התוכן: כל הקבצים כאן ניתנים לעריכה בלי לגעת בקוד המשחק.
import type { Card, Content, ExemptionItem, GlossaryEntry, PathDef, Plot, Station, TrackDef } from '../engine/types';
import tracks from './tracks.json';
import paths from './paths.json';
import stations from './stations.json';
import cards from './cards.json';
import plots from './plots.json';
import glossary from './glossary.json';
import exemptions from './exemptions.json';

export const content: Content = {
  tracks: tracks as TrackDef[],
  paths: paths as PathDef[],
  stations: stations as Station[],
  cards: cards as Card[],
  plots: plots as Plot[],
  glossary: glossary as GlossaryEntry[],
  exemptions: exemptions as ExemptionItem[],
};

/** בדיקת שלמות תוכן — מחזירה רשימת שגיאות (ריקה = תקין) */
export function validateContent(c: Content): string[] {
  const errors: string[] = [];
  const stationIds = new Set(c.stations.map((s) => s.id));
  const placeholders = new Set(['@designPlan', '@pathPre', '@pathPost', '@agencies']);

  for (const t of c.tracks) {
    for (const id of t.stations) {
      if (!placeholders.has(id) && !stationIds.has(id)) errors.push(`מסלול ${t.id}: תחנה לא קיימת ${id}`);
    }
    if (!t.stations.includes('permit')) errors.push(`מסלול ${t.id}: חסרה תחנת היתר`);
  }
  for (const p of c.paths) {
    for (const id of [...p.preStations, ...p.postStations, ...p.skipStations]) {
      if (!stationIds.has(id)) errors.push(`דרך ${p.id}: תחנה לא קיימת ${id}`);
    }
  }
  for (const pl of c.plots) {
    for (const a of pl.agencies) if (!stationIds.has(a)) errors.push(`מגרש ${pl.id}: גורם לא קיים ${a}`);
    if (!c.tracks.some((t) => t.id === pl.track)) errors.push(`מגרש ${pl.id}: מסלול לא קיים`);
  }
  for (const s of c.stations) {
    if (s.options.length < 2) errors.push(`תחנה ${s.id}: פחות משתי אפשרויות`);
    if (s.kind === 'question' && s.options.filter((o) => o.correct).length !== 1) {
      errors.push(`תחנה ${s.id}: שאלה חייבת תשובה נכונה אחת בדיוק`);
    }
    if (!s.meta?.status) errors.push(`תחנה ${s.id}: חסר סטטוס`);
  }
  for (const card of c.cards) if (!card.meta?.status) errors.push(`כרטיס ${card.id}: חסר סטטוס`);
  for (const ex of c.exemptions) {
    if (!['exempt', 'exemptReport', 'permit'].includes(ex.answer)) errors.push(`פטור ${ex.id}: תשובה לא תקינה`);
    if (!ex.meta?.status) errors.push(`פטור ${ex.id}: חסר סטטוס`);
  }
  const ids = [...c.stations.map((s) => s.id), ...c.cards.map((x) => x.id), ...c.plots.map((p) => p.id), ...c.exemptions.map((e) => e.id)];
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`מזהים כפולים: ${dup.join(', ')}`);
  return errors;
}

export const stationById = (id: string) => content.stations.find((s) => s.id === id);
export const cardById = (id: string) => content.cards.find((c) => c.id === id);
export const plotById = (id: string) => content.plots.find((p) => p.id === id);
export const pathById = (id: string) => content.paths.find((p) => p.id === id);
export const trackById = (id: string) => content.tracks.find((t) => t.id === id);
