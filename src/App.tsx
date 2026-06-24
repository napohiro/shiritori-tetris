import { useState } from 'react';
import { createInitialState } from './logic/gameLogic';
import { GameMode, GameState } from './logic/types';
import TopScreen from './components/TopScreen';
import GameScreen from './components/GameScreen';
import RankingModal from './components/RankingModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState('endless'));
  const [showRanking, setShowRanking] = useState(false);

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
        <TopScreen
          onStart={handleStart}
          onShowRanking={() => setShowRanking(true)}
        />
      ) : (
        <GameScreen
          state={gameState}
          setState={setGameState}
          onRestart={handleRestart}
          onTop={handleTop}
          onShowRanking={() => setShowRanking(true)}
        />
      )}

      {showRanking && (
        <RankingModal
          initialMode={gameState.mode}
          onClose={() => setShowRanking(false)}
        />
      )}
    </div>
  );
}
