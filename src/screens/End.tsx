import { pathById, plotById } from '../content';
import { scorePlayer } from '../engine/game';
import type { GameState } from '../engine/types';
import { certificateLines } from './certificate';

export default function End({ game, onNew }: { game: GameState; onNew: () => void }) {
  const scored = game.players
    .map((p) => ({ p, s: scorePlayer(p, game.players.length) }))
    .sort((a, b) => b.s.total - a.s.total);

  return (
    <section className="stack-lg">
      {/* סיום = תעודת היתר. הניקוד בא אחריה. */}
      {scored.map(({ p }) => (
        <div className="certificate cert-full" key={p.id}>
          <span className="eyebrow">רשות הרישוי · עיריית אשדוד</span>
          <h2>היתר בנייה</h2>
          <dl className="cert-rows">
            {certificateLines(game, p, plotById(p.plotId)?.name ?? '', p.path ? (pathById(p.path)?.title ?? '') : '').map(
              (l) => (
                <div key={l.label}>
                  <dt>{l.label}</dt>
                  <dd className="hand">{l.value}</dd>
                </div>
              ),
            )}
          </dl>
          <span className="seal-big">אושר</span>
          <div className="cert-sign">
            <span className="sign-line" aria-hidden="true" />
            <span className="cert-line">חתימת רשות הרישוי</span>
          </div>
        </div>
      ))}

      <div className="stack">
        <h3>{scored.length > 1 ? `${scored[0].p.name} מובילים את הרחוב` : 'איך זה נראה בניקוד'}</h3>
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
              <span className="mono" style={{ fontSize: '1.5rem' }}>
                {s.total}
              </span>
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
          ההיתר הוא לא הסוף. מכאן מגישים תוכנית התארגנות אתר, עומדים ברשימת הדרישות להתחלת עבודות, והפיקוח מלווה את
          הבנייה עד תעודת הגמר. הפרק הזה ייכנס לגרסה הבאה של המשחק.
        </p>
      </div>

      <div className="row">
        <button className="btn primary" onClick={onNew}>
          משחק חדש
        </button>
      </div>
    </section>
  );
}
