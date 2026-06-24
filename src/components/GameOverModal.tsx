interface Props {
  score: number;
  bestScore: number;
  maxCombo: number;
  onRestart: () => void;
}

export default function GameOverModal({ score, bestScore, maxCombo, onRestart }: Props) {
  const isNewBest = score > 0 && score >= bestScore;

  return (
    <div className="modal-overlay">
      <div className="modal-box gameover">
        <h2 className="modal-title gameover-title">GAME OVER</h2>

        {isNewBest && (
          <div className="new-best-badge">NEW BEST!</div>
        )}

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
        </div>

        <button className="btn-primary" onClick={onRestart}>
          もう一度遊ぶ
        </button>
      </div>
    </div>
  );
}
