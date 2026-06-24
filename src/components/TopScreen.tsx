import { useState } from 'react';
import HowToPlay from './HowToPlay';

interface Props {
  onStart: () => void;
}

export default function TopScreen({ onStart }: Props) {
  const [showHow, setShowHow] = useState(false);

  return (
    <div className="top-screen">
      <div className="top-bg-grid" aria-hidden="true">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="top-bg-cell" />
        ))}
      </div>

      <div className="top-content">
        <div className="top-logo">
          <h1 className="top-title">しりとりテトリス</h1>
          <p className="top-subtitle">WORD CHAIN PUZZLE</p>
        </div>

        <p className="top-desc">
          言葉をつなげて、<br />3語以上のしりとりを消そう。
        </p>

        <div className="top-example">
          <span className="ex-block" style={{ background: '#4a90d9' }}>ねこ</span>
          <span className="ex-arrow">→</span>
          <span className="ex-block" style={{ background: '#48c774' }}>こあら</span>
          <span className="ex-arrow">→</span>
          <span className="ex-block" style={{ background: '#e74c6c' }}>らっぱ</span>
          <span className="ex-badge">消える！</span>
        </div>

        <div className="top-buttons">
          <button className="btn-primary" onClick={onStart}>
            ゲームをはじめる
          </button>
          <button className="btn-secondary" onClick={() => setShowHow(true)}>
            遊び方
          </button>
        </div>
      </div>

      {showHow && <HowToPlay onClose={() => setShowHow(false)} />}
    </div>
  );
}
