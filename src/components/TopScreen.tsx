import { useState } from 'react';
import { GameMode } from '../logic/types';
import HowToPlay from './HowToPlay';

interface Props {
  onStart: (mode: GameMode) => void;
}

export default function TopScreen({ onStart }: Props) {
  const [showHow, setShowHow] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('endless');

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

        {/* モード選択 */}
        <div className="mode-selector">
          <button
            className={['mode-btn', selectedMode === 'endless' ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => setSelectedMode('endless')}
          >
            <span className="mode-icon">&#9654;</span>
            <span className="mode-name">エンドレス</span>
            <span className="mode-desc">じっくり連鎖を狙おう</span>
          </button>
          <button
            className={['mode-btn', selectedMode === 'timed' ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => setSelectedMode('timed')}
          >
            <span className="mode-icon">&#9203;</span>
            <span className="mode-name">60秒チャレンジ</span>
            <span className="mode-desc">60秒で高得点を目指そう</span>
          </button>
        </div>

        <div className="top-buttons">
          <button className="btn-primary" onClick={() => onStart(selectedMode)}>
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
