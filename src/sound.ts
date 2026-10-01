/**
 * צליל — DESIGN.md סעיף 6.
 * כבוי כברירת מחדל. שישה צלילים קצרים, כולם מסונתזים ב-Web Audio ולכן אין
 * קבצי שמע. כל צליל מחקה חומר: עץ (קובייה, כלי), דיו ונייר (חותמת, כרטיס),
 * פעמון (היתר). ה-AudioContext נוצר רק בפעולה ראשונה של המשתמש.
 */
const KEY = 'bakasha-leheter:sound';

export type Cue = 'die' | 'step' | 'stamp' | 'reject' | 'card' | 'permit';

let enabled = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

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
  if (on) play('stamp'); // אישור שמיעתי שהצליל פועל
}

export function initSound(): boolean {
  enabled = loadSoundPref();
  return enabled;
}

export function isSoundOn(): boolean {
  return enabled;
}

function audio(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    // מדחס עדין: שום צליל לא קופץ מעל האחרים
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
    // רעש לבן אחד, משותף לכל הצלילים
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let seed = 7;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 16807) % 2147483647;
      d[i] = (seed / 2147483647) * 2 - 1;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** פרץ רעש מסונן: נקישת עץ, רשרוש נייר, מגע של חותמת */
function noise(
  c: AudioContext,
  t: number,
  ms: number,
  gain: number,
  filter: BiquadFilterType,
  freq: number,
  q = 1,
  sweepTo?: number,
): void {
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + ms / 1000);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  src.connect(f).connect(g).connect(master!);
  src.start(t, Math.random() * 0.5);
  src.stop(t + ms / 1000 + 0.02);
}

/** טון עם דעיכה: גוף של חבטה או פעמון */
function tone(c: AudioContext, t: number, f0: number, f1: number, ms: number, gain: number, type: OscillatorType = 'sine'): void {
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + ms / 1000 + 0.02);
}

const CUES: Record<Cue, (c: AudioContext, t: number) => void> = {
  // קובייה מעץ מתגלגלת על שולחן: נקישות מתקצרות, ונחיתה
  die: (c, t) => {
    [0, 0.09, 0.17, 0.24, 0.3, 0.35, 0.39].forEach((dt, i) => {
      noise(c, t + dt, 38, 0.32 - i * 0.03, 'bandpass', 1900 + (i % 3) * 420, 4);
      tone(c, t + dt, 420 + (i % 2) * 90, 300, 40, 0.05, 'triangle');
    });
    tone(c, t + 0.46, 150, 90, 120, 0.12);
    noise(c, t + 0.46, 60, 0.18, 'lowpass', 900);
  },
  // צעד של כלי: נקישה קצרה ויבשה
  step: (c, t) => {
    noise(c, t, 26, 0.14, 'bandpass', 2600, 6);
    tone(c, t, 820, 640, 30, 0.035, 'triangle');
  },
  // חותמת גומי על נייר: חבטה עמומה ומגע של דיו
  stamp: (c, t) => {
    tone(c, t, 140, 52, 170, 0.3);
    noise(c, t, 90, 0.25, 'lowpass', 1200);
    noise(c, t + 0.012, 140, 0.06, 'highpass', 3500);
  },
  // הוחזר לתיקון: שתי חבטות נמוכות, בלי דרמה
  reject: (c, t) => {
    tone(c, t, 110, 48, 150, 0.26);
    noise(c, t, 70, 0.2, 'lowpass', 900);
    tone(c, t + 0.16, 96, 44, 190, 0.22);
    noise(c, t + 0.16, 80, 0.16, 'lowpass', 800);
  },
  // כרטיס נשלף ומתהפך: רשרוש נייר עולה, וטפיחה
  card: (c, t) => {
    noise(c, t, 200, 0.16, 'bandpass', 900, 0.9, 4200);
    noise(c, t + 0.21, 50, 0.14, 'lowpass', 1600);
  },
  // היתר: חותמת, ואחריה אקורד פעמון רך
  permit: (c, t) => {
    CUES.stamp(c, t);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(c, t + 0.22 + i * 0.11, f, f, 1600, 0.07);
      tone(c, t + 0.22 + i * 0.11, f * 2.01, f * 2.01, 700, 0.015);
    });
  },
};

export function play(cue: Cue): void {
  if (!enabled) return;
  try {
    const c = audio();
    if (!c || !master) return;
    CUES[cue](c, c.currentTime + 0.01);
  } catch {
    /* דפדפן בלי Web Audio, או הקשר חסום — המשחק ממשיך בשקט */
  }
}

/** רשימת הצלילים, לבדיקות ולתיעוד */
export const CUE_NAMES = Object.keys(CUES) as Cue[];
