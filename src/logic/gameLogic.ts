import {
  Board,
  Cell,
  COLS,
  GameMode,
  GameState,
  HAND_SIZE,
  MAX_OBSTACLES,
  OBSTACLE_BREAK_BONUS,
  ObstacleBlock,
  ROWS,
  SHUFFLE_LIMIT,
  WordBlock,
} from './types';
import { assignColor, createWordQueue } from './words';
import { findMatchedPositions } from './shiritori';

// =============================================
// LocalStorage（モード別）
// =============================================

const BEST_SCORE_KEYS: Record<GameMode, string> = {
  endless: 'shiritori-tetris-best-endless',
  timed: 'shiritori-tetris-best-3min',
};

export function loadBestScore(mode: GameMode = 'endless'): number {
  try {
    return parseInt(localStorage.getItem(BEST_SCORE_KEYS[mode]) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number, mode: GameMode = 'endless'): void {
  try {
    localStorage.setItem(BEST_SCORE_KEYS[mode], String(score));
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

export function createInitialState(mode: GameMode = 'endless'): GameState {
  const queue = createWordQueue();
  return {
    board: createEmptyBoard(),
    hand: queue.slice(0, HAND_SIZE),
    selectedHandIndex: null,
    wordQueue: queue.slice(HAND_SIZE),
    score: 0,
    bestScore: loadBestScore(mode),
    combo: 0,
    maxCombo: 0,
    shuffleRemaining: SHUFFLE_LIMIT,
    selectedCol: null,
    screen: 'top',
    mode,
    timeRemaining: mode === 'timed' ? 180 : 0,
    isTimeUp: false,
    isGameOver: false,
    isPaused: false,
    hintCol: null,
    turnsPlayed: 0,
    wordsCleared: 0,
    obstaclesDestroyed: 0,
  };
}

// =============================================
// ゲームロジック
// =============================================

/** 指定列に言葉ブロックを落とす。列が満杯なら null を返す。 */
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
  const block: WordBlock = { id: makeId(), type: 'word', word, color: assignColor() };
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
// おじゃまブロック
// =============================================

export function createObstacleBlock(): ObstacleBlock {
  return { id: makeId(), type: 'obstacle', hp: 2 };
}

export function countObstacles(board: Board): number {
  let count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]?.type === 'obstacle') count++;
    }
  }
  return count;
}

const OBSTACLE_DIRS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

/**
 * マッチした言葉ブロックに隣接するおじゃまブロックにダメージを与える。
 * HP が 0 以下になったブロックは削除し、ボーナス点を返す。
 */
export function processObstacleDamage(
  board: Board,
  matchedWordPositions: [number, number][],
): { newBoard: Board; destroyedPositions: [number, number][]; bonusScore: number } {
  const newBoard = cloneBoard(board);
  const matchedSet = new Set(matchedWordPositions.map(([r, c]) => `${r},${c}`));
  const damagedKeys = new Set<string>();

  for (const [r, c] of matchedWordPositions) {
    for (const [dr, dc] of OBSTACLE_DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const cell = newBoard[nr][nc];
      if (!cell || cell.type !== 'obstacle') continue;
      if (matchedSet.has(`${nr},${nc}`)) continue;
      damagedKeys.add(`${nr},${nc}`);
    }
  }

  const destroyedPositions: [number, number][] = [];
  let bonusScore = 0;

  for (const key of damagedKeys) {
    const [r, c] = key.split(',').map(Number);
    const cell = newBoard[r][c];
    if (!cell || cell.type !== 'obstacle') continue;
    const newHp = cell.hp - 1;
    if (newHp <= 0) {
      destroyedPositions.push([r, c]);
      newBoard[r][c] = null;
      bonusScore += OBSTACLE_BREAK_BONUS;
    } else {
      newBoard[r][c] = { ...cell, hp: newHp } as ObstacleBlock;
    }
  }

  return { newBoard, destroyedPositions, bonusScore };
}

