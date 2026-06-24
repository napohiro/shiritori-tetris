import { GameMode } from '../logic/types';
import TimerDisplay from './TimerDisplay';

interface Props {
  score: number;
  bestScore: number;
  combo: number;
  maxCombo: number;
  mode: GameMode;
  timeRemaining: number;
  timerBonusGlow?: boolean;
}

export default function ScoreBar({ score, bestScore, combo, maxCombo, mode, timeRemaining, timerBonusGlow = false }: Props) {
  return (
    <div className="score-bar">
      <div className="score-item">
        <span className="score-label">SCORE</span>
        <span className="score-value">{score.toLocaleString()}</span>
      </div>

      <div className="score-item center">
        {mode === 'timed' ? (
          <TimerDisplay
            timeRemaining={timeRemaining}
            mode={mode}
            bonusGlow={timerBonusGlow}
          />
        ) : (
          combo >= 2 && (
            <div className="combo-badge" key={combo}>
              COMBO ×{combo}
            </div>
          )
        )}
      </div>

      <div className="score-item right">
        <span className="score-label">BEST</span>
        <span className="score-value">{bestScore.toLocaleString()}</span>
        {maxCombo >= 2 && (
          <span className="max-combo-label">MAX ×{maxCombo}</span>
        )}
      </div>
    </div>
  );
}
