/**
 * Money, stored as a whole number of cents.
 *
 * Amounts are never kept as floating point: 0.1 + 0.2 is not 0.3, and a
 * payments ledger that drifts by a cent a month is worse than useless. The
 * database column is an integer, and dollars exist only at the edges — what
 * you type in, and what you read on screen.
 */

/**
 * "180", "$180.50", "1,800" -> cents. Returns null for anything that isn't a
 * plain non-negative amount, so the caller can leave the field alone rather
 * than silently saving a zero.
 */
export function parseDollars(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  // Round away the binary representation error before it reaches the database.
  return Math.round(value * 100);
}

/** 18000 -> "$180.00". Always two decimals, because a ledger should line up. */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

/** 18000 -> "180.00", for prefilling a number input. */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
