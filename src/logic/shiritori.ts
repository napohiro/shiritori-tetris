import { Board, COLS, ROWS } from './types';

// =============================================
// 文字正規化
// =============================================

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
  // 末尾の長音符を除去して直前の文字を使う
  while (w.endsWith('ー') && w.length > 1) {
    w = w.slice(0, -1);
  }
  return normalizeChar(w[w.length - 1]);
}

/** prev の末尾と next の先頭が一致するかチェック（「ん」終わりはNG）*/
function canChain(prev: string, next: string): boolean {
  const last = getLastChar(prev);
  if (last === 'ん') return false;
  return last === getFirstChar(next);
}

// =============================================
// 8方向隣接リスト
// =============================================

const NEIGHBORS_8: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [ 0, -1],          [ 0, 1],
  [ 1, -1], [ 1, 0], [ 1, 1],
];

// =============================================
// グラフ DFS でしりとりチェーンを探索
// =============================================

/**
 * 盤面をグラフとして DFS 探索し、
 * 「8方向隣接 + しりとり接続」で3語以上つながる経路上の
 * 全セルを返す。チェーンは一直線でなくてよい（L字・ジグザグ可）。
 */
export function findMatchedPositions(board: Board): [number, number][] {
  const matched = new Set<string>();

  function dfs(
    r: number,
    c: number,
    path: [number, number][],
    inPath: Set<string>,
  ): void {
    const key = `${r},${c}`;
    inPath.add(key);
    path.push([r, c]);

    // 3語以上に達したらパス上の全セルを消去対象に追加
    if (path.length >= 3) {
      for (const [pr, pc] of path) {
        matched.add(`${pr},${pc}`);
      }
    }

    const word = board[r][c]!.word;

    // 8方向の隣接セルへ伸ばせるか試みる
    for (const [dr, dc] of NEIGHBORS_8) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (board[nr][nc] === null) continue;
      const nKey = `${nr},${nc}`;
      if (inPath.has(nKey)) continue; // 同一チェーン内での重複禁止
      if (canChain(word, board[nr][nc]!.word)) {
        dfs(nr, nc, path, inPath);
      }
    }

    // バックトラック
    path.pop();
    inPath.delete(key);
  }

  // 全セルを起点として DFS
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === null) continue;
      dfs(r, c, [], new Set<string>());
    }
  }

  return Array.from(matched).map(key => {
    const [row, col] = key.split(',').map(Number);
    return [row, col] as [number, number];
  });
}

// =============================================
// ヒント列の特定
// =============================================

/**
 * 次の言葉を各列にシミュレート配置し、
 * 3語以上のチェーンが成立する列を探して返す。
 * 新ルール（曲がりOK）に対応した正確な判定を行う。
 */
export function findHintCol(board: Board, word: string): number | null {
  for (let col = 0; col < COLS; col++) {
    // 落下先の行を特定
    let dropRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        dropRow = row;
        break;
      }
    }
    if (dropRow === -1) continue; // 列が満杯

    // 仮配置してマッチ判定
    const sim: Board = board.map(r => [...r]);
    sim[dropRow][col] = { id: '__hint__', word, color: '' };

    if (findMatchedPositions(sim).length >= 3) {
      return col;
    }
  }
  return null;
}
