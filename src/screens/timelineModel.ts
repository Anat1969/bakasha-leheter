// מודל ציר הזמן (גאנט). טהור, בלי React — כדי שאפשר יהיה לבדוק אותו.
// הוא הופך את היומן המובנה לפסים, לקשרי תלות ולחלון התוקף של נסח הטאבו.
import type { JournalEntry, JournalKind } from '../engine/types';

export type Lane = 'station' | 'card';

export interface TLBar {
  /** אינדקס ביומן — מקשר בין הפס, שורת היומן והמשבצת בלוח */
  idx: number;
  kind: JournalKind;
  ref: string;
  lane: Lane;
  at: number;
  from: number;
  to: number;
}

/** קשר תלות: סיום אחד מאפשר התחלה של הבא (finish-to-start), או בדיקת תוקף */
export interface TLLink {
  kind: 'sequence' | 'validity';
  from: { month: number; lane: Lane };
  to: { month: number; lane: Lane };
  /** בקשר תוקף: האם הבדיקה עברה בזמן */
  ok: boolean;
}

/** חלון תוקף של נסח טאבו: מהחודש שהופק ועד שהוא פג */
export interface TLWindow {
  start: number;
  end: number;
}

/** שורה בגאנט: תחנה אחת, עם כל מה שקרה בה — תיקון, ביטול קנס ואישור */
export interface TLRow {
  ref: string;
  bars: TLBar[];
}

export interface TLModel {
  maxMonth: number;
  bars: TLBar[];
  rows: TLRow[];
  links: TLLink[];
  windows: TLWindow[];
  now: number;
}

const STATION_KINDS: JournalKind[] = ['pass', 'reject', 'shielded', 'tabuRenewed'];
/** תחנות שבהן המנוע בודק את תוקף הנסח */
const TABU_CHECKS = ['submission', 'permit'];

export function timelineModel(journal: JournalEntry[], validMonths: number, now: number): TLModel {
  const bars: TLBar[] = journal.map((e, idx) => ({
    idx,
    kind: e.kind,
    ref: e.ref,
    lane: STATION_KINDS.includes(e.kind) ? 'station' : 'card',
    at: e.at,
    from: e.from,
    to: e.to,
  }));

  // רצף: כל עבודה בשורת התחנות מתחילה רק אחרי שהקודמת נגמרה
  const links: TLLink[] = [];
  const st = bars.filter((b) => b.lane === 'station');
  for (let i = 1; i < st.length; i++) {
    links.push({
      kind: 'sequence',
      from: { month: st[i - 1].to, lane: 'station' },
      to: { month: st[i].from, lane: 'station' },
      ok: st[i - 1].kind !== 'reject',
    });
  }

  // חלונות התוקף: נפתח כשהטאבו הופק, ונפתח מחדש בכל הפקה חוזרת
  const windows: TLWindow[] = [];
  for (const b of bars) {
    if ((b.kind === 'pass' && b.ref === 'survey-tabu') || b.kind === 'tabuRenewed') {
      windows.push({ start: b.to, end: b.to + validMonths });
    }
  }

  // תלות: ההגשה וההיתר בודקים את הנסח. בדיקה שנפלה מחוץ לחלון = הנסח פג.
  for (const b of bars) {
    if (b.kind !== 'pass' || !TABU_CHECKS.includes(b.ref)) continue;
    const w = [...windows].reverse().find((x) => x.start <= b.to);
    if (!w) continue;
    const renewed = bars.some((x) => x.kind === 'tabuRenewed' && x.idx === b.idx + 1);
    links.push({
      kind: 'validity',
      from: { month: w.start, lane: 'station' },
      to: { month: b.to, lane: 'station' },
      ok: !renewed,
    });
  }

  const rows: TLRow[] = [];
  for (const b of bars) {
    if (b.lane !== 'station') continue;
    const row = rows.find((r) => r.ref === b.ref);
    if (row) row.bars.push(b);
    else rows.push({ ref: b.ref, bars: [b] });
  }

  const last = Math.max(now, ...bars.map((b) => b.to), ...windows.map((w) => w.end), 0);
  const maxMonth = Math.max(12, Math.ceil((last + 1) / 3) * 3);
  return { maxMonth, bars, rows, links, windows, now };
}
