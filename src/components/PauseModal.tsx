import { useState } from 'react';
import HowToPlay from './HowToPlay';

interface Props {
  onResume: () => void;
  onRestart: () => void;
}

export default function PauseModal({ onResume, onRestart }: Props) {
  const [showHow, setShowHow] = useState(false);

  if (showHow) return <HowToPlay onClose={() => setShowHow(false)} />;

  return (
    <div className="modal-overlay">
      <div className="modal-box pause">
        <h2 className="modal-title">⏸ 一時停止</h2>
        <div className="pause-buttons">
          <button className="btn-primary" onClick={onResume}>
            ゲームを続ける
          </button>
          <button className="btn-secondary" onClick={() => setShowHow(true)}>
            遊び方
          </button>
          <button className="btn-danger" onClick={onRestart}>
            最初からやり直す
          </button>
        </div>
      </div>
    </div>
  );
}