/**
 * おじゃまブロックをランダムな列に落とす。
 * すでに MAX_OBSTACLES 以上いる場合、あるいは空き列がない場合は null を返す。
 */
export function trySpawnObstacle(board: Board): Board | null {
  if (countObstacles(board) >= MAX_OBSTACLES) return null;
  const available = availableCols(board);
  if (available.length === 0) return null;

  const col = available[Math.floor(Math.random() * available.length)];
  let dropRow = -1;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      dropRow = row;
      break;
    }
  }
  if (dropRow === -1) return null;

  const newBoard = cloneBoard(board);
  newBoard[dropRow][col] = createObstacleBlock();
  return newBoard;
}

/**
 * 現在のゲーム状態に応じておじゃまブロックをスポーンすべきか判定する。
 * @param mode ゲームモード
 * @param score 現在スコア
 * @param turnsPlayed 経過ターン数（この呼び出し時点での新ターン後の値）
 * @param timeRemaining 残り秒数（timed モード用）
 * @param board 現在の盤面
 */
export function shouldSpawnObstacle(
  mode: GameMode,
  score: number,
  turnsPlayed: number,
  timeRemaining: number,
  board: Board,
): boolean {
  if (countObstacles(board) >= MAX_OBSTACLES) return false;

  if (mode === 'endless') {
    if (score < 800 || turnsPlayed < 12) return false;
    return turnsPlayed % 10 === 0 && Math.random() < 0.45;
  } else {
    const elapsed = 180 - timeRemaining;
    if (elapsed < 40) return false;
    // 40秒後から確率が増加し、120秒後以降は最大55%に達する
    const chance = Math.min(0.55, (elapsed - 40) / 145);
    return Math.random() < chance;
  }
}

// =============================================
// 1ターン処理
// =============================================

export interface ChainStep {
  matched: [number, number][];
  boardAfterRemoval: Board;
  boardAfterGravity: Board;
  scoreGain: number;
  destroyedObstaclePositions: [number, number][];
  obstacleBonus: number;
}

export interface TurnResult {
  boardAfterDrop: Board;
  chains: ChainStep[];
  totalScore: number;
  comboCount: number;
  totalWordsCleared: number;
  totalObstaclesDestroyed: number;
}

/** 配置→マッチ→消去→重力→連鎖をまとめて処理し、各ステップを返す。 */
export function processTurn(board: Board, col: number, word: string): TurnResult | null {
  const dropResult = dropBlock(board, col, word);
  if (!dropResult) return null;

  let current = dropResult.newBoard;
  const chains: ChainStep[] = [];
  let totalScore = 0;
  let comboCount = 0;
  let totalWordsCleared = 0;
  let totalObstaclesDestroyed = 0;

  while (true) {
    const matched = findMatchedPositions(current);
    if (matched.length === 0) break;

    comboCount++;
    totalWordsCleared += matched.length;

    // おじゃまブロックへのダメージ処理
    const { newBoard: boardWithDamage, destroyedPositions, bonusScore } =
      processObstacleDamage(current, matched);
    totalObstaclesDestroyed += destroyedPositions.length;

    const scoreGain = calcScore(matched.length, comboCount) + bonusScore;
    totalScore += scoreGain;

    // 消去対象：マッチした言葉 + 破壊されたおじゃまブロック
    const allToRemove = [...matched, ...destroyedPositions];
    const boardAfterRemoval = removeMatched(boardWithDamage, allToRemove);
    const boardAfterGravity = applyGravity(boardAfterRemoval);

    chains.push({
      matched,
      boardAfterRemoval,
      boardAfterGravity,
      scoreGain,
      destroyedObstaclePositions: destroyedPositions,
      obstacleBonus: bonusScore,
    });
    current = boardAfterGravity;
  }

  return {
    boardAfterDrop: dropResult.newBoard,
    chains,
    totalScore,
    comboCount,
    totalWordsCleared,
    totalObstaclesDestroyed,
  };
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
