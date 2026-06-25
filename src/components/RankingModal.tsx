import { RankingEntry, loadRanking, MAX_RANKING } from '../logic/ranking';

const MEDAL = ['🥇', '🥈', '🥉'];

interface Props {
  onClose: () => void;
}

function RankingRow({ entry, rank }: { entry: RankingEntry; rank: number }) {
  const isTop3 = rank <= 3;
  return (
    <li className={['ranking-row', isTop3 ? `rank-top-${rank}` : ''].filter(Boolean).join(' ')}>
      <span className="rank-num">
        {rank <= 3 ? MEDAL[rank - 1] : rank}
      </span>
      <div className="rank-body">
        <span className="rank-score">{entry.score.toLocaleString()}</span>
        <div className="rank-stats">
          {entry.maxCombo >= 2 && <span>×{entry.maxCombo}コンボ</span>}
          <span>{entry.wordsCleared}語</span>
          {entry.obstaclesDestroyed > 0 && (
            <span>&#9632;{entry.obstaclesDestroyed}破壊</span>
          )}
          {entry.wordChanges > 0 && (
            <span>変更{entry.wordChanges}回</span>
          )}
        </div>
        <span className="rank-date">{entry.date}</span>
      </div>
    </li>
  );
}

export default function RankingModal({ onClose }: Props) {
  const ranking = loadRanking();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ranking-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">ランキング</h2>
        <p className="ranking-mode-label">3分チャレンジ</p>

        <div className="ranking-list-wrap">
          {ranking.length === 0 ? (
            <p className="ranking-empty">まだ記録がありません</p>
          ) : (
            <ol className="ranking-list">
              {ranking.map((entry, i) => (
                <RankingRow key={i} entry={entry} rank={i + 1} />
              ))}
            </ol>
          )}
          {ranking.length > 0 && (
            <p className="ranking-cap">上位{MAX_RANKING}件を表示</p>
          )}
        </div>

        <button className="btn-primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
