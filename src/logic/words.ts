export const WORD_LIST: string[] = [
  'ねこ', 'こあら', 'らっぱ', 'ぱんだ', 'だるま', 'まくら',
  'らいおん', 'おに', 'にんじん', 'きつね', 'ねずみ', 'みかん',
  'かめ', 'めだか', 'かさ', 'さる', 'るすばん', 'ばんそうこう',
  'うさぎ', 'ぎんなん', 'なす', 'すいか', 'かえる', 'るり',
  'りす', 'すずめ', 'めろん', 'のり', 'りんご', 'ごりら',
  'らくだ', 'だんご', 'ごま', 'まめ', 'めがね', 'ねぎ',
  'ぎゅうにゅう', 'うし', 'しまうま', 'まんと', 'とまと',
  'とけい', 'いぬ', 'ぬの', 'のこぎり',
];

const BLOCK_COLORS = [
  '#4a90d9', '#7b68ee', '#48c774', '#f39c12',
  '#e74c6c', '#1abc9c', '#e67e22', '#9b59b6',
  '#3498db', '#2ecc71', '#f1c40f', '#e91e63',
];

let colorIndex = 0;

export function assignColor(): string {
  const color = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
  colorIndex++;
  return color;
}

export function shuffleWords(words: string[]): string[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createWordQueue(): string[] {
  const shuffled = shuffleWords(WORD_LIST);
  return [...shuffled, ...shuffleWords(WORD_LIST), ...shuffleWords(WORD_LIST)];
}
