import { useEffect, useRef } from 'react';

interface Props {
  combo: number;
  visible: boolean;
}

export default function ComboOverlay({ combo, visible }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!visible || combo < 2) return null;

  return (
    <div className="combo-overlay" key={`combo-${combo}`}>
      <div className="combo-text">COMBO!</div>
      <div className="combo-mult">×{combo}</div>
    </div>
  );
}
