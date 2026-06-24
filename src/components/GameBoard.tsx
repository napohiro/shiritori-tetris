import { Board, COLS, ROWS } from '../logic/types';
import { availableCols } from '../logic/gameLogic';

interface Props {
  board: Board;
  matchedCells: [number, number][];
  selectedCol: number | null;
  hintCol: number | null;
  /** 列タップ時のコールバック（card選択済み・操作可能な場合のみ渡す） */
  onColTap?: (col: number) => void;
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

/** 文字数に応じたフォントサイズを返す */
function getWordFontSize(word: string): string {
  const len = word.length;
  if (len <= 2) return 'clamp(0.62rem, 2.5vw, 0.88rem)';
  if (len <= 3) return 'clamp(0.55rem, 2.2vw, 0.82rem)';
  if (len <= 4) return 'clamp(0.48rem, 1.9vw, 0.72rem)';
  return 'clamp(0.40rem, 1.6vw, 0.60rem)';
}

/** 4文字以上は2行表示、最後の文字をゴールドでハイライト */
function renderWordText(word: string) {
  if (word.length <= 3) {
    return (
      <>
        {word.slice(0, -1)}
        <span className="word-last-char">{word.slice(-1)}</span>
      </>
    );
  }
  const mid = Math.ceil(word.length / 2);
  const firstLine = word.slice(0, mid);
  const secondLine = word.slice(mid);
  return (
    <>
      {firstLine}
      <br />
      {secondLine.slice(0, -1)}<span className="word-last-char">{secondLine.slice(-1)}</span>
    </>
  );
}

export default function GameBoard({ board, matchedCells, selectedCol, hintCol, onColTap }: Props) {
  const matchedSet = new Set(matchedCells.map(([r, c]) => `${r},${c}`));
  const chainEdges = matchedCells.length > 0 ? getChainEdges(matchedCells) : [];

  // 列タップゾーンのために空き列を計算
  const availableSet = new Set(availableCols(board));
  const tapActive = !!onColTap;

  return (
    <div className="game-board-wrapper">
      {/* 列ハイライト（背景） */}
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
                    <span className="word-text" style={{ fontSize: getWordFontSize(cell.word) }}>
                      {renderWordText(cell.word)}
                    </span>
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

      {/* 列タップゾーン（セルの上に重なる透明なヒットエリア） */}
      <div className={['col-tap-zones', tapActive ? 'tap-active' : ''].filter(Boolean).join(' ')}>
        {Array.from({ length: COLS }).map((_, col) => {
          const isAvailable = availableSet.has(col);
          const isHint = hintCol === col;

          return (
            <div
              key={col}
              className={[
                'col-tap-zone',
                isAvailable ? 'zone-available' : 'zone-full',
                isHint ? 'zone-hint' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (tapActive && isAvailable) onColTap!(col);
              }}
              aria-label={tapActive && isAvailable ? `${col + 1}列目に置く` : undefined}
              role={tapActive && isAvailable ? 'button' : undefined}
            />
          );
        })}
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
