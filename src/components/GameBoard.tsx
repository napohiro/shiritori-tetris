import { Board, COLS, ROWS, unitCells } from '../logic/types';
import { FallingBlock } from './GameScreen';
import { getKanaColor, getFirstKana, getLastKana } from '../logic/words';

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

/** 文字数に応じたフォントサイズを返す（従来より一段階大きく） */
function getWordFontSize(word: string): string {
  const len = word.length;
  if (len <= 2) return 'clamp(0.76rem, 3.2vw, 1.05rem)';
  if (len <= 3) return 'clamp(0.66rem, 2.8vw, 0.94rem)';
  if (len <= 4) return 'clamp(0.58rem, 2.4vw, 0.82rem)';
  return 'clamp(0.50rem, 2.0vw, 0.70rem)';
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

/** 横2ブロック連結ワード用：文字数によらず必ず1行で表示する。 */
function getTwoBlockFontSize(word: string): string {
  const len = word.length;
  if (len <= 4) return 'clamp(0.72rem, 3.4vw, 1.05rem)';
  return 'clamp(0.62rem, 2.9vw, 0.9rem)';
}

function renderTwoBlockText(word: string) {
  return (
    <>
      {word.slice(0, -1)}
      <span className="word-last-char">{word.slice(-1)}</span>
    </>
  );
}

/** 縦2ブロック連結ワード用：上段/下段の2行に自然分割して表示する（例: ひこうき→ひこ／うき）。 */
function renderVerticalBlockText(word: string) {
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

/** 縦2ブロック連結ワード用フォントサイズ：上段/下段のうち長い方の行の文字数を基準にする。 */
function getVerticalFontSize(word: string): string {
  const mid = Math.ceil(word.length / 2);
  const maxLineLen = Math.max(mid, word.length - mid);
  return getWordFontSize('あ'.repeat(maxLineLen));
}

export default function GameBoard({ board, matchedCells, fallingBlock }: Props) {
  const matchedSet = new Set(matchedCells.map(([r, c]) => `${r},${c}`));
  const chainEdges = matchedCells.length > 0 ? getChainEdges(matchedCells) : [];

  // 落下ブロックが存在するセル（2ブロック語の場合は占有する全セルとも個別描画をスキップする）
  const fbCells = fallingBlock
    ? unitCells(fallingBlock.row, fallingBlock.col, fallingBlock.width, fallingBlock.height)
    : [];
  const isFallingCell = (row: number, col: number) =>
    fbCells.some(([r, c]) => r === row && c === col);

  // 着地済みの2ブロック連結ワード（横・縦とも）を重複なく収集（part===0のセルを起点にする）
  // 相方セルが本当に同じ groupId・part===1・向きの一致するセルであることを必ず検証してから
  // 2マスにまたがる1要素として描画する。万一ズレていた場合は2ブロックとして描画せず
  // コンソールに警告を出す（隣の無関係なセルと視覚的に結合してしまう事故を防ぐ）。
  const landedGroups: {
    row: number; col: number; word: string; color: string; matched: boolean; orientation: 'h' | 'v';
  }[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row][col];
      if (cell && cell.type === 'word' && cell.groupId && cell.part === 0) {
        const orientation = cell.orientation ?? 'h';
        const partnerRow = orientation === 'v' ? row + 1 : row;
        const partnerCol = orientation === 'v' ? col : col + 1;
        const partnerCell =
          partnerRow < ROWS && partnerCol < COLS ? board[partnerRow][partnerCol] : null;
        const partnerOk =
          partnerCell &&
          partnerCell.type === 'word' &&
          partnerCell.groupId === cell.groupId &&
          partnerCell.part === 1;
        if (!partnerOk) {
          // eslint-disable-next-line no-console
          console.error(
            `[GameBoard] 2ブロック語の相方セルが見つかりません: row=${row} col=${col} word=${cell.word} orientation=${orientation}`,
          );
          continue;
        }
        const matched = matchedSet.has(`${row},${col}`) && matchedSet.has(`${partnerRow},${partnerCol}`);
        landedGroups.push({
          row,
          col,
          word: cell.word,
          color: cell.color,
          matched,
          orientation,
        });
      }
    }
  }

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
        {/*
          各セルに gridColumn/gridRow を明示指定する。
          横2ブロック連結ワード（下の spanning 要素）は grid-column: span 2 の
          明示配置アイテムのため、CSS Grid の配置アルゴリズムは「明示配置を先に確定し、
          残りのセルへ auto-placement を流し込む」順で処理される。
          このセル群を auto-placement（配置指定なし）のままにすると、
          明示配置された2ブロック要素の分だけ後続セルの自動配置がズレてしまい、
          盤面全体の見た目が崩れる（着地位置のズレ・文字の分断表示の原因）。
        */}
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((_, col) => {
            const cell = board[row][col];
            const key = `${row},${col}`;
            const isMatched = matchedSet.has(key);
            const isFalling = isFallingCell(row, col);
            const isGroupCell = !!cell && cell.type === 'word' && !!cell.groupId;

            return (
              <div
                key={key}
                className="board-cell"
                style={{ gridColumn: col + 1, gridRow: row + 1 }}
              >
                {/* 落下中ブロック（1ブロック語のみ。2ブロック語は下の spanning 要素で描画） */}
                {isFalling && fallingBlock && fallingBlock.width === 1 && fallingBlock.height === 1 && (
                  <div
                    className="word-block falling"
                    style={{ '--block-color': fallingBlock.color } as React.CSSProperties}
                  >
                    <span
                      className="kana-bar kana-bar-left"
                      style={{ background: getKanaColor(getFirstKana(fallingBlock.word)) }}
                      aria-hidden="true"
                    />
                    <span className="word-text" style={{ fontSize: getWordFontSize(fallingBlock.word) }}>
                      {renderWordText(fallingBlock.word)}
                    </span>
                    <span
                      className="kana-bar kana-bar-right"
                      style={{ background: getKanaColor(getLastKana(fallingBlock.word)) }}
                      aria-hidden="true"
                    />
                  </div>
                )}

                {/* 着地済みブロック（落下中・グループワードは個別セル描画をスキップ） */}
                {!isFalling && !isGroupCell && cell && cell.type === 'word' && (
                  <div
                    className={['word-block', isMatched ? 'matched' : ''].filter(Boolean).join(' ')}
                    style={{ '--block-color': cell.color } as React.CSSProperties}
                  >
                    <span
                      className="kana-bar kana-bar-left"
                      style={{ background: getKanaColor(getFirstKana(cell.word)) }}
                      aria-hidden="true"
                    />
                    <span className="word-text" style={{ fontSize: getWordFontSize(cell.word) }}>
                      {renderWordText(cell.word)}
                    </span>
                    <span
                      className="kana-bar kana-bar-right"
                      style={{ background: getKanaColor(getLastKana(cell.word)) }}
                      aria-hidden="true"
                    />
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

        {/* 2ブロック連結ワード（着地済み・横/縦）：継ぎ目なしの1要素として2マスにまたがせる */}
        {landedGroups.map(g => (
          <div
            key={`group-${g.row}-${g.col}`}
            className={[
              'word-block',
              g.orientation === 'v' ? 'vertical-block' : 'two-block',
              g.matched ? 'matched' : '',
            ].filter(Boolean).join(' ')}
            style={{
              '--block-color': g.color,
              gridColumn: g.orientation === 'v' ? `${g.col + 1} / span 1` : `${g.col + 1} / span 2`,
              gridRow: g.orientation === 'v' ? `${g.row + 1} / span 2` : `${g.row + 1} / span 1`,
            } as React.CSSProperties}
          >
            {g.orientation === 'v' ? (
              <>
                <span
                  className="kana-bar kana-bar-top"
                  style={{ background: getKanaColor(getFirstKana(g.word)) }}
                  aria-hidden="true"
                />
                <span className="word-text" style={{ fontSize: getVerticalFontSize(g.word) }}>
                  {renderVerticalBlockText(g.word)}
                </span>
                <span
                  className="kana-bar kana-bar-bottom"
                  style={{ background: getKanaColor(getLastKana(g.word)) }}
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                <span
                  className="kana-bar kana-bar-left"
                  style={{ background: getKanaColor(getFirstKana(g.word)) }}
                  aria-hidden="true"
                />
                <span className="word-text" style={{ fontSize: getTwoBlockFontSize(g.word) }}>
                  {renderTwoBlockText(g.word)}
                </span>
                <span
                  className="kana-bar kana-bar-right"
                  style={{ background: getKanaColor(getLastKana(g.word)) }}
                  aria-hidden="true"
                />
              </>
            )}
          </div>
        ))}

        {/* 2ブロック連結ワード（落下中・横/縦） */}
        {fallingBlock && (fallingBlock.width === 2 || fallingBlock.height === 2) && (
          <div
            className={[
              'word-block falling',
              fallingBlock.height === 2 ? 'vertical-block' : 'two-block',
            ].filter(Boolean).join(' ')}
            style={{
              '--block-color': fallingBlock.color,
              gridColumn: fallingBlock.height === 2
                ? `${fallingBlock.col + 1} / span 1`
                : `${fallingBlock.col + 1} / span 2`,
              gridRow: fallingBlock.height === 2
                ? `${fallingBlock.row + 1} / span 2`
                : `${fallingBlock.row + 1} / span 1`,
            } as React.CSSProperties}
          >
            {fallingBlock.height === 2 ? (
              <>
                <span
                  className="kana-bar kana-bar-top"
                  style={{ background: getKanaColor(getFirstKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
                <span className="word-text" style={{ fontSize: getVerticalFontSize(fallingBlock.word) }}>
                  {renderVerticalBlockText(fallingBlock.word)}
                </span>
                <span
                  className="kana-bar kana-bar-bottom"
                  style={{ background: getKanaColor(getLastKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                <span
                  className="kana-bar kana-bar-left"
                  style={{ background: getKanaColor(getFirstKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
                <span className="word-text" style={{ fontSize: getTwoBlockFontSize(fallingBlock.word) }}>
                  {renderTwoBlockText(fallingBlock.word)}
                </span>
                <span
                  className="kana-bar kana-bar-right"
                  style={{ background: getKanaColor(getLastKana(fallingBlock.word)) }}
                  aria-hidden="true"
                />
              </>
            )}
          </div>
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
