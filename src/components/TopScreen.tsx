import { useState } from 'react';
import HowToPlay from './HowToPlay';
import { APP_VERSION, APP_UPDATE_DATE } from '../version';
import { GameMode } from '../logic/types';

interface Props {
  onStart: (mode: GameMode) => void;
  onShowRanking: () => void;
}

export default function TopScreen({ onStart, onShowRanking }: Props) {
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
          <h1 className="top-title">シリトリス</h1>
          <p className="top-tagline">しりとりテトリス</p>
          <p className="top-subtitle">WORD CHAIN PUZZLE</p>
        </div>

        <p className="top-desc">
          落ちてくる言葉を動かし、<br />連鎖で時間を増やそう。
        </p>

        <div className="top-example">
          <span className="ex-block" style={{ background: '#4a90d9' }}>ねこ</span>
          <span className="ex-arrow">→</span>
          <span className="ex-block" style={{ background: '#48c774' }}>こあら</span>
          <span className="ex-arrow">→</span>
          <span className="ex-block" style={{ background: '#e74c6c' }}>らっぱ</span>
          <span className="ex-badge">消える！</span>
        </div>

        {/* モード説明 + 開始ボタン */}
        <div className="mode-cards">
          <div className="mode-card">
            <div className="mode-card-main">
              <span className="mode-card-icon">&#9203;</span>
              <div className="mode-card-body">
                <span className="mode-card-name">3分チャレンジ</span>
                <span className="mode-card-desc">短い言葉で、連鎖の基本を楽しもう</span>
              </div>
            </div>
            <button className="mode-card-start" onClick={() => onStart('timed')}>
              このモードではじめる
            </button>
          </div>

          <div className="mode-card medium">
            <div className="mode-card-main">
              <span className="mode-card-icon">&#127775;</span>
              <div className="mode-card-body">
                <span className="mode-card-name">3分チャレンジ【中】</span>
                <span className="mode-card-desc">2ブロック言葉を操って、大きな連鎖を狙おう</span>
              </div>
            </div>
            <button className="mode-card-start" onClick={() => onStart('timed-medium')}>
              このモードではじめる
            </button>
          </div>
        </div>

        <div className="top-buttons">
          <div className="top-sub-buttons">
            <button className="btn-secondary" onClick={() => setShowHow(true)}>
              遊び方
            </button>
            <button className="btn-secondary" onClick={onShowRanking}>
              ランキング
            </button>
          </div>
        </div>
      </div>

      {/* バージョン情報（最下部） */}
      <div className="top-version" aria-label={`バージョン ${APP_VERSION}`}>
        Ver.{APP_VERSION}&ensp;·&ensp;更新日：{APP_UPDATE_DATE}
      </div>

      {showHow && <HowToPlay onClose={() => setShowHow(false)} />}
    </div>
  );
}
