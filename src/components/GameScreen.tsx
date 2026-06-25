import { useCallback, useEffect, useRef, useState } from 'react';
import { Board, COLS, GameState, ROWS } from '../logic/types';
import {
  processTurn,
  isGameOver as checkGameOver,
  createEmptyBoard,
  saveBestScore,
  shouldSpawnObstacle,
  trySpawnObstacle,
  calcTimeBonus,
  calcComboTimeBonus,
  MAX_TIMED_SECONDS,
} from '../logic/gameLogic';
import { addRankingEntry } from '../logic/ranking';
import { assignColor, createWordQueue, WORD_LIST } from '../logic/words';
import ScoreBar from './ScoreBar';
import GameBoard from './GameBoard';
import PauseModal from './PauseModal';
import GameOverModal from './GameOverModal';
import ComboOverlay from './ComboOverlay';

// =============================================
// 型定義
// =============================================

export interface FallingBlock {
  col: number;
  row: number;
  word: string;
  color: string;
}

interface Props {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onRestart: () => void;
  onTop: () => void;
  onShowRanking: () => void;
}

// =============================================
// ヘルパー
// =============================================

const FAST_FALL_MS = 60;

function calcFallSpeed(timeRemaining: number): number {
  const elapsed = Math.max(0, 180 - timeRemaining);
  return Math.max(250, 800 - Math.floor(elapsed / 30) * 100);
}

function getChainLabel(matchCount: number): string {
  if (matchCount >= 5) return 'AMAZING CHAIN!';
  if (matchCount >= 4) return 'GREAT CHAIN!';
  return 'CHAIN!';
}

// =============================================
// コンポーネント
// =============================================

