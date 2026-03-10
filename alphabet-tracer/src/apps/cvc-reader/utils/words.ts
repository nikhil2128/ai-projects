export interface CVCWord {
  word: string;
  emoji: string;
  color: string;
}

const CVC_WORDS: CVCWord[] = [
  { word: 'cat', emoji: '🐱', color: '#FF6B6B' },
  { word: 'dog', emoji: '🐕', color: '#4ECDC4' },
  { word: 'hat', emoji: '🎩', color: '#9B59B6' },
  { word: 'sun', emoji: '☀️', color: '#FFD93D' },
  { word: 'cup', emoji: '🥤', color: '#4D96FF' },
  { word: 'bus', emoji: '🚌', color: '#FF8E53' },
  { word: 'bed', emoji: '🛏️', color: '#6BCB77' },
  { word: 'pig', emoji: '🐷', color: '#FF6B9D' },
  { word: 'bug', emoji: '🐛', color: '#00CEC9' },
  { word: 'bat', emoji: '🦇', color: '#636E72' },
  { word: 'hen', emoji: '🐔', color: '#FFEAA7' },
  { word: 'fox', emoji: '🦊', color: '#E17055' },
  { word: 'box', emoji: '📦', color: '#A29BFE' },
  { word: 'jam', emoji: '🍇', color: '#D63031' },
  { word: 'mug', emoji: '☕', color: '#B2BEC3' },
  { word: 'rug', emoji: '🧶', color: '#E84393' },
  { word: 'net', emoji: '🥅', color: '#00B894' },
  { word: 'pen', emoji: '🖊️', color: '#0984E3' },
  { word: 'pot', emoji: '🍯', color: '#FDCB6E' },
  { word: 'nut', emoji: '🥜', color: '#DFE6E9' },
  { word: 'van', emoji: '🚐', color: '#55EFC4' },
  { word: 'leg', emoji: '🦵', color: '#FAB1A0' },
  { word: 'top', emoji: '🔝', color: '#FF7675' },
  { word: 'run', emoji: '🏃', color: '#00CEC9' },
  { word: 'red', emoji: '🔴', color: '#FF6B6B' },
  { word: 'big', emoji: '🐘', color: '#636E72' },
  { word: 'hot', emoji: '🔥', color: '#E17055' },
  { word: 'wet', emoji: '💧', color: '#74B9FF' },
  { word: 'mat', emoji: '🧹', color: '#A29BFE' },
  { word: 'pan', emoji: '🍳', color: '#FFEAA7' },
  { word: 'can', emoji: '🥫', color: '#FF7675' },
  { word: 'man', emoji: '👨', color: '#0984E3' },
  { word: 'sit', emoji: '🪑', color: '#6BCB77' },
  { word: 'hop', emoji: '🐸', color: '#00B894' },
  { word: 'hug', emoji: '🤗', color: '#FF6B9D' },
  { word: 'fun', emoji: '🎉', color: '#FFD93D' },
  { word: 'gum', emoji: '🫧', color: '#E84393' },
  { word: 'log', emoji: '🪵', color: '#FDCB6E' },
  { word: 'tub', emoji: '🛁', color: '#74B9FF' },
  { word: 'map', emoji: '🗺️', color: '#4ECDC4' },
];

export function getRandomWord(exclude?: string): CVCWord {
  const filtered = exclude
    ? CVC_WORDS.filter((w) => w.word !== exclude)
    : CVC_WORDS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export function matchWord(target: string, spokenAlternatives: string[]): boolean {
  const t = target.toLowerCase().trim();

  return spokenAlternatives.some((spoken) => {
    const s = spoken.toLowerCase().trim();
    if (s === t) return true;
    if (s.split(/\s+/).some((w) => w === t)) return true;
    return false;
  });
}
