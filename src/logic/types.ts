export const COLS = 8;
export const ROWS = 10;

export interface WordBlock {
  id: string;
  word: string;
  color: string;
  isMatched?: boolean;
  isFalling?: boolean;
}

export type Cell = WordBlock | null;
export type Board = Cell[][];

export type Screen = 'top' | 'game';

export interface GameState {
  board: Board;
  currentWord: string;
  nextWord: string;
  wordQueue: string[];
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  selectedCol: number | null;
  screen: Screen;
  isGameOver: boolean;
  isPaused: boolean;
  matchedCells: [number, number][];
  showCombo: boolean;
  hintCol: number | null;
}
