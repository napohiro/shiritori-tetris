import type { Board } from './types';

// ─── 文字正規化（小書き仮名 → 通常仮名）──────────────────
const SMALL_TO_LARGE: Record<string, string> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ',
};

export function getFirstKana(word: string): string {
  return SMALL_TO_LARGE[word[0]] ?? word[0];
}

export function getLastKana(word: string): string {
  let w = word;
  while (w.endsWith('ー') && w.length > 1) w = w.slice(0, -1);
  const last = w[w.length - 1];
  return SMALL_TO_LARGE[last] ?? last;
}

// ─── 単語リスト（190語超・ん終わり除外）──────────────────
// 2〜5文字、身近な語、各文字への接続を意識して選定
export const WORD_LIST: string[] = [
  // 動物
  'ねこ', 'こあら', 'うさぎ', 'きつね', 'ねずみ',
  'かめ', 'かえる', 'りす', 'すずめ', 'めだか',
  'ごりら', 'しまうま', 'いぬ', 'うし', 'しか',
  'かに', 'にわとり', 'はと', 'ひつじ', 'いるか',
  'もぐら', 'らっこ', 'くじら', 'ろば', 'たぬき',
  'へび', 'さる', 'あひる', 'とら', 'らくだ',
  'ぞう', 'うぐいす', 'かわうそ', 'ほたる', 'まぐろ',
  'かつお', 'えび', 'たこ', 'いか', 'さめ',
  'こうもり', 'ひぐま', 'つばめ', 'みつばち', 'くわがた',
  'とかげ', 'やもり', 'なまず', 'ふくろう', 'きじ',
  'うなぎ', 'さわら', 'はまち', 'ぶり', 'ひらめ',
  'あゆ', 'こい', 'まんぼう', 'むかで', 'さい',
  'さんま', 'いわし', 'あじ', 'さば', 'ます',
  'とびうお', 'ほっけ', 'かまきり', 'うみうし',
  'おに', 'つる', 'かげ',
  // 食べ物・食材
  'すいか', 'りんご', 'いちご', 'ぶどう', 'もも',
  'なし', 'かき', 'くり', 'いも', 'きゅうり',
  'たまご', 'さかな', 'とうふ', 'みそ', 'そば',
  'おにぎり', 'てんぷら', 'だんご', 'ごま', 'まめ',
  'なっとう', 'こんぶ', 'わかめ', 'かぼちゃ', 'しいたけ',
  'えのき', 'まつたけ', 'おかし', 'すし', 'もち',
  'まんじゅう', 'いちじく', 'たけのこ', 'こんにゃく',
  'ごぼう', 'さといも', 'たい', 'なす', 'のり',
  'くるみ', 'だいず', 'もずく', 'さつまいも',
  'かゆ', 'さゆ', 'こむぎ',
  // 乗り物
  'くるま', 'でんしゃ', 'ひこうき', 'ふね', 'ばす',
  'たくしー', 'とらっく', 'きしゃ',
  // 自然・天気・植物
  'やま', 'かわ', 'うみ', 'ほし', 'つき',
  'くも', 'あめ', 'ゆき', 'かぜ', 'もり',
  'はな', 'いわ', 'すな', 'たき', 'にじ',
  'ひかり', 'そら', 'さくら', 'ひまわり', 'たんぽぽ',
  'もみじ', 'あさがお', 'ちゅうりっぷ', 'やなぎ', 'ばら',
  'みず', 'あられ', 'はれ', 'ひので',
  // 道具・生活用品・おもちゃ
  'まくら', 'めがね', 'かさ', 'はさみ', 'えんぴつ',
  'けしごむ', 'てぶくろ', 'くつした', 'ぼうし', 'さいふ',
  'でんち', 'おてら', 'おしろ', 'いえ', 'つくえ',
  'いす', 'たいこ', 'てんき', 'はなび', 'おまつり',
  'とんぼ', 'えんそく', 'きのこ', 'おはし', 'さら',
  'なべ', 'ろうそく', 'はしご', 'かがみ', 'ふえ',
  'むしめがね', 'ほうき', 'とびばこ', 'なわとび', 'ぶらんこ',
  'おにごっこ', 'しゃぼんだま', 'くつ', 'ぬいぐるみ', 'でんわ',
  'れいぞうこ', 'てれび', 'うちわ', 'ふだ', 'おもちゃ',
  'よっと', 'かくれんぼ', 'ぬの', 'のこぎり',
  'らっぱ', 'だるま', 'ぱんだ', 'ねぎ', 'ぎゅうにゅう',
  'まんと', 'とまと', 'そうじき', 'るり',
];

