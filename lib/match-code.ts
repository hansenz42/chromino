/**
 * Random 6-character uppercase match code (A–Z, 2–9, no 0/1/I/O).
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateMatchCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function isValidMatchCode(code: string): boolean {
  return (
    /^[A-Z2-9]{6}$/.test(code) && [...code].every((c) => ALPHABET.includes(c))
  );
}
