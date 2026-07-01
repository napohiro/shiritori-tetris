import { useState } from 'react';
import { RankingEntry, loadRanking, MAX_RANKING } from '../logic/ranking';
import { GameMode } from '../logic/types';

const MEDAL = ['🥇', '🥈', '🥉'];

const MODE_LABEL: Record<GameMode, string> = {
  timed: '3分チャレンジ',
  'timed-medium': '3分チャレンジ【中】',
};

interface Props {
  initialMode?: GameMode;
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

export default function RankingModal({ initialMode = 'timed', onClose }: Props) {
  const [mode, setMode] = useState<GameMode>(initialMode);
  const ranking = loadRanking(mode);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box ranking-modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">ランキング</h2>

        <div className="ranking-mode-tabs">
          {(Object.keys(MODE_LABEL) as GameMode[]).map(m => (
            <button
              key={m}
              className={['ranking-mode-tab', mode === m ? 'active' : ''].filter(Boolean).join(' ')}
              onClick={() => setMode(m)}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

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
