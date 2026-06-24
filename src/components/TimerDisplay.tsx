import { GameMode } from '../logic/types';

interface Props {
  timeRemaining: number;
  mode: GameMode;
}

export default function TimerDisplay({ timeRemaining, mode }: Props) {
  if (mode !== 'timed') return null;

  const isUrgent = timeRemaining <= 10;
  const isCritical = timeRemaining <= 5;

  const cls = ['timer-display', isUrgent ? 'urgent' : '', isCritical ? 'critical' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cls} key={timeRemaining} aria-label={`残り${timeRemaining}秒`}>
      <span className="timer-value">{timeRemaining}</span>
      <span className="timer-unit">s</span>
    </div>
  );
}
