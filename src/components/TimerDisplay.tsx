import { GameMode } from '../logic/types';

interface Props {
  timeRemaining: number;
  mode: GameMode;
}

export default function TimerDisplay({ timeRemaining, mode }: Props) {
  if (mode !== 'timed') return null;

  // 残り30秒：やや緊張感、残り10秒：ハイライト、残り5秒：クリティカルアニメーション
  const isTense    = timeRemaining <= 30 && timeRemaining > 10;
  const isUrgent   = timeRemaining <= 10 && timeRemaining > 5;
  const isCritical = timeRemaining <= 5;

  const cls = [
    'timer-display',
    isTense    ? 'tense'    : '',
    isUrgent   ? 'urgent'   : '',
    isCritical ? 'critical' : '',
  ].filter(Boolean).join(' ');

  // 残り5秒以内は key を毎秒変えてアニメーションを毎秒リトリガーする
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
