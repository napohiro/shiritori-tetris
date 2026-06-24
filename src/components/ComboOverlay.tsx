import { useEffect, useState } from 'react';

interface Props {
  combo: number;
  visible: boolean;
}

export default function ComboOverlay({ combo, visible }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (visible && combo >= 2) {
      setShow(true);
      const t = setTimeout(() => setShow(false), 1200);
      return () => clearTimeout(t);
    }
  }, [visible, combo]);

  if (!show) return null;

  return (
    <div className="combo-overlay">
      <div className="combo-text">
        {combo >= 3 ? 'CHAIN!' : 'COMBO!'}
      </div>
      <div className="combo-mult">×{combo}</div>
    </div>
  );
}
