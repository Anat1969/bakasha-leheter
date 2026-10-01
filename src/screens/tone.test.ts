import { content, economics } from '../content';
import { STEPS } from './Onboarding';
import { CUE_NAMES, loadSoundPref } from '../sound';

/** כל הטקסט שהשחקן רואה, מתוך קובצי התוכן */
function allText(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const s of content.stations) {
    out.push({ where: `תחנה ${s.id}`, text: [s.title, s.prompt, s.why].join(' ') });
    for (const o of s.options) out.push({ where: `תחנה ${s.id} / ${o.id}`, text: `${o.text} ${o.feedback}` });
  }
  for (const c of content.cards) out.push({ where: `כרטיס ${c.id}`, text: `${c.title} ${c.text}` });
  for (const p of content.paths) out.push({ where: `דרך ${p.id}`, text: `${p.title} ${p.summary} ${p.teaches}` });
  for (const e of content.exemptions) out.push({ where: `פטור ${e.id}`, text: `${e.work} ${e.explanation}` });
  for (const g of content.glossary) out.push({ where: `מונח ${g.term}`, text: `${g.term} ${g.definition}` });
  for (const t of content.tracks) out.push({ where: `מסלול ${t.id}`, text: `${t.title} ${t.summary}` });
  for (const e of economics) out.push({ where: `כלכלה ${e.id}`, text: `${e.title} ${e.body}` });
  for (const p of content.plots) out.push({ where: `מגרש ${p.id}`, text: `${p.name} ${p.description} ${p.dream}` });
  return out;
}

// DESIGN.md סעיף 7 + CLAUDE.md כלל 1
describe('כללי הניסוח', () => {
  const rows = allText();

  it('בלי אימוג׳י ובלי סמלים גרפיים', () => {
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
    for (const r of rows) expect(emoji.test(r.text), `${r.where}: ${r.text.slice(0, 60)}`).toBe(false);
  });

  it('בלי סימני קריאה מרובים', () => {
    for (const r of rows) expect(r.text, r.where).not.toMatch(/!\s*!/);
  });

  it('בלי סימן קריאה בכלל — הטון יבש', () => {
    for (const r of rows) expect(r.text, `${r.where}: ${r.text.slice(0, 60)}`).not.toContain('!');
  });

  it('אין לעג לפקידים, לבודקים או לתושבים', () => {
    const mocking = /(פקיד(ים)? (עצל|מטומטם|מיותר)|בירוקרט(ים)? (עלוב|טיפש)|טמבל|אידיוט|מטומטם|עצלן)/;
    for (const r of rows) expect(mocking.test(r.text), r.where).toBe(false);
  });
});

// DESIGN.md סעיף 9
describe('הדרכה בכניסה', () => {
  it('שלוש שכבות בדיוק', () => {
    expect(STEPS).toHaveLength(3);
  });

  it('כל שכבה מצביעה על משהו בלוח', () => {
    expect(STEPS[0].title).toContain('קובייה');
    expect(STEPS[1].title).toContain('תחנה');
    expect(STEPS[2].title).toContain('מדד העיר');
    for (const s of STEPS) expect(s.text.length).toBeGreaterThan(10);
  });
});

// DESIGN.md סעיף 6
describe('צליל', () => {
  it('כבוי כברירת מחדל', () => {
    expect(loadSoundPref()).toBe(false);
  });

  it('אחסון שנכשל לא מדליק צליל ולא זורק', () => {
    const orig = globalThis.localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('אחסון חסום');
      },
    });
    expect(() => loadSoundPref()).not.toThrow();
    expect(loadSoundPref()).toBe(false);
    if (orig) Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: orig });
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('שישה צלילים בלבד, כפי שהאפיון מגביל', () => {
    expect(CUE_NAMES).toHaveLength(6);
    expect(CUE_NAMES).toEqual(expect.arrayContaining(['die', 'step', 'stamp', 'reject', 'card', 'permit']));
  });
});
