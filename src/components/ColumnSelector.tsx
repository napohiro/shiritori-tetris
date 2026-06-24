import { Board, COLS } from '../logic/types';
import { availableCols } from '../logic/gameLogic';

interface Props {
  board: Board;
  selectedCol: number | null;
  hintCol: number | null;
  onSelect: (col: number) => void;
  disabled: boolean;
}

export default function ColumnSelector({
  board,
  selectedCol,
  hintCol,
  onSelect,
  disabled,
}: Props) {
  const available = new Set(disabled ? [] : availableCols(board));

  return (
    <div className={['column-selector', disabled ? 'selector-disabled' : ''].filter(Boolean).join(' ')}>
      {Array.from({ length: COLS }).map((_, col) => {
        const isAvailable = available.has(col);
        const isSelected = selectedCol === col;
        const isHint = hintCol === col;

        return (
          <button
            key={col}
            className={[
              'col-btn',
              isSelected ? 'selected' : '',
              isHint ? 'hint' : '',
              !isAvailable ? 'disabled' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => isAvailable && onSelect(col)}
            disabled={!isAvailable}
            aria-label={`${col + 1}列目に置く`}
          >
            &#8595;
          </button>
        );
      })}
    </div>
  );
}
