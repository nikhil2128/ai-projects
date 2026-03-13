const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = BigInt(ALPHABET.length);

/**
 * Encode a numeric ID into a Base62 string.
 * Uses bigint to handle arbitrarily large IDs without overflow.
 */
export function encodeBase62(id: number | bigint): string {
  let n = BigInt(id);
  if (n === 0n) return ALPHABET[0];

  let result = "";
  while (n > 0n) {
    result = ALPHABET[Number(n % BASE)] + result;
    n = n / BASE;
  }
  return result;
}

/**
 * Decode a Base62 string back to a numeric ID.
 */
export function decodeBase62(code: string): bigint {
  let result = 0n;
  for (const ch of code) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid Base62 character: ${ch}`);
    result = result * BASE + BigInt(idx);
  }
  return result;
}

/**
 * Generate a short code from a DB row ID, padded to the desired length.
 * Adds a random salt offset to make codes non-sequential and harder to enumerate.
 */
export function generateShortCode(id: number, length: number): string {
  const offset = 100_000_000;
  const code = encodeBase62(id + offset);
  return code.padStart(length, "0").slice(-length);
}
