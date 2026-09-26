import { useState } from 'react';
import { content, pathById, plotById, trackById } from '../content';
import { mursheChecks, pathAvailability } from '../engine/game';
import type { Action, GameState, PathId } from '../engine/types';
import { SourceLine } from '../components/common';

interface Props {
  game: GameState;
  act: (a: Action) => void;
}

export default function PathChoice({ game, act }: Props) {
  const idx = game.phase.name === 'pathChoice' ? game.phase.player : 0;
  const player = game.players[idx];
  const plot = plotById(player.plotId)!;
  const avail = pathAvailability(plot);
  const checks = mursheChecks(plot);
  const [selected, setSelected] = useState<PathId | null>(null);
  const [showMore, setShowMore] = useState(false);
  const agencyNames = plot.agencies.map((a) => content.stations.find((s) => s.id === a)?.agency ?? a);

  return (
    <section className="stack-lg">
      <div className="stack">
        <span className="eyebrow">
          שלב 2 מתוך 2 · {game.players.length > 1 ? `התור של ${player.name}` : 'המגרש שלך'} · {trackById(game.track)?.title}
        </span>
        <h2>{plot.name}</h2>
        <p className="lead">{plot.description}</p>
      </div>

      {/* כרטיס מגרש = טופס: שורות מודפסות, ערכים בכתב יד */}
      <div className="formcard">
        <div className="form-head">
          <span className="form-title">כרטיס מגרש</span>
          <span className="form-no">טופס 1 · פרטי המגרש</span>
        </div>
        <p className="form-dream">
          <span className="form-label">החלום</span>
          <span className="hand">{plot.dream}</span>
        </p>
        <dl className="form-rows">
          {[
            ['קומות', String(plot.floors)],
            ['יחידות דיור', String(plot.units)],
            ['מגורים', `${plot.residentialPct}%`],
            ['גיל הבניין', plot.buildingAge === 0 ? 'מגרש ריק' : `${plot.buildingAge} שנים`],
            ['הריסה ובנייה', plot.demolition ? 'כן' : 'לא'],
            ['מבנה לשימור', plot.preservation ? 'כן' : 'לא'],
            ['כל הבעלים חתמו', plot.allOwnersSigned ? 'כן' : 'לא'],
            ['מכון בקרה', plot.controlInstitute ? 'כן' : 'לא'],
            ['תוכנית עיצוב ובינוי', plot.requiresDesignPlan ? 'נדרשת' : 'לא נדרשת'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd className="hand">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="form-foot">
          <span className="form-label">תיק המידע דורש אישור מ</span>
          <span className="hand">{agencyNames.join(' · ') || 'אין גורמים נוספים'}</span>
        </p>
      </div>

      <div className="stack">
        <h3>באיזו דרך הולכים?</h3>
        <div className="choices" role="group" aria-label="דרך">
          {content.paths.map((p) => {
            const a = avail.find((x) => x.path === p.id)!;
            return (
              <button key={p.id} className="choice" disabled={!a.allowed} aria-pressed={selected === p.id}
                onClick={() => setSelected(p.id)}>
                <h3>{p.title}</h3>
                <span>{p.summary}</span>
                <span className={a.allowed ? 'why-ok' : 'why-blocked'}>{a.allowed ? a.reason : `חסום: ${a.reason}`}</span>
              </button>
            );
          })}
          <button className="choice" aria-pressed={showMore} onClick={() => setShowMore((v) => !v)}>
            <h3>רוצה יותר ממה שהתוכנית מאפשרת</h3>
            <span>קומה נוספת, יותר שטח, שימוש אחר.</span>
            <span className="why-blocked">לא דרך להיתר. לחצו להסבר.</span>
          </button>
        </div>
        {showMore && (
          <div className="why">
            <span className="eyebrow">למה זה לא במשחק הזה</span>
            <p>
              בקשה להיתר פועלת בתוך התוכנית. מי שרוצה יותר ממה שהתב"ע מתירה צריך לשנות את התוכנית עצמה, כלומר
              להגיש תב"ע חדשה. זה הליך תכנוני נפרד וארוך, עם מוסדות תכנון אחרים. אחרי ביטול רוב ההקלות, זו הדרך
              היחידה להגדיל זכויות בבנייה חדשה.
            </p>
          </div>
        )}
      </div>

      <div className={`gate goldcard ${checks.every((c) => c.pass) ? 'open' : 'shut'}`}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h3>שער הכשירות: מורשה להיתר</h3>
          <span className={`mark ${checks.every((c) => c.pass) ? 'ok' : 'no'}`}>
            {checks.every((c) => c.pass) ? 'פתוח' : 'סגור'}
          </span>
        </div>
        <ul>
          {checks.map((c) => (
            <li key={c.id}>
              <span className={`mark ${c.pass ? 'ok' : 'no'}`}>{c.pass ? 'עומד' : 'לא עומד'}</span>
              <span>
                <strong>{c.label}.</strong> {c.reason}
              </span>
            </li>
          ))}
        </ul>
        <SourceLine meta={pathById('murshe')!.meta} />
      </div>

      {selected && (
        <div className="sheet stack">
          <span className="eyebrow">מה הדרך הזו מלמדת</span>
          <p>{pathById(selected)!.teaches}</p>
          <SourceLine meta={pathById(selected)!.meta} />
          <div className="row">
            <button className="btn primary" onClick={() => act({ type: 'CHOOSE_PATH', path: selected })}>
              יוצאים לדרך: {pathById(selected)!.title}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
