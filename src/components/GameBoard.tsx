import { Board, COLS, ROWS } from '../logic/types';

interface Props {
  board: Board;
  matchedCells: [number, number][];
  selectedCol: number | null;
  hintCol: number | null;
}

export default function GameBoard({ board, matchedCells, selectedCol, hintCol }: Props) {
  const matchedSet = new Set(matchedCells.map(([r, c]) => `${r},${c}`));

  return (
    <div className="game-board-wrapper">
      {/* Column highlight overlays */}
      <div className="col-highlights">
        {Array.from({ length: COLS }).map((_, col) => (
          <div
            key={col}
            className={[
              'col-highlight',
              selectedCol === col ? 'selected' : '',
              hintCol === col ? 'hint' : '',
            ].join(' ')}
          />
        ))}
      </div>

      <div
        className="game-board"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((_, col) => {
            const cell = board[row][col];
            const key = `${row},${col}`;
            const isMatched = matchedSet.has(key);

            return (
              <div
                key={key}
                className={['board-cell', cell ? 'has-block' : ''].join(' ')}
              >
                {cell && (
                  <div
                    className={['word-block', isMatched ? 'matched' : ''].join(' ')}
                    style={{ '--block-color': cell.color } as React.CSSProperties}
                  >
                    <span className="word-text">{cell.word}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
