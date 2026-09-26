import { useState } from 'react';
import { cardById, pathById, plotById, stationById, trackById } from '../content';
import BoardMap from './BoardMap';
import { isOnOpenStation, TABU_VALID_MONTHS } from '../engine/game';
import type { Action, GameState, Player, Square } from '../engine/types';
import { CATEGORY_LABEL, CategoryChip, DECK_LABEL, EffectList, SourceLine } from '../components/common';

interface Props {
  game: GameState;
  act: (a: Action) => void;
}

export default function Board({ game, act }: Props) {
  const player = game.players[game.current];
  const plot = plotById(player.plotId)!;
  const [view, setView] = useState<'map' | 'sheet'>('map');
  const done = player.resolved.filter((id) => player.route.some((q) => q.stationId === id)).length;
  const total = player.route.filter((q) => q.type === 'station').length;

  return (
    <section className="stack-lg">
      <div className="stack">
        <span className="eyebrow">
          {trackById(game.track)?.title} · {plot.name} · דרך: {player.path ? pathById(player.path)?.title : ''}
        </span>
        {game.players.length > 1 && <PlayerTags game={game} />}
        <Resources player={player} />
      </div>
      <div className="board">
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="view-switch" role="group" aria-label="תצוגה">
              <button className="btn" aria-pressed={view === 'map'} onClick={() => setView('map')}>
                לוח
              </button>
              <button className="btn" aria-pressed={view === 'sheet'} onClick={() => setView('sheet')}>
                גיליון הדרישות
              </button>
            </div>
            <span className="mono">
              {done}/{total}
            </span>
          </div>
          {view === 'map' ? (
            <BoardMap game={game} />
          ) : (
            <div className="sheet stack">
              <h3>גיליון הדרישות של {player.name}</h3>
              <Route player={player} />
            </div>
          )}
        </div>
        <div className="panel">
          <Panel game={game} act={act} player={player} />
          {player.log.length > 0 && (
            <div className="sheet flat stack">
              <span className="eyebrow">יומן התיק</span>
              <ol className="log" reversed>
                {[...player.log].reverse().slice(0, 8).map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlayerTags({ game }: { game: GameState }) {
  return (
    <div className="players" aria-label="שחקנים">
      {game.players.map((p, i) => {
        const total = p.route.filter((q) => q.type === 'station').length;
        const done = p.resolved.filter((id) => p.route.some((q) => q.stationId === id)).length;
        return (
          <span key={p.id} className={`player-tag ${i === game.current ? 'active' : ''} ${p.finished ? 'done' : ''}`}>
            {p.name} · {p.finished ? `היתר (${p.finishOrder})` : `${done}/${total}`}
          </span>
        );
      })}
    </div>
  );
}

function Resources({ player }: { player: Player }) {
  const r = player.res;
  const tabuLeft =
    player.tabuAt === null ? null : Math.min(TABU_VALID_MONTHS, TABU_VALID_MONTHS - (r.months - player.tabuAt));
  return (
    <div className="resources" aria-label="משאבים">
      <div><span className="k">תקציב</span><span className="v">{r.budget}</span></div>
      <div><span className="k">חודשים</span><span className="v">{r.months}</span></div>
      <div><span className="k">אמון שכנים</span><span className="v">{r.trust}</span></div>
      <div><span className="k">מדד עיר</span><span className="v">{r.city}</span></div>
      <div>
        <span className="k">{tabuLeft === null ? 'כרטיסי ידע' : 'ידע · טאבו'}</span>
        <span className="v">
          {r.shields}
          {tabuLeft !== null && <span style={{ fontSize: '0.8rem', color: tabuLeft < 0 ? 'var(--danger)' : 'var(--muted)' }}> · {Math.max(tabuLeft, 0)} ח׳</span>}
        </span>
      </div>
    </div>
  );
}

interface Group {
  station: Square;
  index: number;
  fillers: { sq: Square; index: number }[];
}

function Route({ player }: { player: Player }) {
  const groups: Group[] = [];
  let pending: { sq: Square; index: number }[] = [];
  player.route.forEach((sq, index) => {
    if (sq.type === 'station') {
      groups.push({ station: sq, index, fillers: pending });
      pending = [];
    } else pending.push({ sq, index });
  });

  return (
    <ol className="route">
      {groups.map((g, n) => {
        const st = stationById(g.station.stationId!)!;
        const passed = player.resolved.includes(st.id);
        const here = player.position === g.index;
        const onFiller = g.fillers.some((f) => f.index === player.position);
        return (
          <li key={g.index} className={`${here || onFiller ? 'here' : ''} ${passed ? 'passed' : ''}`}>
            <span className="idx">{String(n + 1).padStart(2, '0')}</span>
            <span className="t">
              {st.title}
              <span className="sub">
                {CATEGORY_LABEL[st.category]}
                {st.agency ? ` · ${st.agency}` : ''}
              </span>
              {g.fillers.length > 0 && (
                <span className="ticks" aria-label="משבצות כרטיסים לפני התחנה">
                  {g.fillers.map((f) => (
                    <span key={f.index} className={`tick ${f.index === player.position ? 'here' : ''}`}
                      title={DECK_LABEL[f.sq.type as keyof typeof DECK_LABEL]} />
                  ))}
                </span>
              )}
            </span>
            <span>
              {passed ? <span className="stamp">אושר</span> : here ? <span className="chip must">כאן</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Panel({ game, act, player }: Props & { player: Player }) {
  const ph = game.phase;
  const multi = game.players.length > 1;

  if (ph.name === 'turn') {
    const open = isOnOpenStation(player);
    const st = open ? stationById(player.route[player.position].stationId!) : null;
    return (
      <div className="sheet stack">
        {multi && <span className="eyebrow">התור של {player.name}</span>}
        {open && st ? (
          <>
            <h2>{st.title}</h2>
            <p>התחנה הזו היא שער. כדי להמשיך צריך לעבור אותה.</p>
            <div className="row">
              <button className="btn primary" onClick={() => act({ type: 'ROLL' })}>לתחנה</button>
            </div>
          </>
        ) : (
          <>
            <div className="row">
              <span className="die" aria-live="polite">{game.lastRoll ?? '·'}</span>
              <p>מטילים קובייה ומתקדמים. בתחנה הבאה עוצרים גם אם נשארו צעדים.</p>
            </div>
            <div className="row">
              <button className="btn primary" onClick={() => act({ type: 'ROLL' })}>הטלת קובייה</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (ph.name === 'station') {
    const st = stationById(ph.stationId)!;
    return (
      <div className="sheet stack">
        <div className="row">
          <CategoryChip category={st.category} />
          {st.agency && <span className="chip process">{st.agency}</span>}
          {game.lastRoll && <span className="mono" style={{ color: 'var(--muted)' }}>קובייה: {game.lastRoll}</span>}
        </div>
        <h2>{st.title}</h2>
        <p>{st.prompt}</p>
        <div className="options">
          {st.options.map((o) => (
            <button key={o.id} className="option" onClick={() => act({ type: 'ANSWER', optionId: o.id })}>
              {o.text}
            </button>
          ))}
        </div>
        {st.kind === 'decision' ? (
          <p className="lead">זו החלטה: אין תשובה אחת נכונה, לכל בחירה יש מחיר ותועלת.</p>
        ) : (
          player.res.shields > 0 && <p className="lead">יש לכם {player.res.shields} כרטיסי ידע: טעות לא תעלה זמן.</p>
        )}
      </div>
    );
  }

  if (ph.name === 'stationResult') {
    const st = stationById(ph.stationId)!;
    const opt = st.options.find((o) => o.id === ph.optionId)!;
    const track = trackById(game.track)!;
    const base = st.id === 'committee' ? track.committeeMonths : st.baseMonths;
    const isPermit = st.id === 'permit' && ph.passed;
    return (
      <div className="sheet stack">
        {isPermit ? (
          <div className="row"><span className="stamp big animate">היתר</span></div>
        ) : ph.passed ? (
          <div className="row"><span className="stamp animate">אושר</span><span className="result-ok">{st.title}</span></div>
        ) : (
          <span className="result-no">לא עברתם. נסו שוב בתור הבא.</span>
        )}
        <p>
          <strong>{opt.text}.</strong> {opt.feedback}
        </p>
        <EffectList effects={ph.passed ? { months: base + (opt.effects?.months ?? 0), ...withoutMonths(opt.effects) } : opt.effects} />
        {ph.notes.map((n, i) => (
          <div className="note" key={i}>{n}</div>
        ))}
        <div className="why">
          <span className="eyebrow">למה זה קיים?</span>
          <p>{st.why}</p>
        </div>
        <SourceLine meta={st.meta} />
        <div className="row">
          <button className="btn primary" onClick={() => act({ type: 'CONTINUE' })} autoFocus>
            {isPermit ? 'לסיכום' : multi ? 'העברת התור' : 'המשך'}
          </button>
        </div>
      </div>
    );
  }

  if (ph.name === 'card') {
    const card = cardById(ph.cardId)!;
    return (
      <div className="sheet stack">
        <div className="card-face">
          <span className="deck-name">{DECK_LABEL[card.deck]}</span>
          <h2>{card.title}</h2>
          <p>{card.text}</p>
          <EffectList effects={card.effects} />
        </div>
        {ph.notes.map((n, i) => (
          <div className="note" key={i}>{n}</div>
        ))}
        <SourceLine meta={card.meta} />
        <div className="row">
          <button className="btn primary" onClick={() => act({ type: 'CONTINUE' })} autoFocus>
            {multi ? 'העברת התור' : 'המשך'}
          </button>
        </div>
      </div>
    );
  }
  return null;
}

function withoutMonths(e?: { months?: number }) {
  if (!e) return {};
  const { months: _m, ...rest } = e;
  return rest;
}
