import { content } from '../content';
import { createReducer } from '../engine/game';
import type { GameState } from '../engine/types';
import { certificateLines, permitNumber } from './certificate';

const reducer = createReducer(content);
const start = (seed: number) => reducer(null, { type: 'START', track: 'extension', names: ['ענת', 'דן'], seed }) as GameState;

describe('תעודת ההיתר', () => {
  it('מספר ההיתר יציב לאותו משחק', () => {
    const g = start(42);
    expect(permitNumber(g, g.players[0])).toBe(permitNumber(g, g.players[0]));
  });

  it('לכל שחקן מספר משלו', () => {
    const g = start(42);
    expect(permitNumber(g, g.players[0])).not.toBe(permitNumber(g, g.players[1]));
  });

  it('חמש ספרות תמיד', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const g = start(seed);
      for (const p of g.players) expect(permitNumber(g, p)).toMatch(/^\d{5}$/);
    }
  });

  it('התעודה מציגה את מה שהאפיון דורש', () => {
    const g = start(7);
    const lines = certificateLines(g, g.players[0], 'חדר נוסף', 'תואם תוכנית');
    const labels = lines.map((l) => l.label);
    expect(labels).toEqual(['מספר היתר', 'מבקש/ת', 'המגרש', 'הדרך', 'משך התהליך', 'מדד עיר']);
    expect(lines.every((l) => l.value !== '')).toBe(true);
    expect(lines.find((l) => l.label === 'מבקש/ת')?.value).toBe('ענת');
  });
});
