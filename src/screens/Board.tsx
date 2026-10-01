import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cardById, pathById, plotById, stationById, trackById } from '../content';
import BoardMap, { PAWN, Shape, useBoardMode, useReducedMotion } from './BoardMap';
import Die, { FACE_LABEL } from './Die';
import CardView from './CardView';
import Timeline from './Timeline';
import Onboarding, { seenOnboarding } from './Onboarding';
import Economics from './Economics';
import { seededOrder } from './shuffle';
import { stationShape } from './boardLayout';
import { timelineModel } from './timelineModel';
import { MOTION } from './motion';
import { play, type Cue } from '../sound';
import { isOnOpenStation, TABU_VALID_MONTHS } from '../engine/game';
import type { Action, GameState, JournalEntry, Player, Resources, Square } from '../engine/types';
import { CATEGORY_LABEL, CategoryChip, DECK_LABEL, EffectList, SourceLine } from '../components/common';

interface Props {
  game: GameState;
  act: (a: Action) => void;
}

/** הטלה בעיצומה: הקובייה מתגלגלת והכלי הולך, ורק אז נחשף מה שמחכה */
interface Rolling {
  pid: number;
  from: number;
  /** המשאבים לפני ההטלה — מוצגים עד שהכרטיס נחשף */
  res: Resources;
  /** אורך היומן לפני ההטלה — שורה חדשה נכתבת רק כשהכרטיס נחשף */
  jlen: number;
  /** מתי הקובייה הוטלה */
  t0: number;
}

