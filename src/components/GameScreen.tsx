import { useCallback, useRef, useState } from 'react';
import { GameState, Board } from '../logic/types';
import {
  processTurn,
  isGameOver as checkGameOver,
  createInitialState,
} from '../logic/gameLogic';
import { findHintCol } from '../logic/shiritori';
import { createWordQueue } from '../logic/words';
import ScoreBar from './ScoreBar';
import GameBoard from './GameBoard';
import ColumnSelector from './ColumnSelector';
import NextWordCard from './NextWordCard';
import PauseModal from './PauseModal';
import GameOverModal from './GameOverModal';
import ComboOverlay from './ComboOverlay';

interface Props {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onRestart: () => void;
}

export default function GameScreen({ state, setState, onRestart }: Props) {
  const [processing, setProcessing] = useState(false);
  const [displayBoard, setDisplayBoard] = useState<Board>(state.board);
  const [matchedCells, setMatchedCells] = useState<[number, number][]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (animTimer.current) clearTimeout(animTimer.current);
  };

  const handleColSelect = useCallback((col: number) => {
    if (processing || state.isPaused || state.isGameOver) return;

    const result = processTurn(state.board, col, state.currentWord);
    if (!result) return; // column full

    setProcessing(true);
    setState(prev => ({ ...prev, selectedCol: col, hintCol: null }));

    // Step 1: show block placed
    setDisplayBoard(result.boardAfterDrop);
    setMatchedCells([]);

    const runChain = (chainIndex: number, currentBoard: Board, accScore: number) => {
      if (chainIndex >= result.chains.length) {
        // All chains done
        const newScore = state.score + accScore;
        const newBest = Math.max(state.bestScore, newScore);

        // Get next words
        let queue = [...state.wordQueue];
        let nextCurrent = state.nextWord;
        let nextNext = queue[0] || '';
        queue = queue.slice(1);
        if (queue.length < 10) {
          queue = [...queue, ...createWordQueue()];
          nextNext = queue[0] || '';
          queue = queue.slice(1);
        }

        const gameOver = checkGameOver(currentBoard);

        setState(prev => ({
          ...prev,
          board: currentBoard,
          score: newScore,
          bestScore: newBest,
          combo: result.comboCount,
          maxCombo: Math.max(prev.maxCombo, result.comboCount),
          currentWord: nextCurrent,
          nextWord: nextNext,
          wordQueue: queue,
          isGameOver: gameOver,
          selectedCol: null,
        }));

        setDisplayBoard(currentBoard);
        setMatchedCells([]);

        if (result.comboCount >= 2) {
          setComboCount(result.comboCount);
          setShowCombo(true);
          animTimer.current = setTimeout(() => setShowCombo(false), 1200);
        }

        setProcessing(false);
        return;
      }

      const chain = result.chains[chainIndex];

      // Show matched cells
      animTimer.current = setTimeout(() => {
        setMatchedCells(chain.matched);

        // Remove and apply gravity
        animTimer.current = setTimeout(() => {
          setMatchedCells([]);
          setDisplayBoard(chain.boardAfterGravity);
          runChain(chainIndex + 1, chain.boardAfterGravity, accScore + chain.scoreGain);
        }, 550);
      }, 300);
    };

    animTimer.current = setTimeout(() => {
      runChain(0, result.boardAfterDrop, 0);
    }, 150);
  }, [processing, state, setState]);

  const handleHint = () => {
    if (processing || state.isPaused || state.isGameOver) return;
    const hint = findHintCol(state.board, state.currentWord);
    setState(prev => ({ ...prev, hintCol: hint }));
  };

  const handlePause = () => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleResume = () => {
    setState(prev => ({ ...prev, isPaused: false }));
  };

  const handleRestartFull = () => {
    clearTimer();
    setProcessing(false);
    setMatchedCells([]);
    setShowCombo(false);
    const fresh = { ...createInitialState(), screen: 'game' as const, bestScore: state.bestScore };
    setState(fresh);
    setDisplayBoard(fresh.board);
    onRestart();
  };

  return (
    <div className="game-screen">
      {/* Header */}
      <div className="game-header">
        <ScoreBar score={state.score} bestScore={state.bestScore} combo={state.combo} />
        <div className="header-actions">
          <button className="icon-btn hint-btn" onClick={handleHint} title="ヒント">
            💡
          </button>
          <button className="icon-btn pause-btn" onClick={handlePause} title="一時停止">
            ⏸
          </button>
        </div>
      </div>

      {/* Board area */}
      <div className="board-area">
        <GameBoard
          board={displayBoard}
          matchedCells={matchedCells}
          selectedCol={state.selectedCol}
          hintCol={state.hintCol}
        />
        <ComboOverlay combo={comboCount} visible={showCombo} />
      </div>

      {/* Bottom controls */}
      <div className="bottom-area">
        <NextWordCard currentWord={state.currentWord} nextWord={state.nextWord} />
        <ColumnSelector
          board={state.board}
          selectedCol={state.selectedCol}
          hintCol={state.hintCol}
          onSelect={handleColSelect}
        />
      </div>

      {/* Modals */}
      {state.isPaused && !state.isGameOver && (
        <PauseModal onResume={handleResume} onRestart={handleRestartFull} />
      )}
      {state.isGameOver && (
        <GameOverModal
          score={state.score}
          bestScore={state.bestScore}
          onRestart={handleRestartFull}
        />
      )}
    </div>
  );
}
