/**
 * צליל — DESIGN.md סעיף 6.
 * כבוי כברירת מחדל. ארבעה צלילים קצרים בלבד, שנוצרים ב-Web Audio
 * ולכן אין קבצי שמע. ה-AudioContext נוצר רק בפעולה ראשונה של המשתמש.
 */
const KEY = 'bakasha-leheter:sound';

export type Cue = 'die' | 'stamp' | 'card' | 'permit';

/** תדר, משך ועוצמה לכל צליל. קצר בכוונה: זה לא פסקול. */
const CUES: Record<Cue, { freq: number[]; ms: number; type: OscillatorType; gain: number }> = {
  die: { freq: [180, 140, 210], ms: 90, type: 'triangle', gain: 0.05 },
  stamp: { freq: [90, 60], ms: 110, type: 'square', gain: 0.06 },
  card: { freq: [520, 660], ms: 70, type: 'sine', gain: 0.04 },
  permit: { freq: [523, 659, 784], ms: 200, type: 'sine', gain: 0.05 },
};

let enabled = false;
let ctx: AudioContext | null = null;

/** ברירת המחדל היא כבוי. רק ערך שמור מפורש מדליק. */
export function loadSoundPref(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false; // אחסון לא זמין — ממשיכים בלי צליל
  }
}

export function setSound(on: boolean): void {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* אחסון לא זמין — ההעדפה תקפה לסשן הזה בלבד */
  }
}

export function initSound(): boolean {
  enabled = loadSoundPref();
  return enabled;
}

export function isSoundOn(): boolean {
  return enabled;
}

export function play(cue: Cue): void {
  if (!enabled) return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const { freq, ms, type, gain } = CUES[cue];
    freq.forEach((f, i) => {
      const t0 = ctx!.currentTime + (i * ms) / 1000;
      const osc = ctx!.createOscillator();
      const vol = ctx!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, t0);
      vol.gain.setValueAtTime(0, t0);
      vol.gain.linearRampToValueAtTime(gain, t0 + 0.012);
      vol.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
      osc.connect(vol).connect(ctx!.destination);
      osc.start(t0);
      osc.stop(t0 + ms / 1000 + 0.02);
    });
  } catch {
    /* דפדפן בלי Web Audio, או הקשר חסום — המשחק ממשיך בשקט */
  }
}

/** רשימת הצלילים, לבדיקות ולתיעוד */
export const CUE_NAMES = Object.keys(CUES) as Cue[];
