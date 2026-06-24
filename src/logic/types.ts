export const COLS = 8;
export const ROWS = 10;
export const HAND_SIZE = 3;
export const SHUFFLE_LIMIT = 3;
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
// ゲームモード
// =============================================

export type GameMode = 'endless' | 'timed';

export type Screen = 'top' | 'game';

// =============================================
// ゲーム状態
// =============================================

export interface GameState {
  board: Board;
  hand: string[];
  selectedHandIndex: number | null;
  wordQueue: string[];
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  shuffleRemaining: number;
  selectedCol: number | null;
  screen: Screen;
  mode: GameMode;
  timeRemaining: number;   // 秒数：timed=60スタート, endless=0（未使用）
  isTimeUp: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  hintCol: number | null;
  // プレイ統計
  turnsPlayed: number;
  wordsCleared: number;
  obstaclesDestroyed: number;
}
