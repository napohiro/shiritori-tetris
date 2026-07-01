import { GameMode } from '../logic/types';

interface Props {
  timeRemaining: number;
  mode: GameMode;
  bonusGlow?: boolean;
}

export default function TimerDisplay({ timeRemaining, mode, bonusGlow = false }: Props) {
  if (mode !== 'timed' && mode !== 'timed-medium') return null;

  const isTense    = timeRemaining <= 30 && timeRemaining > 10;
  const isUrgent   = timeRemaining <= 10 && timeRemaining > 5;
  const isCritical = timeRemaining <= 5;

  const cls = [
    'timer-display',
    bonusGlow   ? 'bonus-glow' : '',
    isTense     ? 'tense'      : '',
    isUrgent    ? 'urgent'     : '',
    isCritical  ? 'critical'   : '',
  ].filter(Boolean).join(' ');

  const animKey = isCritical ? timeRemaining : 'stable';

  const minutes = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;

  return (
    <div className={cls} aria-label={`残り${timeRemaining}秒`}>
      <span className="timer-value" key={animKey}>
        <span className="timer-min">{minutes}</span>
        <span className="timer-colon">:</span>
        <span className="timer-sec">{secs.toString().padStart(2, '0')}</span>
      </span>
    </div>
  );
}
