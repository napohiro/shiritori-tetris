import { Board, COLS, ROWS } from './types';

const SMALL_TO_LARGE: Record<string, string> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
};

function normalizeChar(ch: string): string {
  return SMALL_TO_LARGE[ch] ?? ch;
}

function getFirstChar(word: string): string {
  return normalizeChar(word[0]);
}

function getLastChar(word: string): string {
  let w = word;
  while (w.endsWith('ー') && w.length > 1) {
    w = w.slice(0, -1);
  }
  return normalizeChar(w[w.length - 1]);
}

function canChain(prev: string, next: string): boolean {
  const lastOfPrev = getLastChar(prev);
  if (lastOfPrev === 'ん') return false;
  return lastOfPrev === getFirstChar(next);
}

/**
 * Find all maximal contiguous shiritori sequences of length >= 3 in an ordered
 * word list. Returns arrays of indices into `words`.
 */
function findChainRuns(words: string[]): number[][] {
  const result: number[][] = [];
  let i = 0;
  while (i < words.length) {
    let j = i + 1;
    while (j < words.length && canChain(words[j - 1], words[j])) {
      j++;
    }
    if (j - i >= 3) {
      result.push(Array.from({ length: j - i }, (_, k) => i + k));
    }
    i++;
  }
  return result;
}

const DIRS: [number, number][] = [
  [0,  1],  // right
  [1,  0],  // down
  [1,  1],  // down-right
  [1, -1],  // down-left
];

/**
 * Returns all board positions that are part of a matching shiritori chain (3+).
 */
export function findMatchedPositions(board: Board): [number, number][] {
  const matched = new Set<string>();

  for (const [dr, dc] of DIRS) {
    // Iterate over all line start positions for this direction
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Skip if a valid predecessor exists (not a line start)
        const pr = r - dr;
        const pc = c - dc;
        if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) continue;

        // Traverse the entire line; split into contiguous non-null segments
        const segments: [number, number][][] = [];
        let seg: [number, number][] = [];
        let rr = r;
        let cc = c;

        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
          if (board[rr][cc] !== null) {
            seg.push([rr, cc]);
          } else {
            if (seg.length >= 3) segments.push(seg);
            seg = [];
          }
          rr += dr;
          cc += dc;
        }
        if (seg.length >= 3) segments.push(seg);

        // Check each segment in both directions
        for (const s of segments) {
          const words = s.map(([row, col]) => board[row][col]!.word);

          // Forward
          for (const run of findChainRuns(words)) {
            for (const idx of run) {
              matched.add(`${s[idx][0]},${s[idx][1]}`);
            }
          }

          // Backward
          const revWords = [...words].reverse();
          for (const run of findChainRuns(revWords)) {
            for (const idx of run) {
              const actualIdx = s.length - 1 - idx;
              matched.add(`${s[actualIdx][0]},${s[actualIdx][1]}`);
            }
          }
        }
      }
    }
  }

  return Array.from(matched).map(key => {
    const [row, col] = key.split(',').map(Number);
    return [row, col] as [number, number];
  });
}

/**
 * Find a hint column: a column where placing `word` might contribute to a chain.
 */
export function findHintCol(board: Board, word: string): number | null {
  const firstChar = getFirstChar(word);
  const lastChar = getLastChar(word);

  for (let col = 0; col < COLS; col++) {
    let dropRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        dropRow = row;
        break;
      }
    }
    if (dropRow === -1) continue;

    const adjacents: [number, number][] = [
      [dropRow - 1, col],
      [dropRow,     col - 1],
      [dropRow,     col + 1],
      [dropRow - 1, col - 1],
      [dropRow - 1, col + 1],
    ];

    for (const [nr, nc] of adjacents) {
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      const neighbor = board[nr][nc];
      if (!neighbor) continue;
      const nLast  = getLastChar(neighbor.word);
      const nFirst = getFirstChar(neighbor.word);
      if (nLast === firstChar || lastChar === nFirst) {
        return col;
      }
    }
  }
  return null;
}
