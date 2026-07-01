import { useCallback, useEffect, useRef, useState } from 'react';
import { Board, COLS, GameMode, GameState, ROWS, unitCells } from '../logic/types';
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
import {
  assignColor,
  pickSmartWord,
  pickNextWord,
  SHORT_WORDS,
  MEDIUM_SHORT_WORDS,
  LONG_WORDS,
  VERTICAL_WORDS,
  getKanaColor,
} from '../logic/words';
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
  width: 1 | 2;
  height: 1 | 2;
}

interface SpawnWord {
  word: string;
  width: 1 | 2;
  height: 1 | 2;
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

const FAST_FALL_MS = 60;           // 高速落下（下ボタン）の落下間隔 ms
const PAUSE_RESUME_DELAY_MS = 750; // ポーズ解除後の落下開始遅延 ms

// ─── 通常落下速度の設定定数（ここを変えるだけで調整可能）───
const FALL_SPEED_INITIAL_MS    = 1600; // 開始直後の落下間隔（目安: 1マス落下に1.6秒）
const FALL_SPEED_MIN_MS        = 950;  // 最低落下間隔（終盤でもこれ以下にならない）
const FALL_SPEED_ACCEL_INTERVAL = 30;  // 何秒経過ごとに加速するか
const FALL_SPEED_ACCEL_STEP_MS =  50;  // 1ステップあたりの加速量 ms

// 経過時間に応じて落下間隔を計算（秒換算 elapsed = 180 - timeRemaining）
function calcFallSpeed(timeRemaining: number): number {
  const elapsed = Math.max(0, 180 - timeRemaining);
  return Math.max(
    FALL_SPEED_MIN_MS,
    FALL_SPEED_INITIAL_MS - Math.floor(elapsed / FALL_SPEED_ACCEL_INTERVAL) * FALL_SPEED_ACCEL_STEP_MS,
  );
}

function getChainLabel(matchCount: number): string {
  if (matchCount >= 5) return 'AMAZING CHAIN!';
  if (matchCount >= 4) return 'GREAT CHAIN!';
  return 'CHAIN!';
}

// ─── モード別・形状別の単語選択 ───
// 中級モードの出現割合の目安：1ブロック語 約55% / 横2連結 約25% / 縦2連結 約20%
const HORIZONTAL_RATIO = 0.25;
const VERTICAL_RATIO = 0.20;

function shortPool(mode: GameMode): string[] {
  return mode === 'timed-medium' ? MEDIUM_SHORT_WORDS : SHORT_WORDS;
}

/** モードに応じて次に出す言葉と形状（width/height）を選ぶ。 */
function pickSpawnWord(board: Board, mode: GameMode, exclude: string | null): SpawnWord {
  if (mode === 'timed-medium') {
    const r = Math.random();
    if (r < HORIZONTAL_RATIO) {
      return { word: pickSmartWord(board, exclude, LONG_WORDS), width: 2, height: 1 };
    }
    if (r < HORIZONTAL_RATIO + VERTICAL_RATIO) {
      return { word: pickSmartWord(board, exclude, VERTICAL_WORDS), width: 1, height: 2 };
    }
  }
  return { word: pickSmartWord(board, exclude, shortPool(mode)), width: 1, height: 1 };
}

/** NEXT用：直前の単語につながりやすい候補を優先しつつ、モードに応じた形状を選ぶ。 */
function pickSpawnNextWord(currentWord: string, board: Board, mode: GameMode, exclude: string | null): SpawnWord {
  if (mode === 'timed-medium') {
    const r = Math.random();
    if (r < HORIZONTAL_RATIO) {
      return { word: pickNextWord(currentWord, board, exclude, LONG_WORDS), width: 2, height: 1 };
    }
    if (r < HORIZONTAL_RATIO + VERTICAL_RATIO) {
      return { word: pickNextWord(currentWord, board, exclude, VERTICAL_WORDS), width: 1, height: 2 };
    }
  }
  return { word: pickNextWord(currentWord, board, exclude, shortPool(mode)), width: 1, height: 1 };
}

/** 現在ワードバナー・NEXT表示で、文字数によらず1行に収まるフォントサイズを返す。 */
function getBannerFontSize(word: string): string {
  const len = word.length;
  if (len <= 2) return 'clamp(1.18rem, 5.2vw, 1.55rem)';
  if (len <= 3) return 'clamp(0.98rem, 4.4vw, 1.3rem)';
  if (len <= 4) return 'clamp(0.82rem, 3.8vw, 1.08rem)';
  return 'clamp(0.7rem, 3.2vw, 0.92rem)';
}

function getNextWordFontSize(word: string): string {
  const len = word.length;
  if (len <= 2) return 'clamp(0.95rem, 4.2vw, 1.18rem)';
  if (len <= 3) return 'clamp(0.82rem, 3.6vw, 1.0rem)';
  if (len <= 4) return 'clamp(0.72rem, 3.1vw, 0.88rem)';
  return 'clamp(0.64rem, 2.7vw, 0.78rem)';
}

// ─── スポーン列探索 ───
/** 1ブロック語：中央から左右に広げて空き列を探す。 */
function findSingleSpawnCol(board: Board): number {
  const center = Math.floor(COLS / 2);
  for (let offset = 0; offset < COLS; offset++) {
    const left = center - offset;
    const right = center + offset;
    if (left >= 0 && board[0][left] === null) return left;
    if (right < COLS && board[0][right] === null) return right;
  }
  return -1;
}

/** 横2ブロック語：隣接2列とも空いている、最も中央に近い開始列を探す。 */
function findPairSpawnCol(board: Board): number {
  const center = Math.floor(COLS / 2);
  let best = -1;
  let bestDist = Infinity;
  for (let col = 0; col <= COLS - 2; col++) {
    if (board[0][col] === null && board[0][col + 1] === null) {
      const dist = Math.abs(col + 0.5 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = col;
      }
    }
  }
  return best;
}

/** 縦2ブロック語：スポーン行(row0,row1)とも空いている、最も中央に近い列を探す。 */
function findVerticalSpawnCol(board: Board): number {
  const center = Math.floor(COLS / 2);
  for (let offset = 0; offset < COLS; offset++) {
    const left = center - offset;
    const right = center + offset;
    if (left >= 0 && board[0][left] === null && board[1][left] === null) return left;
    if (right < COLS && board[0][right] === null && board[1][right] === null) return right;
  }
  return -1;
}

/** 形状に応じたスポーン列探索の振り分け。 */
function findSpawnCol(board: Board, width: 1 | 2, height: 1 | 2): number {
  if (width === 2) return findPairSpawnCol(board);
  if (height === 2) return findVerticalSpawnCol(board);
  return findSingleSpawnCol(board);
}

/**
 * 落下中ユニット（1x1 / 横2連結 / 縦2連結）が、指定位置に置けるかどうかを判定する
 * 唯一の判定関数。落下・高速落下・左右移動のすべてがこの関数だけを使う。
 */
function canOccupy(board: Board, row: number, col: number, width: 1 | 2, height: 1 | 2): boolean {
  for (const [r, c] of unitCells(row, col, width, height)) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    if (board[r][c] !== null) return false;
  }
  return true;
}

