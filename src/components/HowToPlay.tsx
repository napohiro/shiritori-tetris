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
                <strong>3枚の手札から1枚を選ぼう</strong>
                <p>画面下に3枚の言葉が表示されます。タップして1枚を選択してください。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">2</span>
              <div>
                <strong>列を選んで置こう</strong>
                <p>
                  盤面の列をタップするか、下の「↓」ボタンを押すと、選んだ言葉がその列に落ちます。<br />
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>盤面の列をタップして置けます！</span>
                </p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">3</span>
              <div>
                <strong>しりとりを3語以上つなげよう</strong>
                <p>前の言葉の最後の文字 ＝ 次の言葉の最初の文字が3語以上つながると消える！</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">4</span>
              <div>
                <strong>曲がっても・斜めでも消える！</strong>
                <p>一直線でなくてOK。上下左右・斜めで隣り合っていれば、L字・ジグザグでも消えます。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">5</span>
              <div>
                <strong>シャッフルは3回まで</strong>
                <p>手札3枚がどれも使いにくいときは「↺」でまとめて入れ替えられます（1ゲーム3回限り）。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">6</span>
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
          <li>
            <div className="howto-step">
              <span className="howto-num">7</span>
              <div>
                <strong>3分チャレンジ</strong>
                <p>制限時間3分で高得点を競うモード。<br />
                  <strong style={{ color: 'var(--accent-cyan)' }}>3語以上のしりとりを消すと、残り時間が増えます！</strong><br />
                  3語+5秒 / 4語+10秒 / 5語+15秒 / 6語以上+20秒。コンボなら追加ボーナスも。残り30秒で緊張感のある表示、残り10秒で赤表示。TIME UP! で終了。一時停止中はタイマーも止まります。</p>
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
          <div className="diagram-label">&#10003; CHAIN! 消える</div>

          <div className="diagram-label" style={{ marginBottom: '6px', marginTop: '10px' }}>おじゃまブロックの例</div>
          <div className="diagram-row" style={{ alignItems: 'center', gap: '6px' }}>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
            <span className="ex-block small obstacle-demo">&#9632;</span>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
          </div>
          <div className="diagram-label">&#10003; こあら・らっぱが消えると岩にダメージ！</div>
        </div>

        <div className="howto-rules">
          <p>&#9888; 「ん」で終わる言葉はその先に続けられない</p>
          <p>&#9888; 全列が最上段まで埋まるとゲームオーバー</p>
          <p>&#9888; シャッフルは1ゲームにつき3回まで</p>
        </div>

        <button className="btn-primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