export default function Board({ game, act }: Props) {
  const player = game.players[game.current];
  const plot = plotById(player.plotId)!;
  const mode = useBoardMode();
  const reduced = useReducedMotion();
  const [view, setView] = useState<'map' | 'sheet'>('map');
  const [fit, setFit] = useState(false);
  const [onboard, setOnboard] = useState(() => !seenOnboarding());
  const [rolling, setRolling] = useState<Rolling | null>(null);
  const [focus, setFocus] = useState<number | null>(null);

  // מספור התחנות במסלול: אותו מספר בלוח, בגיליון, ביומן ובציר הזמן
  const stationNo = useMemo(() => {
    const out: Record<string, number> = {};
    let n = 0;
    for (const sq of player.route) if (sq.type === 'station' && sq.stationId) out[sq.stationId] = ++n;
    return out;
  }, [player.route]);

  // סוף ההטלה: כשהכלי באמת הגיע ליעד (BoardMap מודיע), ולא לפני שהקובייה נחתה.
  // שעון הגיבוי משחרר את המסך גם אם הלוח מוסתר (תצוגת הגיליון).
  const settle = () => {
    if (!rolling) return;
    const wait = Math.max(0, rolling.t0 + MOTION.die + 220 - Date.now());
    window.setTimeout(() => setRolling((r) => (r === rolling ? null : r)), wait);
  };
  useEffect(() => {
    if (!rolling) return;
    const to = game.players.find((p) => p.id === rolling.pid)?.position ?? rolling.from;
    const ms = MOTION.die + Math.max(0, to - rolling.from) * MOTION.step + (view === 'map' ? 2500 : 260);
    const t = window.setTimeout(() => setRolling((r) => (r === rolling ? null : r)), ms);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolling]);

  const roll = () => {
    if (isOnOpenStation(player)) {
      act({ type: 'ROLL' });
      return;
    }
    play('die');
    if (!reduced) setRolling({ pid: player.id, from: player.position, res: player.res, jlen: player.journal?.length ?? 0, t0: Date.now() });
    act({ type: 'ROLL' });
  };

  // צליל אחד לכל רגע, ורק אחרי שהרגע נחשף
  const ph = game.phase;
  const cue: Cue | null = rolling
    ? null
    : ph.name === 'card'
      ? 'card'
      : ph.name === 'stationResult'
        ? ph.stationId === 'permit' && ph.passed
          ? 'permit'
          : ph.passed
            ? 'stamp'
            : 'reject'
        : null;
  const cueKey = rolling
    ? 'rolling'
    : ph.name === 'card'
      ? `card:${ph.cardId}:${game.rng}`
      : ph.name === 'stationResult'
        ? `res:${ph.stationId}:${ph.passed}:${game.rng}:${player.res.months}`
        : ph.name;
  useEffect(() => {
    if (cue) play(cue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cueKey]);

  const done = player.resolved.filter((id) => player.route.some((q) => q.stationId === id)).length;
  const total = player.route.filter((q) => q.type === 'station').length;
  const shownRes = rolling && rolling.pid === player.id ? rolling.res : player.res;

  return (
    <section className="game">
      <div className="game-head">
        <span className="eyebrow">
          {trackById(game.track)?.title} · {plot.name} · דרך: {player.path ? pathById(player.path)?.title : ''}
        </span>
        {game.players.length > 1 && <PlayerTags game={game} />}
      </div>
      <div className={`board ${ph.name === 'station' && !rolling ? 'gated' : ''}`}>
        <div className="board-main">
          <div className="board-tools">
            <div className="view-switch" role="group" aria-label="תצוגה">
              <button className="btn tab" aria-pressed={view === 'map'} onClick={() => setView('map')}>
                לוח
              </button>
              <button className="btn tab" aria-pressed={view === 'sheet'} onClick={() => setView('sheet')}>
                גיליון הדרישות
              </button>
              {view === 'map' && (
                <button className="btn tab" aria-pressed={fit} onClick={() => setFit((f) => !f)}>
                  {fit ? 'תצוגה מלאה' : 'התאמה למסך'}
                </button>
              )}
            </div>
            <span className="progress-count" aria-label={`אושרו ${done} מתוך ${total} תחנות`}>
              <span className="pc-bar" aria-hidden="true">
                <span style={{ width: `${(done / Math.max(total, 1)) * 100}%` }} />
              </span>
              {done}/{total}
            </span>
          </div>
          <div className="sheetframe">
            {view === 'map' ? (
              <BoardMap game={game} fit={fit} holdMs={rolling ? MOTION.die : 0} focus={focus} onFocus={setFocus} onSettled={settle} />
            ) : (
              <div className="sheet-list stack">
                <h3>גיליון הדרישות של {player.name}</h3>
                <Route player={player} />
              </div>
            )}
            <TitleBlock key={player.id} player={player} res={shownRes} game={game} done={done} total={total} />
          </div>
          <Timeline player={player} mode={mode} focus={focus} onFocus={setFocus} stationNo={stationNo} upTo={rolling && rolling.pid === player.id ? rolling.jlen : null} />
        </div>
        <div className="panel">
          {rolling ? (
            <RollStage game={game} rolling={rolling} stationNo={stationNo} />
          ) : (
            <Panel game={game} act={act} player={player} onRoll={roll} stationNo={stationNo} />
          )}
        </div>
        <div className="journal-wrap">
          <Journal player={player} focus={focus} onFocus={setFocus} stationNo={stationNo} upTo={rolling && rolling.pid === player.id ? rolling.jlen : null} />
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
            <span className="pt-disc" style={{ background: PAWN[i % PAWN.length] }} aria-hidden="true" />
            {p.name} · {p.finished ? `היתר (${p.finishOrder})` : `${done}/${total}`}
          </span>
        );
      })}
    </div>
  );
}

/**
 * טבלת השרטוט: בפינת כל גיליון אדריכלי יש טבלה עם פרטי הפרויקט.
 * כאן היא מחזיקה את המשאבים, וכל שינוי "נכתב" בה עם הפרש שעולה וחולף.
 */
