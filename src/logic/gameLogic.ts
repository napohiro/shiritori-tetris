import {
  Board,
  Cell,
  COLS,
  GameMode,
  GameState,
  MAX_OBSTACLES,
  OBSTACLE_BREAK_BONUS,
  ObstacleBlock,
  ROWS,
  WordBlock,
} from './types';
import { assignColor, createWordQueue } from './words';
import { findMatchedPositions } from './shiritori';

// =============================================
// LocalStorage
// =============================================

function bestScoreKey(mode: GameMode): string {
  return mode === 'timed-medium' ? 'shiritori-tetris-best-3min-medium' : 'shiritori-tetris-best-3min';
}

export function loadBestScore(mode: GameMode = 'timed'): number {
  try {
    return parseInt(localStorage.getItem(bestScoreKey(mode)) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number, mode: GameMode = 'timed'): void {
  try {
    localStorage.setItem(bestScoreKey(mode), String(score));
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

export function createInitialState(mode: GameMode = 'timed'): GameState {
  const queue = createWordQueue();
  return {
    board: createEmptyBoard(),
    wordQueue: queue,
    score: 0,
    bestScore: loadBestScore(mode),
    combo: 0,
    maxCombo: 0,
    screen: 'top',
    mode,
    timeRemaining: 180,
    isTimeUp: false,
    isGameOver: false,
    isPaused: false,
    turnsPlayed: 0,
    wordsCleared: 0,
    obstaclesDestroyed: 0,
    wordChanges: 0,
  };
}

// =============================================
// ゲームロジック
// =============================================

/**
 * 指定列に落とした場合の着地行を返す。
 * その列の最も上にある障害物（一番小さい row）のひとつ上が着地行。
 * 列が空なら ROWS-1（最下段）、row0 から埋まっている場合は -1（満杯）を返す。
 *
 * 横2ブロック連結ワードの重力処理により、1つの列の中に「上は空いているのに
 * その下は埋まっている」せり出し（オーバーハング）が生じることがあるため、
 * 単純に下から最初の空きセルを探す方式では、そのせり出しの下に空いた
 * 奥まった空間（埋もれた隙間）を誤って着地位置として拾ってしまう。
 * 必ず「上から見て最初にぶつかる障害物の直上」で止まるように計算する。
 */
function landingRowForColumn(board: Board, col: number): number {
  for (let row = 0; row < ROWS; row++) {
    if (board[row][col] !== null) return row - 1;
  }
  return ROWS - 1;
}

/**
 * 指定列に言葉ブロックを落とす。row はユニットの最上段（＝1ブロック語・横2連結ではその行、
 * 縦2連結では上半分の行）。
 * width=2 → 横2連結（col, col+1）、height=2 → 縦2連結（col の row, row+1）。
 * width/height を同時に 2 にはしない。配置できない場合は null を返す。
 */
export function dropBlock(
  board: Board,
  col: number,
  word: string,
  width: 1 | 2 = 1,
  height: 1 | 2 = 1,
): { newBoard: Board; dropRow: number } | null {
  if (width === 2) {
    const rightCol = col + 1;
    if (rightCol >= COLS) return null;

    // 横2ブロック語は左右どちらか片方だけが先にぶつかる位置でユニット全体が止まる
    const dropRow = Math.min(landingRowForColumn(board, col), landingRowForColumn(board, rightCol));
    if (dropRow < 0) return null;

    const newBoard = cloneBoard(board);
    const groupId = makeId();
    const color = assignColor();
    const left: WordBlock = { id: makeId(), type: 'word', word, color, groupId, part: 0, orientation: 'h' };
    const right: WordBlock = { id: makeId(), type: 'word', word, color, groupId, part: 1, orientation: 'h' };
    newBoard[dropRow][col] = left;
    newBoard[dropRow][rightCol] = right;
    return { newBoard, dropRow };
  }

  if (height === 2) {
    // 縦2ブロック語：下段が着地する行の、その一段上に上段が来る
    const bottomRow = landingRowForColumn(board, col);
    const dropRow = bottomRow - 1;
    if (dropRow < 0) return null;

    const newBoard = cloneBoard(board);
    const groupId = makeId();
    const color = assignColor();
    const top: WordBlock = { id: makeId(), type: 'word', word, color, groupId, part: 0, orientation: 'v' };
    const bottom: WordBlock = { id: makeId(), type: 'word', word, color, groupId, part: 1, orientation: 'v' };
    newBoard[dropRow][col] = top;
    newBoard[bottomRow][col] = bottom;
    return { newBoard, dropRow };
  }

  const dropRow = landingRowForColumn(board, col);
  if (dropRow < 0) return null;

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

/**
 * 重力処理：各列のブロックを下へ詰める。
 * 2ブロック連結ワード（同じ groupId を持つ2セル）は、横向き・縦向きいずれでも
 * 必ずユニットの形を保ったまま2セル同時に1段ずつ沈める（片方だけ落ちる・止まることはない）。
 * 変化がなくなるまで反復するため、グループが無い盤面では従来の列コンパクションと同じ結果になる。
 */
export function applyGravity(board: Board): Board {
  const b = cloneBoard(board);
  let moved = true;
  while (moved) {
    moved = false;
    const visited = new Set<string>();
    for (let row = ROWS - 2; row >= 0; row--) {
      for (let col = 0; col < COLS; col++) {
        const key = `${row},${col}`;
        if (visited.has(key)) continue;
        const cell = b[row][col];
        if (!cell) continue;

        if (cell.type === 'word' && cell.groupId) {
          if (cell.orientation === 'v') {
            // 縦2連結：相方は同じ列の上下どちらか。下段の直下が空いていればユニットごと1段沈める。
            const partnerRow = cell.part === 0 ? row + 1 : row - 1;
            visited.add(key);
            if (partnerRow < 0 || partnerRow >= ROWS) continue; // 安全策（本来起こらない）
            visited.add(`${partnerRow},${col}`);
            const topRow = Math.min(row, partnerRow);
            const bottomRow = Math.max(row, partnerRow);
            const topCell = b[topRow][col];
            const bottomCell = b[bottomRow][col];
            if (bottomRow + 1 < ROWS && b[bottomRow + 1][col] === null) {
              b[bottomRow + 1][col] = bottomCell;
              b[topRow + 1][col] = topCell;
              b[topRow][col] = null;
              b[bottomRow][col] = null;
              moved = true;
            }
          } else {
            // 横2連結：相方は同じ行の左右どちらか
            const partnerCol = cell.part === 0 ? col + 1 : col - 1;
            visited.add(key);
            if (partnerCol < 0 || partnerCol >= COLS) continue; // 安全策（本来起こらない）
            visited.add(`${row},${partnerCol}`);
            const partner = b[row][partnerCol];
            if (b[row + 1][col] === null && b[row + 1][partnerCol] === null) {
              b[row + 1][col] = cell;
              b[row + 1][partnerCol] = partner;
              b[row][col] = null;
              b[row][partnerCol] = null;
              moved = true;
            }
          }
        } else {
          visited.add(key);
          if (b[row + 1][col] === null) {
            b[row + 1][col] = cell;
            b[row][col] = null;
            moved = true;
          }
        }
      }
    }
  }
  return b;
}

/** 全列の最上段がすべて埋まっていたらゲームオーバー。 */
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

/** 3分チャレンジ：消去語数に応じた時間ボーナス（秒） */
export function calcTimeBonus(matchCount: number): number {
  if (matchCount >= 6) return 20;
  if (matchCount >= 5) return 15;
  if (matchCount >= 4) return 10;
  if (matchCount >= 3) return 5;
  return 0;
}

/** 3分チャレンジ：コンボに応じた追加時間ボーナス（秒） */
export function calcComboTimeBonus(comboCount: number): number {
  if (comboCount >= 3) return 5;
  if (comboCount >= 2) return 3;
  return 0;
}

/** 3分チャレンジの残り時間上限（3分30秒） */
export const MAX_TIMED_SECONDS = 210;

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
  const dropRow = landingRowForColumn(board, col);
  if (dropRow < 0) return null;

  const newBoard = cloneBoard(board);
  newBoard[dropRow][col] = createObstacleBlock();
  return newBoard;
}

/**
 * おじゃまブロックをスポーンすべきか判定する（3分チャレンジ専用）。
 * @param timeRemaining 残り秒数
 * @param board 現在の盤面
 */
export function shouldSpawnObstacle(
  timeRemaining: number,
  board: Board,
): boolean {
  if (countObstacles(board) >= MAX_OBSTACLES) return false;
  const elapsed = Math.max(0, 180 - timeRemaining);
  if (elapsed < 40) return false;
  // 40秒後から確率が増加し、120秒後以降は最大55%に達する
  const chance = Math.min(0.55, (elapsed - 40) / 145);
  return Math.random() < chance;
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
export function processTurn(
  board: Board,
  col: number,
  word: string,
  width: 1 | 2 = 1,
  height: 1 | 2 = 1,
): TurnResult | null {
  const dropResult = dropBlock(board, col, word, width, height);
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