// ─── 後方互換（gameLogic の createInitialState で利用）──────
export function createWordQueue(): string[] {
  const arr = [...WORD_LIST];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── ブロックカラー（白文字で3:1以上のコントラスト比を確保した深みのある色）────
const BLOCK_COLORS = [
  '#2470c0', // ディープブルー
  '#5e46ce', // ディープインディゴ
  '#20904a', // フォレストグリーン
  '#c47800', // ダークアンバー
  '#c42448', // クリムゾン
  '#0e9078', // ダークティール
  '#bc5400', // バーントオレンジ
  '#7c38a8', // ディープパープル
  '#1a78c0', // コバルトブルー
  '#168c4c', // エメラルドグリーン
  '#9a7000', // ダークゴールド（旧 #f1c40f を大幅に深色化）
  '#c20058', // ディープピンク
];
let colorIndex = 0;
export function assignColor(): string {
  const color = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
  colorIndex++;
  return color;
}

// ─── 盤面上の接続文字を取得 ──────────────────────────────
// tails: 盤面の単語が「終わる文字」（次に来る単語の先頭と合わせる）
// heads: 盤面の単語が「始まる文字」（置いた単語の末尾がこれなら後ろにつながる）
function getBoardConnectionChars(board: Board): { tails: Set<string>; heads: Set<string> } {
  const tails = new Set<string>();
  const heads = new Set<string>();
  for (const row of board) {
    for (const cell of row) {
      if (!cell || cell.type !== 'word') continue;
      const t = getLastKana(cell.word);
      const h = getFirstKana(cell.word);
      if (t !== 'ん') tails.add(t);
      if (h !== 'ん') heads.add(h);
    }
  }
  return { tails, heads };
}

// ─── スマートワード選択 ──────────────────────────────────
// 盤面のしりとり接続を考慮して、つながりやすい単語を優先的に返す
// 確率: 65% 盤面接続優先 / 35% 全体ランダム（ん終わり回避）
export function pickSmartWord(
  board: Board,
  exclude: string | null,
  list: string[],
): string {
  // ん終わりを除いた候補
  const candidates = list.filter(w => w !== exclude && getLastKana(w) !== 'ん');
  const pool = candidates.length > 0 ? candidates : list.filter(w => w !== exclude);
  if (pool.length === 0) return list[0];

  const { tails, heads } = getBoardConnectionChars(board);

  // 盤面が空ならランダム
  if (tails.size === 0 && heads.size === 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // highValue: 盤面の末尾に先頭がつながる OR 盤面の先頭に末尾がつながる
  const highValue = pool.filter(w => {
    const first = getFirstKana(w);
    const last = getLastKana(w);
    return tails.has(first) || heads.has(last);
  });

  if (Math.random() < 0.65 && highValue.length > 0) {
    return highValue[Math.floor(Math.random() * highValue.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── NEXTワード選択 ─────────────────────────────────────
// currentWord の末尾文字から始まる単語を50%優先し、それ以外はスマート選択
export function pickNextWord(
  currentWord: string,
  board: Board,
  exclude: string | null,
  list: string[],
): string {
  const currentLast = getLastKana(currentWord);
  const candidates = list.filter(
    w => w !== exclude && w !== currentWord && getLastKana(w) !== 'ん',
  );
  const safePool = candidates.length > 0 ? candidates : list.filter(w => w !== exclude && w !== currentWord);

  // 50%の確率で、現在の単語に直接しりとりチェーンできる単語を出す
  if (currentLast !== 'ん' && Math.random() < 0.5) {
    const chainable = safePool.filter(w => getFirstKana(w) === currentLast);
    if (chainable.length > 0) {
      return chainable[Math.floor(Math.random() * chainable.length)];
    }
  }

  return pickSmartWord(board, exclude, list);
}
