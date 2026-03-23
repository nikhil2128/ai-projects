import { useState, useCallback, useRef, useEffect } from 'react';
import { WordCard } from './components/WordCard';
import { MicButton } from './components/MicButton';
import { CVCSuccessOverlay } from './components/CVCSuccessOverlay';
import { ScoreBoard } from '../alphabet-tracer/components/ScoreBoard';
import { getRandomWord, matchWord, type CVCWord } from './utils/words';
import { useRewards } from '../../context/RewardsContext';

const APP_ID = 'cvc-reader';

type GameState = 'idle' | 'listening' | 'correct' | 'incorrect';

const SpeechRecognitionClass =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null;

function speakWord(text: string) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const letters = text.split('');

  letters.forEach((letter, i) => {
    const u = new SpeechSynthesisUtterance(letter);
    u.rate = 0.6;
    u.pitch = 1.1;
    u.lang = 'en-US';
    if (i === 0) {
      setTimeout(() => speechSynthesis.speak(u), 0);
    } else {
      setTimeout(() => speechSynthesis.speak(u), i * 600);
    }
  });

  setTimeout(() => {
    const full = new SpeechSynthesisUtterance(text);
    full.rate = 0.75;
    full.pitch = 1.1;
    full.lang = 'en-US';
    speechSynthesis.speak(full);
  }, letters.length * 600 + 400);
}

export function CVCReader() {
  const { getRewards, incrementScore, incrementStreak, resetStreak } = useRewards();
  const rewards = getRewards(APP_ID);

  const [word, setWord] = useState<CVCWord>(() => getRandomWord());
  const [gameState, setGameState] = useState<GameState>('idle');
  const [animateCard, setAnimateCard] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);

  const isSupported = !!SpeechRecognitionClass;

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, []);

  const handleResult = useCallback(
    (alternatives: string[]) => {
      const isCorrect = matchWord(word.word, alternatives);
      if (isCorrect) {
        setGameState('correct');
        incrementScore(APP_ID);
        incrementStreak(APP_ID);
      } else {
        setGameState('incorrect');
        resetStreak(APP_ID);
        const heard = alternatives[0] || '...';
        setErrorMessage(`I heard "${heard}". Try again!`);
      }
    },
    [word.word, incrementScore, incrementStreak, resetStreak],
  );

  const startListening = useCallback(() => {
    if (!isSupported || gameState !== 'idle') return;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    let gotResult = false;

    recognition.onresult = (event: any) => {
      gotResult = true;
      const results = event.results[0];
      const alternatives: string[] = [];
      for (let i = 0; i < results.length; i++) {
        alternatives.push(results[i].transcript.toLowerCase().trim());
      }
      handleResult(alternatives);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        setGameState('incorrect');
        setErrorMessage("I couldn't hear you. Try again!");
      } else if (event.error === 'not-allowed') {
        setGameState('idle');
        setErrorMessage('Please allow microphone access!');
      } else {
        setGameState('idle');
      }
    };

    recognition.onend = () => {
      if (!gotResult) {
        setGameState((prev) => (prev === 'listening' ? 'idle' : prev));
      }
    };

    recognitionRef.current = recognition;
    setGameState('listening');
    recognition.start();
  }, [isSupported, gameState, handleResult]);

  useEffect(() => {
    if (gameState === 'incorrect') {
      const timer = setTimeout(() => {
        setGameState('idle');
        setErrorMessage('');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleNext = useCallback(() => {
    setAnimateCard(false);
    const next = getRandomWord(word.word);
    setTimeout(() => {
      setWord(next);
      setGameState('idle');
      setErrorMessage('');
      setAnimateCard(true);
    }, 50);
  }, [word.word]);

  const handleSkip = useCallback(() => {
    resetStreak(APP_ID);
    handleNext();
  }, [resetStreak, handleNext]);

  if (!isSupported) {
    return (
      <div className="cvc-app">
        <div className="cvc-unsupported">
          <span className="cvc-unsupported-icon">🎤</span>
          <h2>Speech Recognition Needed</h2>
          <p>Please use Chrome, Edge, or Safari to play this game.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cvc-app">
      <div className="cvc-header">
        <div className="title-section">
          <h1 className="app-title">
            <span className="title-letter" style={{ color: '#6BCB77' }}>W</span>
            <span className="title-letter" style={{ color: '#FFD93D' }}>o</span>
            <span className="title-letter" style={{ color: '#FF6B6B' }}>r</span>
            <span className="title-letter" style={{ color: '#4ECDC4' }}>d</span>
            <span className="title-space"> </span>
            <span className="title-word">Reader</span>
          </h1>
          <p className="subtitle">Read the word aloud!</p>
        </div>
        <ScoreBoard score={rewards.score} streak={rewards.streak} />
      </div>

      <main className="cvc-game-area">
        <WordCard
          word={word}
          animate={animateCard}
          shake={gameState === 'incorrect'}
          onSpeak={() => speakWord(word.word)}
        />

        <div className="cvc-action-area">
          {gameState === 'incorrect' && (
            <div className="cvc-error-feedback">
              <span className="cvc-error-icon">💪</span>
              <span className="cvc-error-text">{errorMessage}</span>
            </div>
          )}

          {gameState !== 'correct' && (
            <MicButton
              isListening={gameState === 'listening'}
              onClick={startListening}
              disabled={gameState === 'incorrect'}
            />
          )}

          {gameState === 'idle' && (
            <p className="cvc-hint">Tap the microphone and read the word!</p>
          )}

          {gameState === 'listening' && (
            <p className="cvc-hint cvc-hint-listening">I'm listening...</p>
          )}

          {gameState === 'idle' && (
            <button className="cvc-skip-btn" onClick={handleSkip} type="button">
              Skip →
            </button>
          )}
        </div>
      </main>

      {gameState === 'correct' && (
        <CVCSuccessOverlay
          word={word}
          streak={rewards.streak}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
