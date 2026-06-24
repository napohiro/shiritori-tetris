import { Board, Cell, COLS, GameState, ROWS, WordBlock } from './types';
import { assignColor, createWordQueue } from './words';
import { findMatchedPositions } from './shiritori';

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
    currentWord: queue[0],
    nextWord: queue[1],
    wordQueue: queue.slice(2),
    score: 0,
    bestScore: 0,
    combo: 0,
    maxCombo: 0,
    selectedCol: null,
    screen: 'top',
    isGameOver: false,
    isPaused: false,
    matchedCells: [],
    showCombo: false,
    hintCol: null,
  };
}

/** Drop a word into a column. Returns null if column is full (game over). */
export function dropBlock(board: Board, col: number, word: string): { newBoard: Board; dropRow: number } | null {
  let dropRow = -1;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) {
      dropRow = row;
      break;
    }
  }
  if (dropRow === -1) return null;

  const newBoard = cloneBoard(board);
  const block: WordBlock = {
    id: makeId(),
    word,
    color: assignColor(),
  };
  newBoard[dropRow][col] = block;
  return { newBoard, dropRow };
}

/** Apply gravity: cells fall to fill gaps. */
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
    // Place blocks from bottom
    for (let i = 0; i < blocks.length; i++) {
      newBoard[ROWS - 1 - i][col] = blocks[i];
    }
  }
  return newBoard;
}

/** Remove matched cells from board. */
export function removeMatched(board: Board, matched: [number, number][]): Board {
  const newBoard = cloneBoard(board);
  for (const [r, c] of matched) {
    newBoard[r][c] = null;
  }
  return newBoard;
}

/** Check if the board is in game-over state (all columns are full). */
export function isGameOver(board: Board): boolean {
  return board[0].every(cell => cell !== null);
}

/** Calculate score for a match result. */
export function calcScore(matchCount: number, combo: number): number {
  const base = matchCount * 100;
  const multiplier = Math.max(1, combo);
  return base * multiplier;
}

/**
 * Process a full turn: drop block → find matches → remove → gravity → chain.
 * Returns intermediate states for animation.
 */
export interface TurnResult {
  boardAfterDrop: Board;
  chains: ChainStep[];
  totalScore: number;
  comboCount: number;
}

export interface ChainStep {
  matched: [number, number][];
  boardAfterRemoval: Board;
  boardAfterGravity: Board;
  scoreGain: number;
}

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

    chains.push({
      matched,
      boardAfterRemoval,
      boardAfterGravity,
      scoreGain,
    });

    current = boardAfterGravity;
  }

  return {
    boardAfterDrop: dropResult.newBoard,
    chains,
    totalScore,
    comboCount,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/** Get available (non-full) columns. */
export function availableCols(board: Board): number[] {
  return Array.from({ length: COLS }, (_, i) => i).filter(
    col => board[0][col] === null
  );
}
