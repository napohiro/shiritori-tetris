// =============================================
// 型定義
// =============================================

export interface RankingEntry {
  score: number;
  maxCombo: number;
  wordsCleared: number;
  obstaclesDestroyed: number;
  wordChanges: number;
  date: string; // 表示用日時文字列
}

// =============================================
// 定数
// =============================================

export const MAX_RANKING = 10;

const RANKING_KEY = 'shiritori-tetris-ranking-3min';

// =============================================
// バリデーション
// =============================================

function isValidEntry(v: unknown): v is Omit<RankingEntry, 'wordChanges'> & { wordChanges?: number } {
  if (!v || typeof v !== 'object') return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.score === 'number' &&
    typeof e.maxCombo === 'number' &&
    typeof e.wordsCleared === 'number' &&
    typeof e.obstaclesDestroyed === 'number' &&
    typeof e.date === 'string'
  );
}

// =============================================
// 読み書き
// =============================================

export function loadRanking(): RankingEntry[] {
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidEntry)
      .map(e => ({ ...e, wordChanges: e.wordChanges ?? 0 }))
      .slice(0, MAX_RANKING);
  } catch {
    return [];
  }
}

function saveRanking(entries: RankingEntry[]): void {
  try {
    localStorage.setItem(RANKING_KEY, JSON.stringify(entries));
  } catch { /* StorageError — 無視 */ }
}

// =============================================
// エントリ追加
// =============================================

/**
 * 今回の結果をランキングに追加し、
 * 上位10件に入った場合はその順位（1-based）を返す。
 * score が 0 以下の場合は保存しない。
 */
export function addRankingEntry(
  data: {
    score: number;
    maxCombo: number;
    wordsCleared: number;
    obstaclesDestroyed: number;
    wordChanges: number;
  },
): number | null {
  if (data.score <= 0) return null;

  const now = new Date();
  const date = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const newEntry: RankingEntry = { ...data, date };

  const existing = loadRanking();
  const combined = [...existing, newEntry].sort((a, b) => b.score - a.score);

  // 新エントリの順位（参照同一性で探す）
  const rankIndex = combined.indexOf(newEntry);
  const rank = rankIndex >= 0 && rankIndex < MAX_RANKING ? rankIndex + 1 : null;

  // 上位10件だけ保存
  saveRanking(combined.slice(0, MAX_RANKING));

  return rank;
}
