interface Props {
  score: number;
  bestScore: number;
  combo: number;
}

export default function ScoreBar({ score, bestScore, combo }: Props) {
  return (
    <div className="score-bar">
      <div className="score-item">
        <span className="score-label">SCORE</span>
        <span className="score-value">{score.toLocaleString()}</span>
      </div>
      <div className="score-item center">
        {combo >= 2 && (
          <div className="combo-badge">
            COMBO ×{combo}
          </div>
        )}
      </div>
      <div className="score-item right">
        <span className="score-label">BEST</span>
        <span className="score-value">{bestScore.toLocaleString()}</span>
      </div>
    </div>
  );
}
