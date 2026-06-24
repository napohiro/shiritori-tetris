import { Board, COLS, ROWS } from '../logic/types';

interface Props {
  board: Board;
  matchedCells: [number, number][];
  selectedCol: number | null;
  hintCol: number | null;
}

/** 隣接するマッチ済みセル間のエッジ一覧を生成（SVGライン描画用）。 */
function getChainEdges(
  cells: [number, number][],
): [[number, number], [number, number]][] {
  const cellSet = new Set(cells.map(([r, c]) => `${r},${c}`));
  const seen = new Set<string>();
  const edges: [[number, number], [number, number]][] = [];

  const DIRS8: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
  ];

  for (const [r, c] of cells) {
    for (const [dr, dc] of DIRS8) {
      const nr = r + dr;
      const nc = c + dc;
      if (!cellSet.has(`${nr},${nc}`)) continue;
      const key =
        r < nr || (r === nr && c < nc)
          ? `${r},${c}-${nr},${nc}`
          : `${nr},${nc}-${r},${c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([[r, c], [nr, nc]]);
    }
  }
  return edges;
}

export default function GameBoard({ board, matchedCells, selectedCol, hintCol }: Props) {
  const matchedSet = new Set(matchedCells.map(([r, c]) => `${r},${c}`));
  const chainEdges = matchedCells.length > 0 ? getChainEdges(matchedCells) : [];

  return (
    <div className="game-board-wrapper">
      {/* 列ハイライト */}
      <div className="col-highlights">
        {Array.from({ length: COLS }).map((_, col) => (
          <div
            key={col}
            className={[
              'col-highlight',
              selectedCol === col ? 'selected' : '',
              hintCol === col ? 'hint' : '',
            ].filter(Boolean).join(' ')}
          />
        ))}
      </div>

      {/* ゲーム盤面 */}
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
              <div key={key} className="board-cell">
                {cell && cell.type === 'word' && (
                  <div
                    className={['word-block', isMatched ? 'matched' : ''].filter(Boolean).join(' ')}
                    style={{ '--block-color': cell.color } as React.CSSProperties}
                  >
                    <span className="word-text">{cell.word}</span>
                  </div>
                )}
                {cell && cell.type === 'obstacle' && (
                  <div className={`obstacle-block hp-${cell.hp}`}>
                    <span className="obstacle-icon">&#9632;</span>
                    <div className="obstacle-hp-bar">
                      {[2, 1].map(level => (
                        <span
                          key={level}
                          className={['hp-dot', cell.hp >= level ? 'full' : 'empty'].join(' ')}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* チェーン接続ライン（SVGオーバーレイ） */}
      {chainEdges.length > 0 && (
        <svg
          className="chain-svg"
          viewBox={`0 0 ${COLS} ${ROWS}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {chainEdges.map(([[r1, c1], [r2, c2]], i) => (
            <line
              key={i}
              x1={c1 + 0.5}
              y1={r1 + 0.5}
              x2={c2 + 0.5}
              y2={r2 + 0.5}
              stroke="rgba(255, 235, 100, 0.8)"
              strokeWidth="0.13"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}
    </div>
  );
}