export default function GameScreen({ state, setState, onRestart, onTop, onShowRanking }: Props) {
  // ─── 落下ブロック状態 ───
  const [fallingBlock, setFallingBlock] = useState<FallingBlock | null>(null);
  const fallingBlockRef = useRef<FallingBlock | null>(null);

  // ─── 次の言葉 ───
  const [nextWord, setNextWord] = useState<string>('');
  const nextWordRef = useRef<string>('');

  // ─── 高速落下 ───
  const [fastFall, setFastFall] = useState(false);
  const fastFallRef = useRef(false);

  // ─── 単語キュー（コンポーネントローカル） ───
  const wordQueueRef = useRef<string[]>([]);

  // ─── アニメーション用 ───
  const [displayBoard, setDisplayBoard] = useState<Board>(state.board);
  const [matchedCells, setMatchedCells] = useState<[number, number][]>([]);
  const [showCombo, setShowCombo] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [chainLabel, setChainLabel] = useState('');
  const [breakActive, setBreakActive] = useState(false);
  const [rankPosition, setRankPosition] = useState<number | null>(null);
  const [timeBonusInfo, setTimeBonusInfo] = useState<{ bonus: number; key: number } | null>(null);
  const [timerBonusGlow, setTimerBonusGlow] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showTutorial, setShowTutorial] = useState(true);

  // ─── Refs ───
  const boardRef = useRef<Board>(state.board);
  const stateRef = useRef(state);
  const isGameOverRef = useRef(false);
  const processingRef = useRef(false);
  const rankingSavedRef = useRef(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRemainingRef = useRef(state.timeRemaining);
  const initializedRef = useRef(false);

  // ─── Ref 同期 ───
  useEffect(() => { boardRef.current = state.board; }, [state.board]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { timeRemainingRef.current = state.timeRemaining; }, [state.timeRemaining]);

  // ─── ユーティリティ: キューから単語を取り出す ───
  const shiftWord = (): string => {
    if (wordQueueRef.current.length < 5) {
      wordQueueRef.current = [...wordQueueRef.current, ...createWordQueue()];
    }
    return wordQueueRef.current.shift()!;
  };

  // ─── スポーン（内部）───
  const spawnBlock = useCallback((boardAfterChains: Board) => {
    if (isGameOverRef.current) return;

    if (checkGameOver(boardAfterChains)) {
      isGameOverRef.current = true;
      setState(prev => ({ ...prev, isGameOver: true }));
      return;
    }

    const word = nextWordRef.current || shiftWord();
    const newNext = shiftWord();
    nextWordRef.current = newNext;
    setNextWord(newNext);

    // スポーン列：中央から左右に広げて空き列を探す
    const center = Math.floor(COLS / 2);
    let spawnCol = -1;
    for (let offset = 0; offset < COLS; offset++) {
      const left = center - offset;
      const right = center + offset;
      if (left >= 0 && boardAfterChains[0][left] === null) { spawnCol = left; break; }
      if (right < COLS && boardAfterChains[0][right] === null) { spawnCol = right; break; }
    }

    if (spawnCol === -1) {
      isGameOverRef.current = true;
      setState(prev => ({ ...prev, isGameOver: true }));
      return;
    }

    const newBlock: FallingBlock = { col: spawnCol, row: 0, word, color: assignColor() };
    setFallingBlock(newBlock);
    fallingBlockRef.current = newBlock;
  }, [setState]);

  // ─── 初期化（マウント時1回） ───
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 単語キューを初期化
    wordQueueRef.current = [...state.wordQueue];
    while (wordQueueRef.current.length < 20) {
      wordQueueRef.current = [...wordQueueRef.current, ...createWordQueue()];
    }

    // 最初の2語を確保
    const firstWord = shiftWord();
    const secondWord = shiftWord();
    nextWordRef.current = secondWord;
    setNextWord(secondWord);

    // 1語目でブロックをスポーン
    const startCol = Math.floor(COLS / 2);
    const newBlock: FallingBlock = { col: startCol, row: 0, word: firstWord, color: assignColor() };
    setFallingBlock(newBlock);
    fallingBlockRef.current = newBlock;

    // チュートリアルヒントを3秒後に消す
    const tid = setTimeout(() => setShowTutorial(false), 3500);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =============================================
  // ランキング保存（ゲーム終了時1回）
  // =============================================
  useEffect(() => {
    if (!state.isGameOver) {
      rankingSavedRef.current = false;
      setRankPosition(null);
      return;
    }
    if (rankingSavedRef.current) return;
    rankingSavedRef.current = true;

    const rank = addRankingEntry({
      score: state.score,
      maxCombo: state.maxCombo,
      wordsCleared: state.wordsCleared,
      obstaclesDestroyed: state.obstaclesDestroyed,
      wordChanges: state.wordChanges,
    });
    setRankPosition(rank);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isGameOver]);

  // =============================================
  // タイマー（3分チャレンジ）
  // =============================================
  useEffect(() => {
    if (state.isPaused || state.isGameOver || state.isTimeUp || state.timeRemaining <= 0) return;

    const id = setTimeout(() => {
      setState(prev => {
        if (prev.isPaused || prev.isGameOver || prev.isTimeUp || prev.timeRemaining <= 0) return prev;
        const next = prev.timeRemaining - 1;
        if (next <= 0) {
          isGameOverRef.current = true;
          return { ...prev, timeRemaining: 0, isTimeUp: true, isGameOver: true };
        }
        return { ...prev, timeRemaining: next };
      });
    }, 1000);

    return () => clearTimeout(id);
  }, [state.isPaused, state.isGameOver, state.isTimeUp, state.timeRemaining, setState]);

  // =============================================
  // 着地処理
  // =============================================
  const landBlock = useCallback((fb: FallingBlock) => {
    if (processingRef.current || isGameOverRef.current) return;

    processingRef.current = true;
    setProcessing(true);
    setFallingBlock(null);
    fallingBlockRef.current = null;

    const currentBoard = boardRef.current;
    const result = processTurn(currentBoard, fb.col, fb.word);

    if (!result) {
      // 列が満杯（通常起こらないが安全策）
      isGameOverRef.current = true;
      setState(prev => ({ ...prev, isGameOver: true }));
      processingRef.current = false;
      setProcessing(false);
      return;
    }

    setDisplayBoard(result.boardAfterDrop);
    setMatchedCells([]);
    setChainLabel('');

    const runChain = (
      chainIndex: number,
      currentBoard: Board,
      accScore: number,
      accWords: number,
      accObstacles: number,
      accTimeBonus: number,
    ): void => {
      if (isGameOverRef.current) {
        // タイムアップ等でゲーム終了 → アニメーション中断
        processingRef.current = false;
        setProcessing(false);
        return;
      }

      if (chainIndex >= result.chains.length) {
        // チェーン処理完了
        const snap = stateRef.current;
        const newTurnsPlayed = snap.turnsPlayed + 1;
        const newWordsCleared = snap.wordsCleared + accWords;
        const newObstaclesDestroyed = snap.obstaclesDestroyed + accObstacles;
        const newScore = snap.score + accScore;
        const newBest = Math.max(snap.bestScore, newScore);

        const comboTimeBonus = result.comboCount >= 2 ? calcComboTimeBonus(result.comboCount) : 0;
        const totalTimeBonus = accTimeBonus + comboTimeBonus;

        // おじゃまスポーン判定
        let finalBoard = currentBoard;
        if (!checkGameOver(currentBoard)) {
          if (shouldSpawnObstacle(snap.timeRemaining, currentBoard)) {
            const spawned = trySpawnObstacle(currentBoard);
            if (spawned) finalBoard = spawned;
          }
        }

        setState(prev => {
          if (prev.isGameOver || isGameOverRef.current) return prev;
          let newTimeRemaining = prev.timeRemaining;
          if (totalTimeBonus > 0 && prev.timeRemaining > 0 && !prev.isGameOver) {
            newTimeRemaining = Math.min(MAX_TIMED_SECONDS, prev.timeRemaining + totalTimeBonus);
          }
          const newIsGameOver = prev.isGameOver || checkGameOver(finalBoard);
          if (newIsGameOver) isGameOverRef.current = true;
          return {
            ...prev,
            board: finalBoard,
            score: newScore,
            bestScore: newBest,
            combo: result.comboCount,
            maxCombo: Math.max(prev.maxCombo, result.comboCount),
            turnsPlayed: newTurnsPlayed,
            wordsCleared: newWordsCleared,
            obstaclesDestroyed: newObstaclesDestroyed,
            isGameOver: newIsGameOver,
            timeRemaining: newTimeRemaining,
          };
        });

        if (newScore > snap.bestScore) saveBestScore(newScore, snap.mode);

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

        // コンボ演出
        if (result.comboCount >= 2) {
          setComboCount(result.comboCount);
          setShowCombo(true);
          animTimer.current = setTimeout(() => setShowCombo(false), 1400);
        }

        processingRef.current = false;
        setProcessing(false);

        // 次ブロックをスポーン（ゲームオーバーでなければ）
        if (!isGameOverRef.current && !checkGameOver(finalBoard)) {
          spawnBlock(finalBoard);
        }
        return;
      }

      const chain = result.chains[chainIndex];
      const stepTimeBonus = calcTimeBonus(chain.matched.length);

      animTimer.current = setTimeout(() => {
        if (isGameOverRef.current) {
          processingRef.current = false;
          setProcessing(false);
          return;
        }
        setChainLabel(getChainLabel(chain.matched.length));
        setMatchedCells(chain.matched);

        animTimer.current = setTimeout(() => {
          if (isGameOverRef.current) {
            processingRef.current = false;
            setProcessing(false);
            return;
          }
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
  }, [setState, spawnBlock]);

  // =============================================
  // 落下ティック
  // =============================================
  useEffect(() => {
    if (!fallingBlock || processing || state.isPaused || state.isGameOver || isGameOverRef.current) return;

    const speed = fastFall ? FAST_FALL_MS : calcFallSpeed(timeRemainingRef.current);

    const id = setTimeout(() => {
      const fb = fallingBlockRef.current;
      if (!fb || processingRef.current || isGameOverRef.current) return;

      const board = boardRef.current;
      const nextRow = fb.row + 1;

      if (nextRow < ROWS && board[nextRow][fb.col] === null) {
        const updated = { ...fb, row: nextRow };
        setFallingBlock(updated);
        fallingBlockRef.current = updated;
      } else {
        landBlock(fb);
      }
    }, speed);

    return () => clearTimeout(id);
  }, [fallingBlock, processing, state.isPaused, state.isGameOver, fastFall, landBlock]);

  // =============================================
  // 操作ハンドラ
  // =============================================

  const handleMoveLeft = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    const fb = fallingBlockRef.current;
    if (!fb) return;

    const newCol = fb.col - 1;
    if (newCol < 0) return;
    if (boardRef.current[fb.row][newCol] !== null) return;

    const updated = { ...fb, col: newCol };
    setFallingBlock(updated);
    fallingBlockRef.current = updated;
  }, [state.isPaused, state.isGameOver]);

  const handleMoveRight = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    const fb = fallingBlockRef.current;
    if (!fb) return;

    const newCol = fb.col + 1;
    if (newCol >= COLS) return;
    if (boardRef.current[fb.row][newCol] !== null) return;

    const updated = { ...fb, col: newCol };
    setFallingBlock(updated);
    fallingBlockRef.current = updated;
  }, [state.isPaused, state.isGameOver]);

  const handleDownStart = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    setFastFall(true);
    fastFallRef.current = true;
  }, [state.isPaused, state.isGameOver]);

  const handleDownEnd = useCallback(() => {
    setFastFall(false);
    fastFallRef.current = false;
  }, []);

  const handleChangeWord = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    const fb = fallingBlockRef.current;
    if (!fb) return;

    // 現在の単語と異なるランダムな単語を選ぶ
    const candidates = WORD_LIST.filter(w => w !== fb.word);
    const newWord = candidates[Math.floor(Math.random() * candidates.length)];

    const updated = { ...fb, word: newWord };
    setFallingBlock(updated);
    fallingBlockRef.current = updated;

    setState(prev => ({ ...prev, wordChanges: prev.wordChanges + 1 }));
  }, [state.isPaused, state.isGameOver, setState]);

  // =============================================
  // スワイプジェスチャー
  // =============================================
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    const THRESHOLD = 32;

    if (adx > ady && adx > THRESHOLD) {
      if (dx < 0) handleMoveLeft();
      else handleMoveRight();
    } else if (ady > adx && ady > THRESHOLD && dy > 0) {
      // 下スワイプ → 高速落下を一時的に有効化
      handleDownStart();
      setTimeout(handleDownEnd, 400);
    }
    touchStartRef.current = null;
  };

  // =============================================
  // ポーズ / リスタート
  // =============================================
  const handlePause = () => {
    if (state.isGameOver) return;
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };
  const handleResume = () => setState(prev => ({ ...prev, isPaused: false }));

  const clearAnimTimer = () => {
    if (animTimer.current) clearTimeout(animTimer.current);
  };

  const handleRestartFull = () => {
    isGameOverRef.current = false;
    initializedRef.current = false;
    processingRef.current = false;
    clearAnimTimer();
    setProcessing(false);
    setFallingBlock(null);
    fallingBlockRef.current = null;
    setMatchedCells([]);
    setShowCombo(false);
    setChainLabel('');
    setBreakActive(false);
    setTimeBonusInfo(null);
    setTimerBonusGlow(false);
    setDisplayBoard(createEmptyBoard());
    setShowTutorial(true);
    setFastFall(false);
    onRestart();
  };

  const handleTop = () => {
    isGameOverRef.current = false;
    initializedRef.current = false;
    processingRef.current = false;
    clearAnimTimer();
    setProcessing(false);
    setFallingBlock(null);
    fallingBlockRef.current = null;
    setMatchedCells([]);
    setShowCombo(false);
    setChainLabel('');
    setBreakActive(false);
    setTimeBonusInfo(null);
    setTimerBonusGlow(false);
    setDisplayBoard(createEmptyBoard());
    setFastFall(false);
    onTop();
  };

  // =============================================
  // レンダリング
  // =============================================
  const isBlocked = processing || state.isPaused || state.isGameOver;

  return (
    <div
      className="game-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
          fallingBlock={fallingBlock}
        />

        {/* チェーンラベル */}
        {chainLabel && (
          <div className="chain-label-overlay" key={chainLabel + matchedCells.length}>
            <div className="chain-label-text">{chainLabel}</div>
          </div>
        )}

        {/* BREAK! */}
        {breakActive && (
          <div className="break-label-overlay" key={`break-${Date.now()}`}>
            <div className="break-label-text">BREAK! +500</div>
          </div>
        )}

        {/* 時間ボーナス */}
        {timeBonusInfo && (
          <div className="time-bonus-overlay" key={timeBonusInfo.key}>
            <span className="time-bonus-text">+{timeBonusInfo.bonus} SEC</span>
          </div>
        )}

        {/* コンボ */}
        <ComboOverlay combo={comboCount} visible={showCombo} />

        {/* チュートリアルヒント */}
        {showTutorial && !state.isGameOver && (
          <div className="tutorial-hint">
            左右で動かす &nbsp;／&nbsp; 下で落とす &nbsp;／&nbsp; 変更で入れ替え
          </div>
        )}
      </div>

      {/* 下部コントロール */}
      <div className="bottom-area">
        {/* NEXT表示 */}
        <div className="next-word-row">
          <span className="next-label">NEXT</span>
          <span className="next-word-text">{nextWord}</span>
        </div>

        {/* 操作ボタン */}
        <div className="control-buttons">
          {/* 左 */}
          <button
            className="ctrl-btn ctrl-left"
            onClick={handleMoveLeft}
            disabled={isBlocked}
            aria-label="左へ移動"
          >
            ◀
          </button>

          {/* 下（高速落下） */}
          <button
            className={['ctrl-btn ctrl-down', fastFall ? 'active' : ''].filter(Boolean).join(' ')}
            onPointerDown={handleDownStart}
            onPointerUp={handleDownEnd}
            onPointerLeave={handleDownEnd}
            onPointerCancel={handleDownEnd}
            disabled={isBlocked}
            aria-label="高速落下"
          >
            ▼▼
          </button>

          {/* 右 */}
          <button
            className="ctrl-btn ctrl-right"
            onClick={handleMoveRight}
            disabled={isBlocked}
            aria-label="右へ移動"
          >
            ▶
          </button>

          {/* 変更 */}
          <button
            className="ctrl-btn ctrl-change"
            onClick={handleChangeWord}
            disabled={isBlocked}
            aria-label="言葉を変更"
          >
            変更
          </button>
        </div>
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
          wordChanges={state.wordChanges}
          rankPosition={rankPosition}
          onRestart={handleRestartFull}
          onTop={handleTop}
          onShowRanking={onShowRanking}
        />
      )}
    </div>
  );
}
