interface LetterCardProps {
  letter: string;
  animate: boolean;
}

const LETTER_COLORS: Record<string, string> = {
  a: '#FF6B6B', b: '#FF8E53', c: '#FFD93D', d: '#6BCB77',
  e: '#4D96FF', f: '#9B59B6', g: '#FF6B9D', h: '#00CEC9',
  i: '#E17055', j: '#FDCB6E', k: '#A29BFE', l: '#55A3F0',
  m: '#FF7675', n: '#74B9FF', o: '#81ECEC', p: '#FAB1A0',
  q: '#DFE6E9', r: '#E056A0', s: '#00B894', t: '#FFEAA7',
  u: '#6C5CE7', v: '#FD79A8', w: '#00CEC9', x: '#E84393',
  y: '#F9CA24', z: '#30336B',
};

export function LetterCard({ letter, animate }: LetterCardProps) {
  const color = LETTER_COLORS[letter] || '#FF6B6B';

  return (
    <div className={`letter-card ${animate ? 'letter-card-enter' : ''}`}>
      <div className="letter-card-label">Write this letter:</div>
      <div className="letter-card-display" style={{ color }}>
        {letter}
      </div>
      <div className="letter-card-name">
        &ldquo;{letter}&rdquo; as in{' '}
        <strong>{LETTER_WORDS[letter]}</strong>
      </div>
    </div>
  );
}

const LETTER_WORDS: Record<string, string> = {
  a: '🍎 Apple', b: '🦋 Butterfly', c: '🐱 Cat', d: '🐶 Dog',
  e: '🐘 Elephant', f: '🐸 Frog', g: '🦒 Giraffe', h: '🐴 Horse',
  i: '🍦 Ice cream', j: '🤹 Juggler', k: '🪁 Kite', l: '🦁 Lion',
  m: '🐵 Monkey', n: '🥜 Nut', o: '🐙 Octopus', p: '🐧 Penguin',
  q: '👸 Queen', r: '🐰 Rabbit', s: '⭐ Star', t: '🐢 Turtle',
  u: '☂️ Umbrella', v: '🎻 Violin', w: '🐋 Whale', x: '❌ X-ray',
  y: '🧶 Yarn', z: '🦓 Zebra',
};