function TitleBlock({ player, res, game, done, total }: { player: Player; res: Resources; game: GameState; done: number; total: number }) {
  const tabuLeft =
    player.tabuAt === null ? null : Math.min(TABU_VALID_MONTHS, TABU_VALID_MONTHS - (res.months - player.tabuAt));
  return (
    <div className="titleblock" aria-label="משאבים">
      <div className="tb-id">
        <span className="tb-k">מבקש/ת</span>
        <span className="tb-name">{player.name}</span>
        <span className="tb-meta">
          {trackById(game.track)?.title} · גיליון {String(done).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </span>
      </div>
      <Cell k="תקציב" v={res.budget} good="up" meter={Math.max(0, Math.min(1, res.budget / 100))} />
      <Cell k="חודשים" v={res.months} good="down" />
      <Cell k="אמון שכנים" v={res.trust} good="up" />
      <Cell k="מדד עיר" v={res.city} good="up" />
      <Cell
        k={tabuLeft === null ? 'כרטיסי ידע' : 'ידע · טאבו'}
        v={res.shields}
        good="up"
        extra={tabuLeft !== null ? <span className={`tb-tabu ${tabuLeft <= 1 ? 'low' : ''}`}>טאבו {Math.max(tabuLeft, 0)} ח׳</span> : null}
      />
    </div>
  );
}

function Cell({ k, v, good, meter, extra }: { k: string; v: number; good: 'up' | 'down'; meter?: number; extra?: ReactNode }) {
  const prev = useRef(v);
  const [delta, setDelta] = useState<{ n: number; key: number } | null>(null);
  useEffect(() => {
    if (v !== prev.current) {
      setDelta({ n: v - prev.current, key: Date.now() });
      prev.current = v;
    }
  }, [v]);
  const tone = delta ? ((delta.n > 0) === (good === 'up') ? 'good' : 'bad') : '';
  return (
    <div className={`tb-cell ${delta ? `changed ${tone}` : ''}`} key={delta?.key}>
      <span className="tb-k">{k}</span>
      <span className="tb-v">
        {v}
        {delta && (
          <span className={`tb-delta ${tone}`} aria-hidden="true">
            {delta.n > 0 ? '+' : '−'}
            {Math.abs(delta.n)}
          </span>
        )}
      </span>
      {meter !== undefined && (
        <span className="tb-meter" aria-hidden="true">
          <span style={{ width: `${meter * 100}%` }} />
        </span>
      )}
      {extra}
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
                    <span key={f.index} className={`tick deck-${f.sq.type} ${f.index === player.position ? 'here' : ''}`}
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

/** בזמן ההטלה: הקובייה מתגלגלת, ואז נאמר לאן הכלי הולך ולמה */
function RollStage({ game, rolling, stationNo }: { game: GameState; rolling: Rolling; stationNo: Record<string, number> }) {
  const p = game.players.find((x) => x.id === rolling.pid)!;
  const steps = p.position - rolling.from;
  const sq = p.route[p.position];
  const st = sq?.type === 'station' ? stationById(sq.stationId!) : null;
  const face = game.lastRoll;
  return (
    <div className="roll-tray stage" aria-live="polite">
      <span className="eyebrow">הטלת קובייה</span>
      <div className="roll-die">
        <Die value={face} rolling bare />
      </div>
      {face && (
        <div className="stage-out">
          <p className="stage-face">יצא: {FACE_LABEL[face]}</p>
          <p className="stage-path">
            {steps > 0 ? `${steps} ${steps === 1 ? 'משבצת' : 'משבצות'} קדימה, ` : ''}
            {st
              ? face === 'station'
                ? `ישר לתחנה ${String(stationNo[st.id]).padStart(2, '0')}: ${st.title}`
                : `עד התחנה הבאה. ${st.title} חוסמת את הדרך.`
              : sq && sq.type !== 'station'
                ? `אל ${DECK_LABEL[sq.type]}`
                : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function Panel({ game, act, player, onRoll, stationNo }: Props & { player: Player; onRoll: () => void; stationNo: Record<string, number> }) {
  const ph = game.phase;
  const multi = game.players.length > 1;
  const total = Object.keys(stationNo).length;

  if (ph.name === 'turn') {
    const open = isOnOpenStation(player);
    const st = open ? stationById(player.route[player.position].stationId!) : null;
    return (
      <div className="roll-tray">
        {multi && <span className="eyebrow">התור של {player.name}</span>}
        {open && st ? (
          <>
            <span className="eyebrow">ממתין בתחנה {String(stationNo[st.id]).padStart(2, '0')}</span>
            <h2>{st.title}</h2>
            <p>התחנה הזו היא שער. כדי להמשיך צריך לעבור אותה.</p>
            <button className="btn primary big" onClick={onRoll}>לתחנה</button>
          </>
        ) : (
          <>
            <div className="roll-die">
              <Die value={null} bare />
            </div>
            <p className="roll-hint">
              הקובייה מראה סוג משבצת. הכלי מתקדם עד המשבצת הקרובה מאותו סוג, ועוצר בתחנה הבאה גם אם לא הגיע.
            </p>
            <button className="btn primary big" onClick={onRoll}>הטלת קובייה</button>
          </>
        )}
      </div>
    );
  }

  if (ph.name === 'station') {
    const st = stationById(ph.stationId)!;
    return (
      <div className="counter gate-open">
        {/* שלט הגורם מעל הדלפק, עם אותה צורה שמסמנת את התחנה בלוח */}
        <div className="counter-sign">
          <svg viewBox="-24 -24 48 48" className={`sign-glyph station cat-${st.category}`} aria-hidden="true">
            <Shape shape={stationShape(st.id, st.agency)} />
          </svg>
          <span className="sign-text">
            <span className="sign-no">תחנה {String(stationNo[st.id]).padStart(2, '0')} מתוך {String(total).padStart(2, '0')}</span>
            {st.agency ?? 'רשות הרישוי'}
          </span>
          <CategoryChip category={st.category} />
        </div>
        <div className="counter-window stack">
          <h2>{st.title}</h2>
          <p className="prompt">{st.prompt}</p>
          <div className="options">
            {seededOrder(st.options, st.id, game.rng).map((o, i) => (
              <button key={o.id} className="option slip" onClick={() => act({ type: 'ANSWER', optionId: o.id })}
                style={{ animationDelay: `${120 + i * 60}ms` }}>
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
      <div className={`sheet result stack ${!ph.passed ? 'shake' : ''}`}>
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
          <div className="result-head">
            <span className="stamp-wrap">
              <span className="ink" />
              <span className="stamp big animate">אושר</span>
            </span>
            <span className="result-ok">
              <span className="sign-no">תחנה {String(stationNo[st.id]).padStart(2, '0')}</span>
              {st.title}
            </span>
          </div>
        ) : (
          <div className="result-head">
            <span className="stamp-wrap reject">
              <span className="ink" />
              <span className="stamp big reject">הוחזר לתיקון</span>
            </span>
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
        <Economics stationId={st.id} />
        <button className="btn primary big" onClick={() => act({ type: 'CONTINUE' })} autoFocus>
          {isPermit ? 'לסיכום' : multi ? 'העברת התור' : 'המשך'}
        </button>
      </div>
    );
  }

  if (ph.name === 'card') {
    const card = cardById(ph.cardId)!;
    return (
      <div className="roll-tray card-stage">
        {game.lastRoll && (
          <div className="card-cause">
            <Die value={game.lastRoll} small bare />
            <span>
              הקובייה הראתה {FACE_LABEL[game.lastRoll]}, והכלי נחת על {DECK_LABEL[card.deck]}.
            </span>
          </div>
        )}
        <CardView card={card} />
        {ph.notes.map((n, i) => (
          <div className="note" key={i}>{n}</div>
        ))}
        <SourceLine meta={card.meta} />
        <button className="btn primary big" onClick={() => act({ type: 'CONTINUE' })} autoFocus>
          {multi ? 'העברת התור' : 'המשך'}
        </button>
      </div>
    );
  }
  return null;
}

const KIND_TEXT: Record<JournalEntry['kind'], string> = {
  pass: 'אושר',
  reject: 'הוחזר לתיקון',
  shielded: 'כרטיס ידע ביטל קנס',
  card: 'כרטיס',
  tabuRenewed: 'נסח טאבו פג וחודש',
};

/**
 * יומן העבודה: כל אירוע עם החודש שבו קרה, ומה שהוא תלוי בו.
 * מעבר עם העכבר על שורה מסמן את המשבצת שלה בלוח ובציר הזמן.
 */
function Journal({ player, focus, onFocus, stationNo, upTo }: {
  player: Player;
  focus: number | null;
  onFocus: (at: number | null) => void;
  stationNo: Record<string, number>;
  upTo: number | null;
}) {
  const j = player.journal;
  if (!j) {
    // משחק שמור מגרסה קודמת: רק השורות הטקסטואליות
    if (!player.log.length) return null;
    return (
      <div className="journal">
        <span className="journal-title">יומן העבודה</span>
        <ol className="log" reversed>
          {[...player.log].reverse().slice(0, 12).map((l, i) => <li key={i}>{l}</li>)}
        </ol>
      </div>
    );
  }
  const shown = upTo === null ? j : j.slice(0, upTo);
  if (!shown.length) {
    return (
      <div className="journal">
        <span className="journal-title">יומן העבודה</span>
        <p className="journal-empty">היומן ריק. כל כרטיס וכל תחנה ייכתבו כאן, עם החודש שבו קרו.</p>
      </div>
    );
  }
  const model = timelineModel(shown, TABU_VALID_MONTHS, player.res.months);
  const tabuTitle = stationById('survey-tabu')?.title ?? 'נסח טאבו';

  return (
    <div className="journal">
      <span className="journal-title">יומן העבודה</span>
      <ol className="jr-list">
        {shown
          .map((e, i) => ({ e, i }))
          .reverse()
          .map(({ e, i }) => {
            const st = e.kind !== 'card' ? stationById(e.ref) : null;
            const card = e.kind === 'card' ? cardById(e.ref) : null;
            const win = [...model.windows].reverse().find((w) => w.start <= e.to);
            let dep: string | null = null;
            if (e.kind === 'tabuRenewed') dep = `תלוי ב${tabuTitle}: הנסח תקף ${TABU_VALID_MONTHS} חודשים בלבד, ופג לפני הבדיקה.`;
            else if (e.kind === 'pass' && (e.ref === 'submission' || e.ref === 'permit') && win && !shown[i + 1]?.kind?.startsWith('tabu'))
              dep = `נבדק מול ${tabuTitle} מחודש ${win.start}. עדיין בתוקף.`;
            const delta = { ...e.delta };
            delete delta.months;
            return (
              <li
                key={i}
                className={`jr ${e.kind} ${card ? `deck-${card.deck}` : `cat-${st?.category ?? 'process'}`} ${focus === e.at ? 'hot' : ''} ${i === shown.length - 1 ? 'newest' : ''}`}
                tabIndex={0}
                onMouseEnter={() => onFocus(e.at)}
                onMouseLeave={() => onFocus(null)}
                onFocus={() => onFocus(e.at)}
                onBlur={() => onFocus(null)}
              >
                <span className="jr-month">
                  <span className="jr-m">{e.to}</span>
                  <span className="jr-u">{e.to !== e.from ? `מ־${e.from}` : 'חודש'}</span>
                </span>
                <span className="jr-dot" aria-hidden="true" />
                <span className="jr-body">
                  <span className="jr-kind">
                    {card ? DECK_LABEL[card.deck] : `${KIND_TEXT[e.kind]} · תחנה ${String(stationNo[e.ref] ?? 0).padStart(2, '0')}`}
                  </span>
                  <span className="jr-title">{card?.title ?? st?.title ?? e.ref}</span>
                  {dep && <span className="jr-dep">{dep}</span>}
                  <EffectList effects={delta} />
                </span>
              </li>
            );
          })}
      </ol>
    </div>
  );
}

function withoutMonths(e?: { months?: number }) {
  if (!e) return {};
  const { months: _m, ...rest } = e;
  return rest;
}
