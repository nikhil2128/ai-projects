import { useEffect, useState, useMemo } from 'react';

interface SuccessOverlayProps {
  letter: string;
  streak: number;
  onNext: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  shape: 'circle' | 'star' | 'square' | 'triangle';
}

const CONFETTI_COLORS = [
  '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF',
  '#FF8E53', '#9B59B6', '#FF6B9D', '#00CEC9',
  '#FFEAA7', '#DFE6E9', '#FAB1A0', '#81ECEC',
];

const SHAPES: Particle['shape'][] = ['circle', 'star', 'square', 'triangle'];

const PRAISE = [
  'Amazing!', 'Wonderful!', 'Super!', 'Fantastic!',
  'Brilliant!', 'Awesome!', 'Great job!', 'You did it!',
  'Perfect!', 'Incredible!',
];

export function SuccessOverlay({ letter, streak, onNext }: SuccessOverlayProps) {
  const [visible, setVisible] = useState(false);
  const praise = useMemo(
    () => PRAISE[Math.floor(Math.random() * PRAISE.length)],
    [letter],
  );

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * -50 - 10,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 12 + 6,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.8,
      duration: Math.random() * 2 + 2,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    }));
  }, [letter]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div className={`success-overlay ${visible ? 'success-visible' : ''}`}>
      <div className="confetti-container">
        {particles.map((p) => (
          <div
            key={p.id}
            className={`confetti-piece confetti-${p.shape}`}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.shape !== 'star' ? p.color : 'transparent',
              transform: `rotate(${p.rotation}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              ...(p.shape === 'star'
                ? { color: p.color, fontSize: p.size * 1.5 }
                : {}),
            }}
          >
            {p.shape === 'star' && '★'}
          </div>
        ))}
      </div>

      <div className="success-content">
        <div className="success-stars">
          {'⭐'.repeat(Math.min(streak, 5))}
        </div>
        <h2 className="success-praise">{praise}</h2>
        <div className="success-letter-showcase">
          <span className="success-letter-big">{letter}</span>
        </div>
        {streak >= 3 && (
          <div className="streak-message">
            🔥 {streak} in a row!
          </div>
        )}
        <button className="btn-next" onClick={onNext}>
          Next Letter <span className="btn-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
