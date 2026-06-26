import { Board, COLS, ROWS } from '../logic/types';
import { FallingBlock } from './GameScreen';

interface Props {
  board: Board;
  matchedCells: [number, number][];
  fallingBlock: FallingBlock | null;
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

export default function GameBoard({ board, matchedCells, fallingBlock }: Props) {
  const matchedSet = new Set(matchedCells.map(([r, c]) => `${r},${c}`));
  const chainEdges = matchedCells.length > 0 ? getChainEdges(matchedCells) : [];

  // 落下ブロックが存在するセル
  const fbKey = fallingBlock ? `${fallingBlock.row},${fallingBlock.col}` : '';

  return (
    <div className="game-board-wrapper">
      {/* ゲーム盤面 */}
      <div
        className="game-board"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
        }}
      >
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((_, col) => {
            const cell = board[row][col];
            const key = `${row},${col}`;
            const isMatched = matchedSet.has(key);
            const isFalling = fbKey === key;

            return (
              <div key={key} className="board-cell">
                {/* 落下中ブロック（盤面ブロックの上に描画） */}
                {isFalling && fallingBlock && (
                  <div
                    className="word-block falling"
                    style={{ '--block-color': fallingBlock.color } as React.CSSProperties}
                  >
                    <span className="word-text" style={{ fontSize: getWordFontSize(fallingBlock.word) }}>
                      {renderWordText(fallingBlock.word)}
                    </span>
                  </div>
                )}

                {/* 着地済みブロック（落下中は非表示） */}
                {!isFalling && cell && cell.type === 'word' && (
                  <div
                    className={['word-block', isMatched ? 'matched' : ''].filter(Boolean).join(' ')}
                    style={{ '--block-color': cell.color } as React.CSSProperties}
                  >
                    <span className="word-text" style={{ fontSize: getWordFontSize(cell.word) }}>
                      {renderWordText(cell.word)}
                    </span>
                  </div>
                )}

                {!isFalling && cell && cell.type === 'obstacle' && (
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
