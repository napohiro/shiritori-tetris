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
                <strong>↓ で列を選んで置こう</strong>
                <p>置きたい列の「↓」を押すと、選んだ言葉がその列の一番下に落ちます。</p>
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
        </ol>

        <div className="howto-diagram">
          <div className="diagram-label" style={{ marginBottom: '6px' }}>一直線の例</div>
          <div className="diagram-row">
            <span className="ex-block small" style={{ background: '#4a90d9' }}>ねこ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
          </div>
          <div className="diagram-label">&#10003; CHAIN! 消える</div>

          <div className="diagram-label" style={{ marginBottom: '6px', marginTop: '10px' }}>L字・折れ曲がりの例</div>
          <div className="diagram-row">
            <span className="ex-block small" style={{ background: '#4a90d9' }}>ねこ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
          </div>
          <div className="diagram-row" style={{ paddingLeft: '62px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>&#8595;</span>
          </div>
          <div className="diagram-row" style={{ paddingLeft: '42px' }}>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>&#8594;</span>
            <span className="ex-block small" style={{ background: '#f39c12' }}>ぱんだ</span>
          </div>
          <div className="diagram-label">&#10003; L字でも GREAT CHAIN!</div>
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
