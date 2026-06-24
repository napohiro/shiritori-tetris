import { useCallback, useRef, useState } from 'react';
import { Board, GameState } from '../logic/types';
import {
  processTurn,
  isGameOver as checkGameOver,
  createEmptyBoard,
  saveBestScore,
  replenishHand,
  shuffleHand,
} from '../logic/gameLogic';
import { findHintCol } from '../logic/shiritori';
import ScoreBar from './ScoreBar';
import GameBoard from './GameBoard';
import ColumnSelector from './ColumnSelector';
import HandCards from './HandCards';
import PauseModal from './PauseModal';
import GameOverModal from './GameOverModal';
import ComboOverlay from './ComboOverlay';

interface Props {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onRestart: () => void;
}

function getChainLabel(matchCount: number): string {
  if (matchCount >= 5) return 'AMAZING CHAIN!';
  if (matchCount >= 4) return 'GREAT CHAIN!';
  return 'CHAIN!';
}

export default function GameScreen({ state, setState, onRestart }: Props) {
  const [processing, setProcessing] = useState(false);
  const [displayBoard, setDisplayBoard] = useState<Board>(state.board);
  const [matchedCells, setMatchedCells] = useState<[number, number][]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [chainLabel, setChainLabel] = useState('');
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (animTimer.current) clearTimeout(animTimer.current);
  };

  // =============================================
  // 手札選択
  // =============================================
  const handleCardSelect = (index: number) => {
    if (processing || state.isPaused || state.isGameOver) return;
    setState(prev => ({ ...prev, selectedHandIndex: index, hintCol: null }));
  };

  // =============================================
  // シャッフル
  // =============================================
  const handleShuffle = () => {
    if (processing || state.isPaused || state.isGameOver || state.shuffleRemaining <= 0) return;
    const { newHand, newQueue } = shuffleHand(state.wordQueue);
    setState(prev => ({
      ...prev,
      hand: newHand,
      wordQueue: newQueue,
      shuffleRemaining: prev.shuffleRemaining - 1,
      selectedHandIndex: null,
      hintCol: null,
    }));
  };

  // =============================================
  // 列選択（ブロック配置）
  // =============================================
  const handleColSelect = useCallback((col: number) => {
    if (processing || state.isPaused || state.isGameOver) return;
    if (state.selectedHandIndex === null) return;

    const word = state.hand[state.selectedHandIndex];
    const result = processTurn(state.board, col, word);
    if (!result) return; // 列が満杯

    setProcessing(true);
    setState(prev => ({ ...prev, selectedCol: col, hintCol: null }));
    setDisplayBoard(result.boardAfterDrop);
    setMatchedCells([]);
    setChainLabel('');

    // アニメーション付きで各チェーンステップを処理
    const runChain = (chainIndex: number, currentBoard: Board, accScore: number): void => {
      if (chainIndex >= result.chains.length) {
        // 全チェーン終了 → 状態を確定させる
        const newScore = state.score + accScore;
        const newBest = Math.max(state.bestScore, newScore);

        const { newHand, newQueue } = replenishHand(
          state.hand,
          state.selectedHandIndex!,
          state.wordQueue,
        );

        setState(prev => ({
          ...prev,
          board: currentBoard,
          score: newScore,
          bestScore: newBest,
          combo: result.comboCount,
          maxCombo: Math.max(prev.maxCombo, result.comboCount),
          hand: newHand,
          selectedHandIndex: null,
          wordQueue: newQueue,
          isGameOver: checkGameOver(currentBoard),
          selectedCol: null,
        }));

        if (newScore > state.bestScore) saveBestScore(newScore);

        setDisplayBoard(currentBoard);
        setMatchedCells([]);
        setChainLabel('');

        if (result.comboCount >= 2) {
          setComboCount(result.comboCount);
          setShowCombo(true);
          animTimer.current = setTimeout(() => setShowCombo(false), 1400);
        }

        setProcessing(false);
        return;
      }

      const chain = result.chains[chainIndex];

      // ① マッチしたセルを光らせる + チェーンラベル表示
      animTimer.current = setTimeout(() => {
        setChainLabel(getChainLabel(chain.matched.length));
        setMatchedCells(chain.matched);

        // ② 消去 → 重力 → 次のチェーンへ
        animTimer.current = setTimeout(() => {
          setChainLabel('');
          setMatchedCells([]);
          setDisplayBoard(chain.boardAfterGravity);
          runChain(chainIndex + 1, chain.boardAfterGravity, accScore + chain.scoreGain);
        }, 680);
      }, 150);
    };

    animTimer.current = setTimeout(() => {
      runChain(0, result.boardAfterDrop, 0);
    }, 100);
  }, [processing, state, setState]);

  // =============================================
  // ヒント
  // =============================================
  const handleHint = () => {
    if (processing || state.isPaused || state.isGameOver) return;
    const wordForHint =
      state.selectedHandIndex !== null ? state.hand[state.selectedHandIndex] : state.hand[0];
    const hint = findHintCol(state.board, wordForHint);
    setState(prev => ({ ...prev, hintCol: hint }));
  };

  // =============================================
  // ポーズ / リスタート
  // =============================================
  const handlePause = () => setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  const handleResume = () => setState(prev => ({ ...prev, isPaused: false }));

  const handleRestartFull = () => {
    clearTimer();
    setProcessing(false);
    setMatchedCells([]);
    setShowCombo(false);
    setChainLabel('');
    setDisplayBoard(createEmptyBoard());
    onRestart();
  };

  const isBlocked = processing || state.isPaused || state.isGameOver;

  return (
    <div className="game-screen">
      {/* ヘッダー */}
      <div className="game-header">
        <ScoreBar
          score={state.score}
          bestScore={state.bestScore}
          combo={state.combo}
          maxCombo={state.maxCombo}
        />
        <div className="header-actions">
          <button className="icon-btn" onClick={handleHint} title="ヒント">
            &#128161;
          </button>
          <button className="icon-btn" onClick={handlePause} title="一時停止">
            &#9208;
          </button>
        </div>
      </div>

      {/* 盤面エリア */}
      <div className="board-area">
        <GameBoard
          board={displayBoard}
          matchedCells={matchedCells}
          selectedCol={state.selectedCol}
          hintCol={state.hintCol}
        />
        {chainLabel && (
          <div className="chain-label-overlay" key={chainLabel + matchedCells.length}>
            <div className="chain-label-text">{chainLabel}</div>
          </div>
        )}
        <ComboOverlay combo={comboCount} visible={showCombo} />
      </div>

      {/* 下部コントロール */}
      <div className="bottom-area">
        <HandCards
          hand={state.hand}
          selectedIndex={state.selectedHandIndex}
          onSelect={handleCardSelect}
          shuffleRemaining={state.shuffleRemaining}
          onShuffle={handleShuffle}
          disabled={isBlocked}
        />
        <ColumnSelector
          board={state.board}
          selectedCol={state.selectedCol}
          hintCol={state.hintCol}
          onSelect={handleColSelect}
          disabled={isBlocked || state.selectedHandIndex === null}
        />
      </div>

      {/* モーダル */}
      {state.isPaused && !state.isGameOver && (
        <PauseModal onResume={handleResume} onRestart={handleRestartFull} />
      )}
      {state.isGameOver && (
        <GameOverModal
          score={state.score}
          bestScore={state.bestScore}
          maxCombo={state.maxCombo}
          onRestart={handleRestartFull}
        />
      )}
    </div>
  );
}
