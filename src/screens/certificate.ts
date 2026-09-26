// תעודת ההיתר — DESIGN.md סעיף 8 פריט 7. לוגיקה טהורה, כדי שתהיה ניתנת לבדיקה.
import type { GameState, Player } from '../engine/types';

/**
 * מספר היתר יציב: נגזר מה-seed של המשחק ומהשחקן, ולכן אותו משחק
 * מפיק תמיד את אותו מספר, וכל שחקן מקבל מספר משלו.
 */
export function permitNumber(game: GameState, player: Player): string {
  const n = ((game.rng >>> 0) % 90000) + 10000 + player.id * 7;
  return `${(n % 90000) + 10000}`;
}

/** שורות התעודה, לפי האפיון: מספר, שם, מגרש, חודשים, מדד עיר */
export interface CertLine {
  label: string;
  value: string;
}

export function certificateLines(
  game: GameState,
  player: Player,
  plotName: string,
  pathTitle: string,
): CertLine[] {
  return [
    { label: 'מספר היתר', value: permitNumber(game, player) },
    { label: 'מבקש/ת', value: player.name },
    { label: 'המגרש', value: plotName },
    { label: 'הדרך', value: pathTitle },
    { label: 'משך התהליך', value: `${player.res.months} חודשים` },
    { label: 'מדד עיר', value: `${player.res.city}` },
  ];
}
