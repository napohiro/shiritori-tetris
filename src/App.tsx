import { useState } from 'react';
import { createInitialState } from './logic/gameLogic';
import { GameMode, GameState } from './logic/types';
import TopScreen from './components/TopScreen';
import GameScreen from './components/GameScreen';
import RankingModal from './components/RankingModal';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState('timed'));
  const [showRanking, setShowRanking] = useState(false);
  const [gameKey, setGameKey] = useState(0); // GameScreen を強制リマウントするためのキー

  const handleStart = (mode: GameMode) => {
    setGameKey(k => k + 1);
    setGameState({ ...createInitialState(mode), screen: 'game' });
  };

  const handleRestart = () => {
    setGameKey(k => k + 1);
    setGameState({ ...createInitialState(gameState.mode), screen: 'game' });
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
          key={gameKey}
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