// ─── 現在落下中の言葉の最初・最後の文字を取得 ───
const SMALL_TO_LARGE: Record<string, string> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
};
function normalizeKana(ch: string): string { return SMALL_TO_LARGE[ch] ?? ch; }
function getFirstKana(word: string): string { return normalizeKana(word[0]); }
function getLastKana(word: string): string {
  let w = word;
  while (w.endsWith('ー') && w.length > 1) w = w.slice(0, -1);
  return normalizeKana(w[w.length - 1]);
}

// =============================================
// コンポーネント
// =============================================

export default function GameScreen({ state, setState, onRestart, onTop, onShowRanking }: Props) {
  // ─── 落下ブロック状態 ───
  const [fallingBlock, setFallingBlock] = useState<FallingBlock | null>(null);
  const fallingBlockRef = useRef<FallingBlock | null>(null);

  // ─── 次の言葉 ───
  const [nextWord, setNextWord] = useState<SpawnWord | null>(null);
  const nextWordRef = useRef<SpawnWord | null>(null);

  // ─── 高速落下 ───
  const [fastFall, setFastFall] = useState(false);
  const fastFallRef = useRef(false);

  // （単語キューはスマート選択に置き換えたため削除）

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
  const [pauseResumeDelay, setPauseResumeDelay] = useState(false);

  // ─── Refs ───
  const boardRef = useRef<Board>(state.board);
  const stateRef = useRef(state);
  const isGameOverRef = useRef(false);
  const processingRef = useRef(false);
  const rankingSavedRef = useRef(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRemainingRef = useRef(state.timeRemaining);
  const initializedRef = useRef(false);
  const pauseResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Ref 同期 ───
  useEffect(() => { boardRef.current = state.board; }, [state.board]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { timeRemainingRef.current = state.timeRemaining; }, [state.timeRemaining]);


  // ─── スポーン（内部）───
  const spawnBlock = useCallback((boardAfterChains: Board) => {
    if (isGameOverRef.current) return;

    if (checkGameOver(boardAfterChains)) {
      isGameOverRef.current = true;
      setState(prev => ({ ...prev, isGameOver: true }));
      return;
    }

    const mode = stateRef.current.mode;
    let spawn: SpawnWord = nextWordRef.current ?? pickSpawnWord(boardAfterChains, mode, null);

    let spawnCol = findSpawnCol(boardAfterChains, spawn.width, spawn.height);

    // 2ブロック語を置く隙間が無ければ、安全に置ける1ブロック語にフォールバック
    if (spawnCol === -1 && (spawn.width === 2 || spawn.height === 2)) {
      spawn = { word: pickSmartWord(boardAfterChains, spawn.word, shortPool(mode)), width: 1, height: 1 };
      spawnCol = findSingleSpawnCol(boardAfterChains);
    }

    if (spawnCol === -1) {
      isGameOverRef.current = true;
      setState(prev => ({ ...prev, isGameOver: true }));
      return;
    }

    // NEXTワード: 現在の単語末尾につながりやすい候補を優先
    const newNext = pickSpawnNextWord(spawn.word, boardAfterChains, mode, spawn.word);
    nextWordRef.current = newNext;
    setNextWord(newNext);

    const newBlock: FallingBlock = {
      col: spawnCol,
      row: 0,
      word: spawn.word,
      color: assignColor(),
      width: spawn.width,
      height: spawn.height,
    };
    setFallingBlock(newBlock);
    fallingBlockRef.current = newBlock;
  }, [setState]);

  // ─── 初期化（マウント時1回） ───
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 最初の2語をスマート選択（盤面は空なのでランダムに近い）
    const emptyBoard = createEmptyBoard();
    const mode = stateRef.current.mode;
    let first = pickSpawnWord(emptyBoard, mode, null);
    let startCol = findSpawnCol(emptyBoard, first.width, first.height);
    if (startCol === -1 && (first.width === 2 || first.height === 2)) {
      first = { word: pickSmartWord(emptyBoard, first.word, shortPool(mode)), width: 1, height: 1 };
      startCol = findSingleSpawnCol(emptyBoard);
    }
    const second = pickSpawnNextWord(first.word, emptyBoard, mode, first.word);
    nextWordRef.current = second;
    setNextWord(second);

    // 1語目でブロックをスポーン
    const newBlock: FallingBlock = {
      col: startCol,
      row: 0,
      word: first.word,
      color: assignColor(),
      width: first.width,
      height: first.height,
    };
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
    }, state.mode);
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
    const result = processTurn(currentBoard, fb.col, fb.word, fb.width, fb.height);

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
    if (!fallingBlock || processing || state.isPaused || state.isGameOver || isGameOverRef.current || pauseResumeDelay) return;

    const speed = fastFall ? FAST_FALL_MS : calcFallSpeed(timeRemainingRef.current);

    const id = setTimeout(() => {
      const fb = fallingBlockRef.current;
      if (!fb || processingRef.current || isGameOverRef.current) return;

      const board = boardRef.current;
      const nextRow = fb.row + 1;
      const canFall = canOccupy(board, nextRow, fb.col, fb.width, fb.height);

      if (canFall) {
        const updated = { ...fb, row: nextRow };
        setFallingBlock(updated);
        fallingBlockRef.current = updated;
      } else {
        landBlock(fb);
      }
    }, speed);

    return () => clearTimeout(id);
  }, [fallingBlock, processing, state.isPaused, state.isGameOver, fastFall, landBlock, pauseResumeDelay]);

  // =============================================
  // 操作ハンドラ
  // =============================================

  const handleMoveLeft = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    const fb = fallingBlockRef.current;
    if (!fb) return;

    const newCol = fb.col - 1;
    if (!canOccupy(boardRef.current, fb.row, newCol, fb.width, fb.height)) return;

    const updated = { ...fb, col: newCol };
    setFallingBlock(updated);
    fallingBlockRef.current = updated;
  }, [state.isPaused, state.isGameOver]);

  const handleMoveRight = useCallback(() => {
    if (processingRef.current || state.isPaused || state.isGameOver || isGameOverRef.current) return;
    const fb = fallingBlockRef.current;
    if (!fb) return;

    const newCol = fb.col + 1;
    if (!canOccupy(boardRef.current, fb.row, newCol, fb.width, fb.height)) return;

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

    // 盤面につながりやすい単語を優先して選ぶ（形状・位置は変えない＝回転なし）
    const pool = fb.width === 2 ? LONG_WORDS : fb.height === 2 ? VERTICAL_WORDS : shortPool(stateRef.current.mode);
    const newWord = pickSmartWord(boardRef.current, fb.word, pool);

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
  const handleResume = () => {
    setState(prev => ({ ...prev, isPaused: false }));
    if (pauseResumeTimerRef.current) clearTimeout(pauseResumeTimerRef.current);
    setPauseResumeDelay(true);
    pauseResumeTimerRef.current = setTimeout(() => {
      setPauseResumeDelay(false);
    }, PAUSE_RESUME_DELAY_MS);
  };

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

      {/* 現在落下中の言葉バナー */}
      {fallingBlock && !state.isGameOver && (
        <div
          className="current-word-banner"
          style={{ '--cwb-color': fallingBlock.color } as React.CSSProperties}
        >
          <div className="cwb-main">
            <div className="cwb-label">
              いま落ちている言葉
              {fallingBlock.width === 2 && <span className="cwb-badge">横2連結</span>}
              {fallingBlock.height === 2 && <span className="cwb-badge">縦2連結</span>}
            </div>
            <div className="cwb-word" style={{ fontSize: getBannerFontSize(fallingBlock.word) }}>
              {fallingBlock.word.slice(0, -1)}
              <span className="cwb-last-char">{fallingBlock.word.slice(-1)}</span>
            </div>
            <div className="cwb-hints">
              <span>
                はじまり：
                <span
                  className="cwb-kana-dot"
                  style={{ background: getKanaColor(getFirstKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
                <span className="cwb-char">{getFirstKana(fallingBlock.word)}</span>
              </span>
              <span>
                おわり：
                <span
                  className="cwb-kana-dot"
                  style={{ background: getKanaColor(getLastKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
                <span className="cwb-char cwb-char-last">{getLastKana(fallingBlock.word)}</span>
              </span>
            </div>
          </div>
          <button
            className="cwb-change-btn"
            onClick={handleChangeWord}
            disabled={isBlocked}
            aria-label="言葉を変更"
          >
            <span className="cwb-change-label">変更</span>
            <span className="cwb-change-hint">何度でもOK</span>
          </button>
        </div>
      )}

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
            左右で移動 &nbsp;／&nbsp; 下で落とす &nbsp;／&nbsp; バナーの変更ボタンで入れ替え
          </div>
        )}
      </div>

      {/* 下部コントロール */}
      <div className="bottom-area">
        {/* NEXT表示 */}
        <div className="next-word-row">
          <span className="next-label">NEXT</span>
          {nextWord && (
            <span className="next-word-text" style={{ fontSize: getNextWordFontSize(nextWord.word) }}>
              {nextWord.word}
            </span>
          )}
          {nextWord?.width === 2 && <span className="next-word-badge">横2連結</span>}
          {nextWord?.height === 2 && <span className="next-word-badge">縦2連結</span>}
        </div>

        {/* 操作ボタン（左・落とす・右） */}
        <div className="control-buttons">
          {/* 左 */}
          <button
            className="ctrl-btn ctrl-left"
            onClick={handleMoveLeft}
            disabled={isBlocked}
            aria-label="左へ移動"
          >
            <span className="ctrl-icon">◀</span>
            <span className="ctrl-label">左</span>
          </button>

          {/* 下（高速落下・長押し対応） */}
          <button
            className={['ctrl-btn ctrl-down', fastFall ? 'active' : ''].filter(Boolean).join(' ')}
            onPointerDown={handleDownStart}
            onPointerUp={handleDownEnd}
            onPointerLeave={handleDownEnd}
            onPointerCancel={handleDownEnd}
            disabled={isBlocked}
            aria-label="高速落下"
          >
            <span className="ctrl-icon ctrl-icon-down">▼</span>
            <span className="ctrl-label">落とす</span>
          </button>

          {/* 右 */}
          <button
            className="ctrl-btn ctrl-right"
            onClick={handleMoveRight}
            disabled={isBlocked}
            aria-label="右へ移動"
          >
            <span className="ctrl-icon">▶</span>
            <span className="ctrl-label">右</span>
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
