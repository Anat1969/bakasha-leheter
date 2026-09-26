import { pathById, plotById } from '../content';
import { scorePlayer } from '../engine/game';
import type { GameState } from '../engine/types';

export default function End({ game, onNew }: { game: GameState; onNew: () => void }) {
  const scored = game.players
    .map((p) => ({ p, s: scorePlayer(p, game.players.length) }))
    .sort((a, b) => b.s.total - a.s.total);

  return (
    <section className="stack-lg">
      <div className="stack">
        <span className="stamp big animate" style={{ justifySelf: 'start' }}>היתר</span>
        <h2>{scored.length > 1 ? `${scored[0].p.name} מובילים את הרחוב` : 'קיבלתם היתר'}</h2>
        <p className="lead">
          הציון לא מודד רק מהירות. הוא כולל את התרומה לרחוב, את אמון השכנים ואת ניהול התקציב והזמן.
        </p>
      </div>

      <div className="ranking">
        {scored.map(({ p, s }, i) => (
          <div className="sheet stack" key={p.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>
                {scored.length > 1 ? `מקום ${i + 1}: ` : ''}
                {p.name}
              </h3>
              <span className="mono" style={{ fontSize: '1.5rem' }}>{s.total}</span>
            </div>
            <span className="eyebrow">
              {plotById(p.plotId)?.name} · {p.path ? pathById(p.path)?.title : ''} · {p.res.months} חודשים
            </span>
            <table className="score-table">
              <tbody>
                {s.lines.map((l) => (
                  <tr key={l.label}>
                    <td>{l.label}</td>
                    <td>{l.value}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>סך הכול</td>
                  <td>{s.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="why">
        <span className="eyebrow">מהיתר למפתח</span>
        <p>
          ההיתר הוא לא הסוף. מכאן מגישים תוכנית התארגנות אתר, עומדים ברשימת הדרישות להתחלת עבודות, והפיקוח מלווה
          את הבנייה עד תעודת הגמר. הפרק הזה ייכנס לגרסה הבאה של המשחק.
        </p>
      </div>

      <div className="row">
        <button className="btn primary" onClick={onNew}>משחק חדש</button>
      </div>
    </section>
  );
}
