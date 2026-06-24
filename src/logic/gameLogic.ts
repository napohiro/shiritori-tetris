import { Board, Cell, COLS, GameState, HAND_SIZE, ROWS, SHUFFLE_LIMIT, WordBlock } from './types';
import { assignColor, createWordQueue } from './words';
import { findMatchedPositions } from './shiritori';

// =============================================
// LocalStorage
// =============================================

const BEST_SCORE_KEY = 'shiritori-tetris-best';

export function loadBestScore(): number {
  try {
    return parseInt(localStorage.getItem(BEST_SCORE_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch { /* StorageError — ignore */ }
}

// =============================================
// ブロック生成
// =============================================

let idCounter = 0;
function makeId(): string {
  return `block-${++idCounter}`;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null) as Cell[]);
}

export function createInitialState(): GameState {
  const queue = createWordQueue();
  return {
    board: createEmptyBoard(),
    hand: queue.slice(0, HAND_SIZE),
    selectedHandIndex: null,
    wordQueue: queue.slice(HAND_SIZE),
    score: 0,
    bestScore: loadBestScore(),
    combo: 0,
    maxCombo: 0,
    shuffleRemaining: SHUFFLE_LIMIT,
    selectedCol: null,
    screen: 'top',
    isGameOver: false,
    isPaused: false,
    hintCol: null,
  };
}

// =============================================
// ゲームロジック
// =============================================

/** 指定列にブロックを落とす。列が満杯なら null を返す。 */
export function dropBlock(
  board: Board,
  col: number,
  word: string,
): { newBoard: Board; dropRow: number } | null {
  let dropRow = -1;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      dropRow = row;
      break;
    }
  }
  if (dropRow === -1) return null;

  const newBoard = cloneBoard(board);
  const block: WordBlock = { id: makeId(), word, color: assignColor() };
  newBoard[dropRow][col] = block;
  return { newBoard, dropRow };
}

/** マッチしたセルを盤面から除去する。 */
export function removeMatched(board: Board, matched: [number, number][]): Board {
  const newBoard = cloneBoard(board);
  for (const [r, c] of matched) {
    newBoard[r][c] = null;
  }
  return newBoard;
}

/** 重力処理：各列のブロックを下へ詰める。 */
export function applyGravity(board: Board): Board {
  const newBoard = cloneBoard(board);
  for (let col = 0; col < COLS; col++) {
    const blocks: Cell[] = [];
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] !== null) {
        blocks.push(newBoard[row][col]);
        newBoard[row][col] = null;
      }
    }
    for (let i = 0; i < blocks.length; i++) {
      newBoard[ROWS - 1 - i][col] = blocks[i];
    }
  }
  return newBoard;
}

/** 全列が最上段まで埋まっていたらゲームオーバー。 */
export function isGameOver(board: Board): boolean {
  return board[0].every(cell => cell !== null);
}

/**
 * スコア計算
 * 基本: matchCount × 100 点
 * チェーンボーナス: 4語以上は1語ごとに +100
 * 連鎖倍率: combo 倍
 */
export function calcScore(matchCount: number, combo: number): number {
  const chainBonus = Math.max(0, matchCount - 3) * 100;
  const base = matchCount * 100 + chainBonus;
  return base * Math.max(1, combo);
}

// =============================================
// 1ターン処理
// =============================================

export interface ChainStep {
  matched: [number, number][];
  boardAfterRemoval: Board;
  boardAfterGravity: Board;
  scoreGain: number;
}

export interface TurnResult {
  boardAfterDrop: Board;
  chains: ChainStep[];
  totalScore: number;
  comboCount: number;
}

/** 配置→マッチ→消去→重力→連鎖をまとめて処理し、各ステップを返す。 */
export function processTurn(board: Board, col: number, word: string): TurnResult | null {
  const dropResult = dropBlock(board, col, word);
  if (!dropResult) return null;

  let current = dropResult.newBoard;
  const chains: ChainStep[] = [];
  let totalScore = 0;
  let comboCount = 0;

  while (true) {
    const matched = findMatchedPositions(current);
    if (matched.length === 0) break;

    comboCount++;
    const scoreGain = calcScore(matched.length, comboCount);
    totalScore += scoreGain;

    const boardAfterRemoval = removeMatched(current, matched);
    const boardAfterGravity = applyGravity(boardAfterRemoval);

    chains.push({ matched, boardAfterRemoval, boardAfterGravity, scoreGain });
    current = boardAfterGravity;
  }

  return { boardAfterDrop: dropResult.newBoard, chains, totalScore, comboCount };
}

// =============================================
// ユーティリティ
// =============================================

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/** 空きのある列番号を返す。 */
export function availableCols(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter(col => board[0][col] === null);
}

/** 手札を補充する（新しいカードで差し替えた hand 配列と残りキューを返す）。 */
export function replenishHand(
  hand: string[],
  playedIndex: number,
  queue: string[],
): { newHand: string[]; newQueue: string[] } {
  const newHand = [...hand];
  let q = [...queue];
  if (q.length < HAND_SIZE) q = [...q, ...createWordQueue()];
  newHand[playedIndex] = q[0];
  q = q.slice(1);
  // キューを十分な量に保つ
  if (q.length < 20) q = [...q, ...createWordQueue()];
  return { newHand, newQueue: q };
}

/** シャッフル（手札3枚をキューから補充）。 */
export function shuffleHand(
  queue: string[],
): { newHand: string[]; newQueue: string[] } {
  let q = [...queue];
  if (q.length < HAND_SIZE + 20) q = [...q, ...createWordQueue()];
  const newHand = q.slice(0, HAND_SIZE);
  q = q.slice(HAND_SIZE);
  return { newHand, newQueue: q };
}
