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
  while (w.endsWith('ー') && w.length > 1) {
    w = w.slice(0, -1);
  }
  return normalizeChar(w[w.length - 1]);
}

/**
 * 双方向しりとり接続判定。
 * A→B（Aの末尾 = Bの先頭）または B→A（Bの末尾 = Aの先頭）のいずれかが
 * 成立すれば接続とみなす。「ん」終わりの方向はNG。
 */
function canConnect(wordA: string, wordB: string): boolean {
  const lastA = getLastChar(wordA);
  const firstA = getFirstChar(wordA);
  const lastB = getLastChar(wordB);
  const firstB = getFirstChar(wordB);

  if (lastA !== 'ん' && lastA === firstB) return true; // A → B
  if (lastB !== 'ん' && lastB === firstA) return true; // B → A
  return false;
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
// 双方向しりとりグラフの連結成分探索
// =============================================

/**
 * 盤面内の言葉ブロックを双方向しりとりグラフとしてモデル化し、
 * 連結成分が 3 ユニット以上のブロックをすべて消去対象として返す。
 *
 * 「ユニット」＝ 単独語（1セル）または横2ブロック連結ワード（groupId で紐づく2セル）。
 * 2ブロック連結ワードは常に1つの単語ユニットとして扱われ、
 * どちらのセル経由で隣接しても同じユニットとして接続判定される。
 *
 * 接続条件：
 *   - ユニットを構成するいずれかのセルが8方向で隣接している
 *   - A→B または B→A のしりとりが成立する（双方向）
 *
 * これにより V字・L字・ジグザグ・枝分かれなど任意の形状でも消去できる。
 * 同一チェーン内でユニットを重複使用しない（BFS で 1 度しか訪問しない）。
 * 消去対象として返す座標は、マッチしたユニットが持つ全セル
 * （2ブロックワードなら常に2セルとも）。
 */
export function findMatchedPositions(board: Board): [number, number][] {
  // セル座標 → ユニットID、ユニットID → { 単語, セル座標一覧 }
  const posToUnit = new Map<string, string>();
  const unitPositions = new Map<string, [number, number][]>();
  const unitWord = new Map<string, string>();

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = board[r][c];
      if (!cell || cell.type !== 'word') continue;
      const unitId = cell.groupId ?? `${r},${c}`;
      posToUnit.set(`${r},${c}`, unitId);
      if (!unitPositions.has(unitId)) {
        unitPositions.set(unitId, []);
        unitWord.set(unitId, cell.word);
      }
      unitPositions.get(unitId)!.push([r, c]);
    }
  }

  const unitIds = Array.from(unitPositions.keys());

  // 無向隣接グラフを構築（ユニット単位・双方向で辺を貼る）
  const adj = new Map<string, Set<string>>();
  for (const id of unitIds) adj.set(id, new Set());

  for (const id of unitIds) {
    const word = unitWord.get(id)!;
    for (const [r, c] of unitPositions.get(id)!) {
      for (const [dr, dc] of NEIGHBORS_8) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        const nUnitId = posToUnit.get(`${nr},${nc}`);
        if (!nUnitId || nUnitId === id) continue; // 未占有・同一ユニットは無視

        const nWord = unitWord.get(nUnitId)!;
        if (canConnect(word, nWord)) {
          adj.get(id)!.add(nUnitId);
          adj.get(nUnitId)!.add(id); // 双方向
        }
      }
    }
  }

  // BFS で連結成分を列挙し、ユニット数 3 以上を消去対象に追加
  const visited = new Set<string>();
  const matchedUnits = new Set<string>();

  for (const start of unitIds) {
    if (visited.has(start)) continue;

    const component: string[] = [];
    const queue: string[] = [start];
    visited.add(start);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      component.push(cur);
      for (const neighbor of adj.get(cur)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length >= 3) {
      for (const id of component) matchedUnits.add(id);
    }
  }

  const result: [number, number][] = [];
  for (const id of matchedUnits) {
    for (const pos of unitPositions.get(id)!) result.push(pos);
  }
  return result;
}

// =============================================
// ヒント列の特定
// =============================================

/**
 * 次の言葉を各列にシミュレート配置し、
 * 連結成分が 3 語以上になる列を返す（双方向判定ベース）。
 */
export function findHintCol(board: Board, word: string): number | null {
  for (let col = 0; col < COLS; col++) {
    let dropRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (board[row][col] === null) {
        dropRow = row;
        break;
      }
    }
    if (dropRow === -1) continue;

    const sim: Board = board.map(r => [...r]);
    sim[dropRow][col] = { id: '__hint__', type: 'word', word, color: '' };

    if (findMatchedPositions(sim).length >= 3) {
      return col;
    }
  }
  return null;
}
