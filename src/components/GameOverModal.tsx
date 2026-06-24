import { GameMode, OBSTACLE_BREAK_BONUS } from '../logic/types';

interface Props {
  score: number;
  bestScore: number;
  maxCombo: number;
  mode: GameMode;
  isTimeUp: boolean;
  wordsCleared: number;
  obstaclesDestroyed: number;
  rankPosition: number | null;  // 今回の順位（null=圏外）
  onRestart: () => void;
  onTop: () => void;
  onShowRanking: () => void;
}

export default function GameOverModal({
  score,
  bestScore,
  maxCombo,
  mode,
  isTimeUp,
  wordsCleared,
  obstaclesDestroyed,
  rankPosition,
  onRestart,
  onTop,
  onShowRanking,
}: Props) {
  const isNewBest = score > 0 && score >= bestScore;
  const title = isTimeUp ? 'TIME UP!' : 'GAME OVER';
  const titleClass = isTimeUp ? 'gameover-title timeup' : 'gameover-title';
  const modeLabel = mode === 'timed' ? '3分チャレンジ' : 'エンドレス';

  return (
    <div className="modal-overlay">
      <div className="modal-box gameover">
        <div className="go-mode-badge">{modeLabel}</div>
        <h2 className={`modal-title ${titleClass}`}>{title}</h2>

        {/* ランキング入り通知（NEWBESTより優先表示） */}
        {rankPosition !== null ? (
          <div className="ranking-in-badge">
            &#127942; ランキング {rankPosition}位 入り！
          </div>
        ) : isNewBest ? (
          <div className="new-best-badge">NEW BEST!</div>
        ) : null}

        <div className="gameover-scores">
          <div className="go-score-row">
            <span className="go-label">SCORE</span>
            <span className="go-value">{score.toLocaleString()}</span>
          </div>
          <div className="go-score-row">
            <span className="go-label">BEST</span>
            <span className="go-value">{bestScore.toLocaleString()}</span>
          </div>
          {maxCombo >= 2 && (
            <div className="go-score-row">
              <span className="go-label">MAX COMBO</span>
              <span className="go-value go-combo">×{maxCombo}</span>
            </div>
          )}
          <div className="go-score-row">
            <span className="go-label">消去語数</span>
            <span className="go-value">{wordsCleared}語</span>
          </div>
          {obstaclesDestroyed > 0 && (
            <div className="go-score-row">
              <span className="go-label">おじゃま破壊</span>
              <span className="go-value go-obstacle">
                {obstaclesDestroyed}個
                <span className="go-bonus"> +{(obstaclesDestroyed * OBSTACLE_BREAK_BONUS).toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>

        <div className="go-buttons">
          <button className="btn-primary" onClick={onRestart}>
            もう一度
          </button>
          <button className="btn-secondary go-ranking-btn" onClick={onShowRanking}>
            ランキングを見る
          </button>
          <button className="btn-secondary" onClick={onTop}>
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  );
}
