import { APP_VERSION, APP_UPDATE_DATE, APP_RELEASE_NOTES } from '../version';

interface Props {
  onClose: () => void;
}

export default function HowToPlay({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box howto" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">遊び方</h2>

        <ol className="howto-list">
          <li>
            <div className="howto-step">
              <span className="howto-num">1</span>
              <div>
                <strong>言葉ブロックが上から落ちてくる</strong>
                <p>盤面の上から言葉が1個ずつ自動で落下します。ボタンで操作して好きな位置に着地させよう。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">2</span>
              <div>
                <strong>◀ 左 ／ ▶ 右 で列を移動</strong>
                <p>左右ボタンを押すと落下中の言葉ブロックが左右に1マスずつ動きます。連打してもOK。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">3</span>
              <div>
                <strong>▼▼ ボタンで高速落下</strong>
                <p>▼▼ ボタンを押し続けている間、高速で落下します。すばやく着地させたいときに使おう。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">4</span>
              <div>
                <strong>「変更」ボタンで言葉を入れ替え</strong>
                <p>現在落下中の言葉が使いにくい場合は「変更」で別の言葉にできます。何度でも使えますが、変更回数は記録されます。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">5</span>
              <div>
                <strong>しりとりを3語以上つなげて消そう</strong>
                <p>前の言葉の最後の文字 ＝ 次の言葉の最初の文字が3語以上隣接していると消える！<br />
                  上下左右・斜めで隣り合っていればOK。L字・ジグザグも消えます。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">6</span>
              <div>
                <strong>消すと時間が増える！</strong>
                <p>
                  3語消すと <strong style={{ color: 'var(--accent-cyan)' }}>+5秒</strong>、
                  4語 +10秒、5語 +15秒、6語以上 +20秒。<br />
                  連鎖コンボでさらに時間ボーナスが加わります。残り時間は最大3分30秒まで増やせます。
                </p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">7</span>
              <div>
                <strong>おじゃまブロックに注意！</strong>
                <p>
                  &#9632; の岩ブロックは言葉チェーンで消えない。<br />
                  隣の言葉が消えるとダメージ（HP 2 → 1 → 破壊）。<br />
                  2回ダメージで破壊すると <strong>+500点</strong>！
                </p>
              </div>
            </div>
          </li>
        </ol>

        <div className="howto-diagram">
          <div className="diagram-label" style={{ marginBottom: '6px' }}>しりとりの例</div>
          <div className="diagram-row">
            <span className="ex-block small" style={{ background: '#4a90d9' }}>ねこ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
          </div>
          <div className="diagram-label">&#10003; CHAIN! 消える ＋5秒ボーナス</div>
        </div>

        <div className="howto-rules">
          <p>&#9888; 「ん」で終わる言葉はその先に続けられない</p>
          <p>&#9888; 全列が最上段まで埋まるとゲームオーバー</p>
          <p>&#9888; 残り時間が0秒になるとタイムアップ</p>
        </div>

        <div className="howto-modes">
          <div className="diagram-label" style={{ marginBottom: '6px' }}>モードについて</div>
          <p><strong>3分チャレンジ：</strong>2文字までの短い言葉で、連鎖の基本を楽しもう</p>
          <p><strong>3分チャレンジ【中】：</strong>4〜5文字の横2ブロック言葉も登場。長い言葉を活かして連鎖を狙おう</p>
        </div>

        {/* バージョン情報・更新内容 */}
        <div className="howto-version">
          <div className="howto-version-header">
            Ver.{APP_VERSION}&ensp;<span className="howto-version-date">更新日：{APP_UPDATE_DATE}</span>
          </div>
          <ul className="howto-version-notes">
            {APP_RELEASE_NOTES.map((note, i) => (
              <li key={i}>・{note}</li>
            ))}
          </ul>
        </div>

        <button className="btn-primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
