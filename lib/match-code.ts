/**
 * Random 6-digit numeric match code (000000–999999).
 */
export function generateMatchCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

export function isValidMatchCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
