import { SHUFFLE_LIMIT } from '../logic/types';

function getHandWordFontSize(word: string): string {
  const len = word.length;
  if (len <= 3) return 'clamp(0.82rem, 3.4vw, 1rem)';
  if (len <= 4) return 'clamp(0.72rem, 2.9vw, 0.9rem)';
  if (len <= 5) return 'clamp(0.64rem, 2.5vw, 0.82rem)';
  return 'clamp(0.56rem, 2.2vw, 0.72rem)';
}

interface Props {
  hand: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  shuffleRemaining: number;
  onShuffle: () => void;
  disabled: boolean;
}

export default function HandCards({
  hand,
  selectedIndex,
  onSelect,
  shuffleRemaining,
  onShuffle,
  disabled,
}: Props) {
  const canShuffle = shuffleRemaining > 0 && !disabled;

  return (
    <div className="hand-area">
      <div className="hand-cards">
        {hand.map((word, i) => (
          <button
            key={`${i}-${word}`}
            className={[
              'hand-card',
              selectedIndex === i ? 'selected' : '',
              disabled ? 'hand-disabled' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => !disabled && onSelect(i)}
            disabled={disabled}
            aria-pressed={selectedIndex === i}
            aria-label={`手札${i + 1}: ${word}${selectedIndex === i ? '（選択中）' : ''}`}
          >
            <span className="hand-word" style={{ fontSize: getHandWordFontSize(word) }}>{word}</span>
            {selectedIndex === i && <span className="hand-selected-mark" aria-hidden="true" />}
          </button>
        ))}
      </div>

      <button
        className={['shuffle-btn', !canShuffle ? 'shuffle-disabled' : ''].filter(Boolean).join(' ')}
        onClick={onShuffle}
        disabled={!canShuffle}
        title={
          shuffleRemaining > 0
            ? `手札を3枚全部入れ替える（あと${shuffleRemaining}回）`
            : 'シャッフルは使い切りました'
        }
        aria-label={`シャッフル（あと${shuffleRemaining}回）`}
      >
        <span className="shuffle-icon" aria-hidden="true">&#8635;</span>
        <span className="shuffle-count">{shuffleRemaining}/{SHUFFLE_LIMIT}</span>
      </button>
    </div>
  );
}
