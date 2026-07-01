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
  // 横2ブロック連結ワード用（単独語の場合は両方 undefined）
  groupId?: string;
  part?: 0 | 1; // 0 = 左半分, 1 = 右半分
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
