import type { CVCWord } from '../utils/words';

interface WordCardProps {
  word: CVCWord;
  animate: boolean;
  shake: boolean;
  onSpeak: () => void;
}

const LETTER_COLORS = ['#FF6B6B', '#4ECDC4', '#FFD93D', '#6BCB77', '#9B59B6'];

export function WordCard({ word, animate, shake, onSpeak }: WordCardProps) {
  const letters = word.word.split('');

  return (
    <div
      className={`cvc-word-card${animate ? ' cvc-word-card-enter' : ''}${shake ? ' cvc-word-card-shake' : ''}`}
    >
      <div className="cvc-word-emoji">{word.emoji}</div>
      <div className="cvc-word-text">
        {letters.map((letter, i) => (
          <span
            key={i}
            className="cvc-word-letter"
            style={{
              color: LETTER_COLORS[i % LETTER_COLORS.length],
              animationDelay: `${i * 0.15}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>
      <div className="cvc-phonics">
        {letters.map((letter, i) => (
          <span key={i}>
            <span className="cvc-phonics-letter">{letter}</span>
            {i < letters.length - 1 && <span className="cvc-phonics-dot"> · </span>}
          </span>
        ))}
      </div>
      <button className="cvc-speak-btn" onClick={onSpeak} type="button">
        🔊 Hear it
      </button>
    </div>
  );
}
