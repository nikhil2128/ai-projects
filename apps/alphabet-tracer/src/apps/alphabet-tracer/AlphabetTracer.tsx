import { useState, useCallback } from 'react';
import { TracingCanvas } from './components/TracingCanvas';
import { SuccessOverlay } from './components/SuccessOverlay';
import { LetterCard } from './components/LetterCard';
import { ScoreBoard } from './components/ScoreBoard';
import { getRandomLetter } from './utils/letters';
import { useRewards } from '../../context/RewardsContext';

const APP_ID = 'alphabet-tracer';

type GameState = 'tracing' | 'success';

export function AlphabetTracer() {
  const { getRewards, incrementScore, incrementStreak } = useRewards();
  const rewards = getRewards(APP_ID);

  const [letter, setLetter] = useState(() => getRandomLetter());
  const [gameState, setGameState] = useState<GameState>('tracing');
  const [animateCard, setAnimateCard] = useState(true);

  const handleSuccess = useCallback(() => {
    setGameState('success');
    incrementScore(APP_ID);
    incrementStreak(APP_ID);
  }, [incrementScore, incrementStreak]);

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
    <div className="tracer-app">
      <div className="tracer-header">
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
        <ScoreBoard score={rewards.score} streak={rewards.streak} />
      </div>

      <main className="game-area">
        <LetterCard letter={letter} animate={animateCard} />
        <TracingCanvas
          letter={letter}
          onSuccess={handleSuccess}
          disabled={gameState === 'success'}
        />
      </main>

      {gameState === 'success' && (
        <SuccessOverlay letter={letter} streak={rewards.streak} onNext={handleNext} />
      )}
    </div>
  );
}
