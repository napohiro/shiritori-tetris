export const COLS = 8;
export const ROWS = 12;
export const MAX_OBSTACLES = 3;
export const OBSTACLE_BREAK_BONUS = 500;

// =============================================
// ブロック型
// =============================================

export interface WordBlock {
  id: string;
  type: 'word';
  word: string;
  color: string;
  // 2ブロック連結ワード用（単独語の場合はすべて undefined）
  groupId?: string;
  part?: 0 | 1; // 横: 0=左半分/1=右半分、縦: 0=上半分/1=下半分
  orientation?: 'h' | 'v'; // h = 横2連結, v = 縦2連結
}

// =============================================
// ユニット座標ユーティリティ
// =============================================

/**
 * 1ブロック語（1x1）／横2連結（幅2高さ1）／縦2連結（幅1高さ2）の
 * いずれの形状も、この1つの関数だけを唯一の座標計算ソースとして扱う。
 * row/col はユニットの左上（＝横の場合は左端、縦の場合は上端）を表す。
 */
export function unitCells(
  row: number,
  col: number,
  width: 1 | 2,
  height: 1 | 2,
): [number, number][] {
  const cells: [number, number][] = [];
  for (let dr = 0; dr < height; dr++) {
    for (let dc = 0; dc < width; dc++) {
      cells.push([row + dr, col + dc]);
    }
  }
  return cells;
}

export interface ObstacleBlock {
  id: string;
  type: 'obstacle';
  hp: number; // 2 = 無傷, 1 = ひび割れ, 0 = 破壊済（盤面から除去）
}

export type GameBlock = WordBlock | ObstacleBlock;
export type Cell = GameBlock | null;
export type Board = Cell[][];

// =============================================
// ゲームモード（3分チャレンジ / 3分チャレンジ【中】）
// =============================================

export type GameMode = 'timed' | 'timed-medium';

export type Screen = 'top' | 'game';

// =============================================
// ゲーム状態
// =============================================

export interface GameState {
  board: Board;
  wordQueue: string[];
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  screen: Screen;
  mode: GameMode;
  timeRemaining: number;
  isTimeUp: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  // プレイ統計
  turnsPlayed: number;
  wordsCleared: number;
  obstaclesDestroyed: number;
  wordChanges: number;
}
