import { useEffect, useMemo, useReducer, useState } from 'react';
import { content } from './content';
import { createReducer } from './engine/game';
import type { Action, GameState } from './engine/types';
import Home from './screens/Home';
import Setup from './screens/Setup';
import PathChoice from './screens/PathChoice';
import Board from './screens/Board';
import End from './screens/End';
import Glossary from './screens/Glossary';
import About from './screens/About';

const SAVE_KEY = 'bakasha-leheter:v1';

function loadSaved(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    return s?.version === 1 ? s : null;
  } catch {
    return null;
  }
}
function save(state: GameState | null) {
  try {
    if (state && state.phase.name !== 'ended') localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVE_KEY);
  } catch {
    /* אחסון לא זמין — המשחק ממשיך בזיכרון */
  }
}

type Screen = 'home' | 'setup' | 'game' | 'glossary' | 'about';

export default function App() {
  const reducer = useMemo(() => createReducer(content), []);
  const [game, dispatch] = useReducer(reducer, null as GameState | null);
  const [screen, setScreen] = useState<Screen>('home');
  const [back, setBack] = useState<Screen>('home');
  const [saved, setSaved] = useState<GameState | null>(() => loadSaved());

  useEffect(() => {
    if (game) save(game);
  }, [game]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen, game?.phase.name === 'pathChoice' ? game.phase.player : -1]);

  const act = (a: Action) => dispatch(a);
  const open = (s: Screen) => {
    setBack(screen);
    setScreen(s);
  };

  const fileNo = game ? `בקשה מס' ${String(game.rng % 100000).padStart(5, '0')}` : 'טופס פתוח';

  return (
    <div className="app">
      <header className="masthead">
        <button className="brand" onClick={() => setScreen(game && screen !== 'home' ? 'game' : 'home')}>
          בקשה להיתר
        </button>
        <span className="file-no">{fileNo}</span>
        <nav aria-label="ניווט">
          <button className="btn ghost" onClick={() => setScreen('home')}>
            פתיחה
          </button>
          <button className="btn ghost" onClick={() => open('glossary')}>
            מילון מונחים
          </button>
          <button className="btn ghost" onClick={() => open('about')}>
            מקורות ואימות
          </button>
        </nav>
      </header>

      <main>
        {screen === 'home' && (
          <Home
            canContinue={!!(game && game.phase.name !== 'ended') || !!saved}
            onNew={() => setScreen('setup')}
            onContinue={() => {
              if (!game && saved) act({ type: 'LOAD', state: saved });
              setSaved(null);
              setScreen('game');
            }}
          />
        )}
        {screen === 'setup' && (
          <Setup
            onStart={(track, names) => {
              act({ type: 'START', track, names, seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0 });
              setScreen('game');
            }}
            onCancel={() => setScreen('home')}
          />
        )}
        {screen === 'game' && game && game.phase.name === 'pathChoice' && (
          <PathChoice key={game.phase.player} game={game} act={act} />
        )}
        {screen === 'game' && game && game.phase.name === 'ended' && (
          <End game={game} onNew={() => setScreen('setup')} />
        )}
        {screen === 'game' && game && game.phase.name !== 'pathChoice' && game.phase.name !== 'ended' && (
          <Board game={game} act={act} />
        )}
        {screen === 'glossary' && <Glossary onBack={() => setScreen(back === 'glossary' ? 'home' : back)} />}
        {screen === 'about' && <About onBack={() => setScreen(back === 'about' ? 'home' : back)} />}
      </main>
    </div>
  );
}
