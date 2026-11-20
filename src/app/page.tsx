'use client';

// World는 내부 값이 바뀌는 객체라 state에 한 번만 넣고, 다시 그리기는 GameState 변경으로 일으킨다
import { useEffect, useState } from 'react';
import { World } from '@/engine';
import { newGame, nextDay, tryMate, type Difficulty, type GameState } from '@/game/game';
import { loadGame, saveGame } from '@/game/storage';
import TitleScreen from '@/components/TitleScreen';
import FarmScreen from '@/components/FarmScreen';

type Screen = 'loading' | 'title' | 'farm';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [state, setState] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(null);
  const [world, setWorld] = useState<World | null>(null);

  useEffect(() => {
    loadGame().then((s) => {
      setSaved(s);
      setScreen('title');
    });
  }, []);

  const commit = (next: GameState) => {
    setState(next);
    setSaved(next);
    void saveGame(next);
  };

  const start = (farmName: string, difficulty: Difficulty) => {
    const { state: s, world } = newGame(farmName, difficulty);
    setWorld(world);
    commit(s);
    setScreen('farm');
  };

  const resume = () => {
    if (!saved) return;
    setWorld(World.load(saved.world));
    setState(saved);
    setScreen('farm');
  };

  if (screen === 'loading') return <main id="main" aria-busy="true" className="flex flex-1 items-center justify-center text-mute">불러오는 중…</main>;

  if (screen === 'title' || !state || !world) {
    return <TitleScreen hasSave={!!saved} onContinue={resume} onNewGame={start} />;
  }

  return (
    <FarmScreen
      state={state}
      world={world}
      onNextDay={() => commit(nextDay(state, world))}
      onMate={(m, f) => commit(tryMate(state, world, m, f).state)}
      onTitle={() => setScreen('title')}
    />
  );
}
