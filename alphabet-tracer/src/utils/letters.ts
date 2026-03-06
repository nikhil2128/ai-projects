const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export function getRandomLetter(exclude?: string): string {
  const pool = exclude
    ? ALPHABET.split('').filter((l) => l !== exclude)
    : ALPHABET.split('');
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getShuffledLetters(): string[] {
  const letters = ALPHABET.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
}
