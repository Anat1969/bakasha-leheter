// ============================================================
// טיפוסים — "בקשה להיתר"
// כל התוכן (תחנות, כרטיסים, מגרשים) נטען מקובצי JSON שב-src/content
// ============================================================

export type TrackId = 'extension' | 'house' | 'building' | 'mamad';
export type PathId = 'conforming' | 'flexibility' | 'relief' | 'oldBuilding' | 'murshe';

/** סטטוס אמינות לכל פריט תוכן */
export type ContentStatus =
  | 'source' // מבוסס על מקור, והמקור מצוין
  | 'rule'; // חוק משחק: הדין אינו ודאי, או שזה תרחיש להמחשה

export interface Meta {
  status: ContentStatus;
  source?: string;
  sourceUrl?: string;
  dateChecked?: string; // YYYY-MM-DD
  note?: string;
}

/** שלושת סוגי הדרישות — לב המסר החינוכי */
export type Category = 'must' | 'need' | 'want' | 'process';

export interface Effects {
  budget?: number; // נקודות תקציב (מופשט, לא שקלים)
  months?: number; // זמן שחולף
  trust?: number; // אמון שכנים
  city?: number; // מדד עיר: תרומה לרחוב ולמרחב הציבורי
  shields?: number; // "כרטיס ידע" שמבטל קנס טעות אחד
}

export type SpecialAction = 'backToRegularTrack' | 'renewTabu';

export interface Option {
  id: string;
  text: string;
  /** בשאלת ידע: האם זו התשובה הנכונה. בהחלטה: לא רלוונטי */
  correct?: boolean;
  effects?: Effects;
  feedback: string;
}

export interface Station {
  id: string;
  title: string;
  kind: 'question' | 'decision';
  category: Category;
  /** גורם מאשר (אם התחנה היא "שולחן" של גורם) */
  agency?: string;
  prompt: string;
  options: Option[];
  /** "למה זה קיים?" — ההסבר שמוצג אחרי ההחלטה */
  why: string;
  /** זמן בסיס שהתחנה לוקחת (חודשים) כשעוברים אותה */
  baseMonths: number;
  meta: Meta;
}

export type CardDeck = 'event' | 'knowledge' | 'neighborhood' | 'responsibility' | 'cityArchitect';

export interface Card {
  id: string;
  deck: CardDeck;
  title: string;
  text: string;
  effects?: Effects;
  action?: SpecialAction;
  /** מגביל את הכרטיס למסלולים מסוימים */
  onlyPaths?: PathId[];
  meta: Meta;
}

export interface Plot {
  id: string;
  track: TrackId;
  name: string;
  description: string;
  residentialPct: number;
  floors: number;
  units: number;
  buildingAge: number; // 0 = מגרש ריק
  demolition: boolean; // הריסה ובנייה מחדש
  preservation: boolean; // מבנה לשימור
  allOwnersSigned: boolean;
  controlInstitute: boolean; // בקרת תכן במכון בקרה
  requiresDesignPlan: boolean; // התב"ע מחייבת תוכנית עיצוב ובינוי
  agencies: string[]; // גורמים שתיק המידע דורש
  dream: string; // מה התושב רוצה
  meta: Meta;
}

export interface PathDef {
  id: PathId;
  title: string;
  summary: string;
  teaches: string;
  /** תחנות שנוספות לפני ההגשה (החלטה תכנונית) */
  preStations: string[];
  /** תחנות שנוספות אחרי ההגשה (למשל פרסום) */
  postStations: string[];
  skipStations: string[];
  /** האם להוסיף משבצות "כרטיס אחריות" למסלול */
  responsibilitySquares?: boolean;
  meta: Meta;
}

export interface TrackDef {
  id: TrackId;
  title: string;
  summary: string;
  /** סדר תחנות הבסיס. placeholders: @designPlan, @pathPre, @pathPost, @agencies */
  stations: string[];
  /** זמן ועדה שונה לפי מסלול (מקוצר/מלא) */
  committeeMonths: number;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
  meta: Meta;
}

/** "צריך היתר?" — שאלון עבודות פטורות מהיתר */
export type ExemptAnswer = 'exempt' | 'exemptReport' | 'permit';

export interface ExemptionItem {
  id: string;
  work: string;
  answer: ExemptAnswer;
  explanation: string;
  meta: Meta;
}

export interface Content {
  exemptions: ExemptionItem[];
  tracks: TrackDef[];
  paths: PathDef[];
  stations: Station[];
  cards: Card[];
  plots: Plot[];
  glossary: GlossaryEntry[];
}

// ------------------------------------------------------------
// מצב המשחק
// ------------------------------------------------------------

export type SquareType = 'station' | CardDeck;

export interface Square {
  type: SquareType;
  stationId?: string;
}

export interface Resources {
  budget: number;
  months: number;
  trust: number;
  city: number;
  shields: number;
}

export interface Player {
  id: number;
  name: string;
  plotId: string;
  path: PathId | null;
  route: Square[];
  position: number; // אינדקס במסלול
  resolved: string[]; // תחנות שעברו
  res: Resources;
  tabuAt: number | null; // החודש שבו הופק נסח הטאבו
  cityMarks: number[]; // משבצות שבהן מדד העיר עלה — שם נשתל עץ על הלוח
  finished: boolean;
  finishOrder: number | null;
  log: string[];
}

export type Phase =
  | { name: 'pathChoice'; player: number }
  | { name: 'turn' }
  | { name: 'station'; stationId: string }
  | { name: 'stationResult'; stationId: string; optionId: string; passed: boolean; notes: string[] }
  | { name: 'card'; cardId: string; notes: string[] }
  | { name: 'ended' };

export interface GameState {
  version: 1;
  track: TrackId;
  players: Player[];
  current: number;
  phase: Phase;
  rng: number; // מצב מחולל אקראיות (seeded)
  lastRoll: number | null;
  finishedCount: number;
  usedCards: string[];
}

export type Action =
  | { type: 'START'; track: TrackId; names: string[]; seed: number }
  | { type: 'CHOOSE_PATH'; path: PathId }
  | { type: 'ROLL' }
  | { type: 'ANSWER'; optionId: string }
  | { type: 'CONTINUE' }
  | { type: 'LOAD'; state: GameState };
