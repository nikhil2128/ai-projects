import { useState, useCallback } from 'react';
import { TracingCanvas } from './components/TracingCanvas';
import { SuccessOverlay } from './components/SuccessOverlay';
import { LetterCard } from './components/LetterCard';
import { ScoreBoard } from './components/ScoreBoard';
import { getRandomLetter } from './utils/letters';

type GameState = 'tracing' | 'success';

export function App() {
  const [letter, setLetter] = useState(() => getRandomLetter());
  const [gameState, setGameState] = useState<GameState>('tracing');
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [animateCard, setAnimateCard] = useState(true);

  const handleSuccess = useCallback(() => {
    setGameState('success');
    setScore((s) => s + 1);
    setStreak((s) => s + 1);
  }, []);

  const handleNext = useCallback(() => {
    setAnimateCard(false);
    const next = getRandomLetter(letter);
    setTimeout(() => {
      setLetter(next);
      setGameState('tracing');
      setAnimateCard(true);
    }, 50);
  }, [letter]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-section">
          <h1 className="app-title">
            <span className="title-letter" style={{ color: '#FF6B6B' }}>A</span>
            <span className="title-letter" style={{ color: '#4ECDC4' }}>B</span>
            <span className="title-letter" style={{ color: '#FFE66D' }}>C</span>
            <span className="title-space"> </span>
            <span className="title-word">Tracer</span>
          </h1>
          <p className="subtitle">Trace the letter!</p>
        </div>
        <ScoreBoard score={score} streak={streak} />
      </header>

      <main className="game-area">
        <LetterCard letter={letter} animate={animateCard} />
        <TracingCanvas
          letter={letter}
          onSuccess={handleSuccess}
          disabled={gameState === 'success'}
        />
      </main>

      {gameState === 'success' && (
        <SuccessOverlay letter={letter} streak={streak} onNext={handleNext} />
      )}

      <div className="floating-shapes">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`shape shape-${i + 1}`} />
        ))}
      </div>
    </div>
  );
}
