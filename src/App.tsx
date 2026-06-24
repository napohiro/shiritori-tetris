import { useState } from 'react';
import { createInitialState } from './logic/gameLogic';
import { GameState } from './logic/types';
import TopScreen from './components/TopScreen';
import GameScreen from './components/GameScreen';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);

  const handleStart = () => {
    setGameState(prev => ({ ...prev, screen: 'game' }));
  };

  const handleRestart = () => {
    setGameState({ ...createInitialState(), screen: 'game', bestScore: gameState.bestScore });
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
        />
      )}
    </div>
  );
}
