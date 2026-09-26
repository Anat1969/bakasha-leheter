import { useEffect, useState } from 'react';
import { cardById, pathById, plotById, stationById, trackById } from '../content';
import BoardMap from './BoardMap';
import Die from './Die';
import Onboarding, { seenOnboarding } from './Onboarding';
import { play, type Cue } from '../sound';
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
  const [fit, setFit] = useState(false);
  const [onboard, setOnboard] = useState(() => !seenOnboarding());

  // צליל אחד לכל רגע. cue מחושב מהשלב, ומשתנה רק כשהשלב משתנה.
  const ph = game.phase;
  const cue: Cue | null =
    ph.name === 'station' ? 'die'
    : ph.name === 'card' ? 'card'
    : ph.name === 'stationResult' ? (ph.stationId === 'permit' && ph.passed ? 'permit' : 'stamp')
    : null;
  const cueKey =
    ph.name === 'card' ? `card:${ph.cardId}`
    : ph.name === 'stationResult' ? `res:${ph.stationId}:${ph.passed}`
    : ph.name === 'station' ? `st:${ph.stationId}`
    : 'turn';
  useEffect(() => {
    if (cue) play(cue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueKey]);
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
      <div className={`board ${game.phase.name === 'station' ? 'gated' : ''}`}>
        <div className="stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="view-switch" role="group" aria-label="תצוגה">
              <button className="btn" aria-pressed={view === 'map'} onClick={() => setView('map')}>
                לוח
              </button>
              <button className="btn" aria-pressed={view === 'sheet'} onClick={() => setView('sheet')}>
                גיליון הדרישות
              </button>
              {view === 'map' && (
                <button className="btn" aria-pressed={fit} onClick={() => setFit((f) => !f)}>
                  {fit ? 'תצוגה מלאה' : 'התאמה למסך'}
                </button>
              )}
            </div>
            <span className="mono">
              {done}/{total}
            </span>
          </div>
          {view === 'map' ? (
            <BoardMap game={game} fit={fit} />
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
      {onboard && <Onboarding onDone={() => setOnboard(false)} />}
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
              <Die value={game.lastRoll} />
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
      <div className="counter gate-open">
        {/* שלט הגורם מעל הדלפק */}
        <div className="counter-sign">
          <span className="sign-text">{st.agency ?? 'רשות הרישוי'}</span>
          <CategoryChip category={st.category} />
        </div>
        <div className="counter-window stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>{st.title}</h2>
            {game.lastRoll && <Die value={game.lastRoll} rolling small />}
          </div>
          <p>{st.prompt}</p>
          <div className="options">
            {st.options.map((o, i) => (
              <button key={o.id} className="option slip" onClick={() => act({ type: 'ANSWER', optionId: o.id })}>
                <span className="slip-no" aria-hidden="true">{String.fromCharCode(1488 + i)}</span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
          {st.kind === 'decision' ? (
            <p className="lead">זו החלטה. אין תשובה אחת נכונה, ולכל בחירה יש מחיר ותועלת.</p>
          ) : (
            player.res.shields > 0 && (
              <p className="lead">יש לכם {player.res.shields} כרטיסי ידע. טעות לא תעלה זמן.</p>
            )
          )}
        </div>
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
      <div className={`sheet stack ${!ph.passed ? 'shake' : ''}`}>
        {isPermit ? (
          <div className="certificate">
            <span className="eyebrow">רשות הרישוי · עיריית אשדוד</span>
            <h2>היתר בנייה</h2>
            <span className="seal-big">אושר</span>
            <span className="cert-line">
              {trackById(game.track)?.title} · {player.res.months} חודשים · מדד עיר {player.res.city}
            </span>
          </div>
        ) : ph.passed ? (
          <div className="row">
            <span className="stamp-wrap">
              <span className="ink" />
              <span className="stamp animate">אושר</span>
            </span>
            <span className="result-ok">{st.title}</span>
          </div>
        ) : (
          <div className="row">
            <span className="stamp reject">הוחזר לתיקון</span>
            <span className="result-no">גם האדריכל הכי טוב מגיש פעמיים.</span>
          </div>
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
        <div className={`card-face draw ${card.deck === 'responsibility' ? 'gold' : ''}`}>
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
