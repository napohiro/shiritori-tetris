import { useState } from 'react';
import { createInitialState } from './logic/gameLogic';
import { GameMode, GameState } from './logic/types';
import TopScreen from './components/TopScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState('endless'));

  const handleStart = (mode: GameMode) => {
    setGameState({ ...createInitialState(mode), screen: 'game' });
  };

  const handleRestart = () => {
    setGameState(prev => ({ ...createInitialState(prev.mode), screen: 'game' }));
  };

  const handleTop = () => {
    setGameState(prev => ({ ...prev, screen: 'top' }));
  };

  return (
    <div className="app-root">
      {gameState.screen === 'top' ? (
        <TopScreen onStart={handleStart} />
      ) : (
        <GameScreen
          state={gameState}
          setState={setGameState}
          onRestart={handleRestart}
          onTop={handleTop}
        />
      )}
    </div>
  );
}
