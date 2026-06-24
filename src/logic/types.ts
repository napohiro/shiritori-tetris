export const COLS = 8;
export const ROWS = 10;
export const HAND_SIZE = 3;
export const SHUFFLE_LIMIT = 3;

export interface WordBlock {
  id: string;
  word: string;
  color: string;
}

export type Cell = WordBlock | null;
export type Board = Cell[][];

export type Screen = 'top' | 'game';

export interface GameState {
  board: Board;
  hand: string[];               // 3枚の手札
  selectedHandIndex: number | null;
  wordQueue: string[];
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  shuffleRemaining: number;     // 残シャッフル回数
  selectedCol: number | null;
  screen: Screen;
  isGameOver: boolean;
  isPaused: boolean;
  hintCol: number | null;
}
