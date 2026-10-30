/**
 * Reading a text that came *in*.
 *
 * Two jobs, both pure so they can be tested without a network: deciding what
 * a reply means, and proving Twilio really sent it.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type Keyword = 'join' | 'stop' | 'help' | 'other';

/**
 * Carriers mandate STOP, HELP and START; JOIN is ours. Anything else is a man
 * texting back like a person, which is not a command.
 *
 * Matched on the first word only, and punctuation is dropped: "Join!" and
 * "join please" are plainly a man asking to join.
 */
export function classifyKeyword(body: string): Keyword {
  const first = body
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-z]/gi, '')
    .toLowerCase();
  if (!first) return 'other';

  if (['join', 'start', 'yes', 'unstop', 'subscribe'].includes(first)) return 'join';
  if (['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'].includes(first)) return 'stop';
  if (['help', 'info'].includes(first)) return 'help';
  return 'other';
}

/**
 * Twilio signs every request with the account's auth token.
 *
 * Without this anyone who found the URL could opt a man in, or out, by
 * posting his number — the webhook is the one door into this app that has no
 * password on it.
 *
 * The signature is over the exact URL Twilio called plus every form field,
 * sorted by name and run together with no separators. Get the URL wrong and
 * it fails, which is why the caller passes the public URL rather than
 * whatever the proxy in front rewrote it to.
 */
export function isFromTwilio(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false;

  const payload = Object.keys(params)
    .sort()
    .reduce((text, key) => text + key + params[key], url);

  const expected = createHmac('sha1', authToken).update(Buffer.from(payload, 'utf8')).digest();
  let given: Buffer;
  try {
    given = Buffer.from(signature, 'base64');
  } catch {
    return false;
  }

  // Compared in constant time, and only when the lengths already match:
  // timingSafeEqual throws on a length mismatch rather than returning false.
  return expected.length === given.length && timingSafeEqual(expected, given);
}
