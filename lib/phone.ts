/**
 * Phone numbers, for sending.
 *
 * The numbers in the app were typed by hand, so they look like "718-555-0101",
 * "(718) 555 0101" or "+1 718 555 0101". Twilio wants E.164 — "+17185550101" —
 * and rejects anything else, so they are normalised at the point of sending
 * rather than being rewritten in the database.
 *
 * Anything this can't read confidently comes back null. A number that isn't
 * clearly right is not quietly guessed at: a wrong digit sends a shul message
 * to a stranger.
 */

/** North American numbers unless the number says otherwise. */
const DEFAULT_COUNTRY = '1';

export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  // An extension means there is no single number to dial.
  if (/\b(ext|x|extension)\b/i.test(trimmed)) return null;

  const hadPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits === '') return null;

  if (hadPlus) {
    // Already international: trust the country code, just sanity-check length.
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }

  if (digits.length === 10) return `+${DEFAULT_COUNTRY}${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;

  // 7 digits is a local number with no area code; 12+ without a plus is a
  // typo or two numbers run together. Neither is safe to send to.
  return null;
}

/** True when a number can actually be messaged. */
export function isSendable(raw: string | null | undefined): boolean {
  return toE164(raw) !== null;
}

/** "+17185550101" -> "(718) 555-0101", for showing it back. */
export function formatForDisplay(e164: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : e164;
}
