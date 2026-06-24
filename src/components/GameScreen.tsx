import { useCallback, useEffect, useRef, useState } from 'react';
import { Board, GameState } from '../logic/types';
import {
  processTurn,
  isGameOver as checkGameOver,
  createEmptyBoard,
  saveBestScore,
  replenishHand,
  shuffleHand,
  shouldSpawnObstacle,
  trySpawnObstacle,
  calcTimeBonus,
  calcComboTimeBonus,
  MAX_TIMED_SECONDS,
} from '../logic/gameLogic';
import { addRankingEntry } from '../logic/ranking';
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
  onTop: () => void;
  onShowRanking: () => void;
}

function getChainLabel(matchCount: number): string {
  if (matchCount >= 5) return 'AMAZING CHAIN!';
  if (matchCount >= 4) return 'GREAT CHAIN!';
  return 'CHAIN!';
}

export default function GameScreen({ state, setState, onRestart, onTop, onShowRanking }: Props) {
  const [processing, setProcessing] = useState(false);
  const [displayBoard, setDisplayBoard] = useState<Board>(state.board);
  const [matchedCells, setMatchedCells] = useState<[number, number][]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [chainLabel, setChainLabel] = useState('');
  const [breakActive, setBreakActive] = useState(false);
  const [rankPosition, setRankPosition] = useState<number | null>(null);
  const [timeBonusInfo, setTimeBonusInfo] = useState<{ bonus: number; key: number } | null>(null);
  const [timerBonusGlow, setTimerBonusGlow] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rankingSavedRef = useRef(false);
  // タイマー発火と入力処理の競合を防ぐため、ref で即時フラグ管理
  const isGameOverRef = useRef(false);

  const clearTimer = () => {
    if (animTimer.current) clearTimeout(animTimer.current);
  };

  // =============================================
  // ゲーム終了時にランキングへ保存（1回だけ）
  // =============================================
  useEffect(() => {
    if (!state.isGameOver) {
      rankingSavedRef.current = false;
      setRankPosition(null);
      return;
    }
    if (rankingSavedRef.current) return;
    rankingSavedRef.current = true;

    const rank = addRankingEntry(state.mode, {
      score: state.score,
      maxCombo: state.maxCombo,
      wordsCleared: state.wordsCleared,
      obstaclesDestroyed: state.obstaclesDestroyed,
    });
    setRankPosition(rank);
  // state.isGameOver が true になった瞬間に実行。他の値は同一レンダー内で確定済み。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isGameOver]);

  // =============================================
  // 60秒 → 3分タイマー（timed モード専用）
  // =============================================
  useEffect(() => {
    if (state.mode !== 'timed') return;
    if (state.isPaused || state.isGameOver || state.isTimeUp || state.timeRemaining <= 0) return;

    const id = setTimeout(() => {
      setState(prev => {
        if (prev.isPaused || prev.isGameOver || prev.isTimeUp || prev.timeRemaining <= 0) return prev;
        const next = prev.timeRemaining - 1;
        if (next <= 0) {
          isGameOverRef.current = true; // 入力ハンドラーが次のイベントループで読む前に即時セット
          return { ...prev, timeRemaining: 0, isTimeUp: true, isGameOver: true };
        }
        return { ...prev, timeRemaining: next };
      });
    }, 1000);

    return () => clearTimeout(id);
  }, [state.mode, state.isPaused, state.isGameOver, state.isTimeUp, state.timeRemaining, setState]);

  // =============================================
  // 手札選択
  // =============================================
  const handleCardSelect = (index: number) => {
    if (isGameOverRef.current || processing || state.isPaused || state.isGameOver) return;
    setState(prev => ({ ...prev, selectedHandIndex: index, hintCol: null }));
  };

  // =============================================
  // シャッフル
  // =============================================
  const handleShuffle = () => {
    if (isGameOverRef.current || processing || state.isPaused || state.isGameOver || state.shuffleRemaining <= 0) return;
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
  // 列選択（矢印ボタン or 列タップ — 共通処理）
  // =============================================
  const handleColSelect = useCallback((col: number) => {
    if (isGameOverRef.current || processing || state.isPaused || state.isGameOver) return;
    if (state.selectedHandIndex === null) return;

    const word = state.hand[state.selectedHandIndex];
    const result = processTurn(state.board, col, word);
    if (!result) return;

    setProcessing(true);
    setState(prev => ({ ...prev, selectedCol: col, hintCol: null }));
    setDisplayBoard(result.boardAfterDrop);
    setMatchedCells([]);
    setChainLabel('');

    const runChain = (
      chainIndex: number,
      currentBoard: Board,
      accScore: number,
      accWords: number,
      accObstacles: number,
      accTimeBonus: number,   // 各ステップで積算した時間ボーナス（秒）
    ): void => {
      if (chainIndex >= result.chains.length) {
        const newTurnsPlayed = state.turnsPlayed + 1;
        const newWordsCleared = state.wordsCleared + accWords;
        const newObstaclesDestroyed = state.obstaclesDestroyed + accObstacles;
        const newScore = state.score + accScore;
        const newBest = Math.max(state.bestScore, newScore);

        // 時間ボーナス合計（チェーンボーナス + コンボボーナス）
        const comboTimeBonus = result.comboCount >= 2 ? calcComboTimeBonus(result.comboCount) : 0;
        const totalTimeBonus = state.mode === 'timed' ? accTimeBonus + comboTimeBonus : 0;

        // おじゃまスポーン判定
        let finalBoard = currentBoard;
        if (!checkGameOver(currentBoard)) {
          if (shouldSpawnObstacle(state.mode, newScore, newTurnsPlayed, state.timeRemaining, currentBoard)) {
            const spawned = trySpawnObstacle(currentBoard);
            if (spawned) finalBoard = spawned;
          }
        }

        const { newHand, newQueue } = replenishHand(
          state.hand,
          state.selectedHandIndex!,
          state.wordQueue,
        );

        setState(prev => {
          // 時間ボーナス適用（上限210秒、0秒到達後・ゲーム終了後は加算しない）
          let newTimeRemaining = prev.timeRemaining;
          if (totalTimeBonus > 0 && prev.mode === 'timed' && prev.timeRemaining > 0 && !prev.isGameOver) {
            newTimeRemaining = Math.min(MAX_TIMED_SECONDS, prev.timeRemaining + totalTimeBonus);
          }
          return {
            ...prev,
            board: finalBoard,
            score: newScore,
            bestScore: newBest,
            combo: result.comboCount,
            maxCombo: Math.max(prev.maxCombo, result.comboCount),
            hand: newHand,
            selectedHandIndex: null,
            wordQueue: newQueue,
            // タイマーがすでに true にしていた場合は上書きしない
            isGameOver: prev.isGameOver || checkGameOver(finalBoard),
            selectedCol: null,
            turnsPlayed: newTurnsPlayed,
            wordsCleared: newWordsCleared,
            obstaclesDestroyed: newObstaclesDestroyed,
            timeRemaining: newTimeRemaining,
          };
        });

        if (newScore > state.bestScore) saveBestScore(newScore, state.mode);

        setDisplayBoard(finalBoard);
        setMatchedCells([]);
        setChainLabel('');

        // 時間ボーナス演出
        if (totalTimeBonus > 0) {
          setTimeBonusInfo({ bonus: totalTimeBonus, key: Date.now() });
          setTimerBonusGlow(true);
          setTimeout(() => {
            setTimeBonusInfo(null);
            setTimerBonusGlow(false);
          }, 1600);
        }

        if (result.comboCount >= 2) {
          setComboCount(result.comboCount);
          setShowCombo(true);
          animTimer.current = setTimeout(() => setShowCombo(false), 1400);
        }

        setProcessing(false);
        return;
      }

      const chain = result.chains[chainIndex];
      // このステップの時間ボーナス（timed モードのみ）
      const stepTimeBonus = state.mode === 'timed' ? calcTimeBonus(chain.matched.length) : 0;

      animTimer.current = setTimeout(() => {
        setChainLabel(getChainLabel(chain.matched.length));
        setMatchedCells(chain.matched);

        animTimer.current = setTimeout(() => {
          setChainLabel('');
          setMatchedCells([]);
          setDisplayBoard(chain.boardAfterGravity);

          if (chain.destroyedObstaclePositions.length > 0) {
            setBreakActive(true);
            setTimeout(() => setBreakActive(false), 700);
          }

          runChain(
            chainIndex + 1,
            chain.boardAfterGravity,
            accScore + chain.scoreGain,
            accWords + chain.matched.length,
            accObstacles + chain.destroyedObstaclePositions.length,
            accTimeBonus + stepTimeBonus,
          );
        }, 680);
      }, 150);
    };

    animTimer.current = setTimeout(() => {
      runChain(0, result.boardAfterDrop, 0, 0, 0, 0);
    }, 100);
  }, [processing, state, setState]);

  // =============================================
  // ヒント
  // =============================================
  const handleHint = () => {
    if (isGameOverRef.current || processing || state.isPaused || state.isGameOver) return;
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
    isGameOverRef.current = false;
    clearTimer();
    setProcessing(false);
    setMatchedCells([]);
    setShowCombo(false);
    setChainLabel('');
    setBreakActive(false);
    setTimeBonusInfo(null);
    setTimerBonusGlow(false);
    setDisplayBoard(createEmptyBoard());
    onRestart();
  };

  const handleTop = () => {
    isGameOverRef.current = false;
    clearTimer();
    setProcessing(false);
    setMatchedCells([]);
    setShowCombo(false);
    setChainLabel('');
    setBreakActive(false);
    setTimeBonusInfo(null);
    setTimerBonusGlow(false);
    setDisplayBoard(createEmptyBoard());
    onTop();
  };

  const isBlocked = processing || state.isPaused || state.isGameOver;
  // 列タップを有効にする条件：カード選択済み・操作可能
  const colTapEnabled = !isBlocked && state.selectedHandIndex !== null;

  return (
    <div className="game-screen">
      {/* ヘッダー */}
      <div className="game-header">
        <ScoreBar
          score={state.score}
          bestScore={state.bestScore}
          combo={state.combo}
          maxCombo={state.maxCombo}
          mode={state.mode}
          timeRemaining={state.timeRemaining}
          timerBonusGlow={timerBonusGlow}
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
          onColTap={colTapEnabled ? handleColSelect : undefined}
        />
        {chainLabel && (
          <div className="chain-label-overlay" key={chainLabel + matchedCells.length}>
            <div className="chain-label-text">{chainLabel}</div>
          </div>
        )}
        {breakActive && (
          <div className="break-label-overlay" key={`break-${Date.now()}`}>
            <div className="break-label-text">BREAK! +500</div>
          </div>
        )}
        {timeBonusInfo && (
          <div className="time-bonus-overlay" key={timeBonusInfo.key}>
            <span className="time-bonus-text">+{timeBonusInfo.bonus} SEC</span>
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
          mode={state.mode}
          isTimeUp={state.isTimeUp}
          wordsCleared={state.wordsCleared}
          obstaclesDestroyed={state.obstaclesDestroyed}
          rankPosition={rankPosition}
          onRestart={handleRestartFull}
          onTop={handleTop}
          onShowRanking={onShowRanking}
        />
      )}
    </div>
  );
}
