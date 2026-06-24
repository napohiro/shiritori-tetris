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
                <strong>次の言葉を確認しよう</strong>
                <p>画面下に次に落とす言葉が表示されます。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">2</span>
              <div>
                <strong>列をタップして置こう</strong>
                <p>置きたい列の「↓」ボタンを押すと、その列の一番下に落ちます。</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">3</span>
              <div>
                <strong>しりとりを3語以上つなげよう</strong>
                <p>前の言葉の最後の文字 ＝ 次の言葉の最初の文字 が3語以上つながると…</p>
              </div>
            </div>
          </li>
          <li>
            <div className="howto-step">
              <span className="howto-num">4</span>
              <div>
                <strong>隣接していれば曲がってもOK！</strong>
                <p>一直線でなくてよい。上下左右・斜めで隣り合っていれば、L字・ジグザグでも消える！</p>
              </div>
            </div>
          </li>
        </ol>

        <div className="howto-diagram">
          <div className="diagram-label" style={{ marginBottom: '6px' }}>一直線の例</div>
          <div className="diagram-row">
            <span className="ex-block small" style={{ background: '#4a90d9' }}>ねこ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>→</span>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>→</span>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
          </div>
          <div className="diagram-label">✓ 消える</div>
          <div className="diagram-label" style={{ marginBottom: '6px', marginTop: '10px' }}>L字・折れ曲がりの例</div>
          <div className="diagram-row">
            <span className="ex-block small" style={{ background: '#4a90d9' }}>ねこ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>→</span>
            <span className="ex-block small" style={{ background: '#48c774' }}>こあら</span>
          </div>
          <div className="diagram-row" style={{ paddingLeft: '64px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', fontWeight: 700 }}>↓</span>
          </div>
          <div className="diagram-row" style={{ paddingLeft: '42px' }}>
            <span className="ex-block small" style={{ background: '#e74c6c' }}>らっぱ</span>
            <span className="ex-arrow" style={{ fontSize: '0.8rem' }}>→</span>
            <span className="ex-block small" style={{ background: '#f39c12' }}>ぱんだ</span>
          </div>
          <div className="diagram-label">✓ L字でも消える！</div>
        </div>

        <div className="howto-rules">
          <p>⚠ 「ん」で終わる言葉はその先に続けられない</p>
          <p>⚠ 盤面が最上段まで埋まるとゲームオーバー</p>
        </div>

        <button className="btn-primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}
