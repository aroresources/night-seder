/**
 * What a text message actually costs to send.
 *
 * A text is not simply "160 characters". Carriers encode plain Latin text as
 * GSM-7 at 160 per part, but a single character outside that set — a curly
 * quote pasted from Word, an accent, any Hebrew — forces the whole message to
 * UCS-2, where a part is 70 characters. So one smart quote can turn a
 * one-part message into three, and triple what a broadcast costs.
 *
 * Multi-part messages lose a few characters per part to the header that
 * stitches them back together: 153 and 67 rather than 160 and 70.
 */

/** Appended so recipients are told how to stop, as the campaign promises. */
export const OPT_OUT_SUFFIX = ' Reply STOP to stop.';

/** Characters GSM-7 can hold directly. */
const GSM_BASIC =
  "@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà\n\r';

/** These exist in GSM-7 but take two slots each. */
const GSM_EXTENDED = '^{}\\[~]|€';

export function isGsm7(text: string): boolean {
  return [...text].every((char) => GSM_BASIC.includes(char) || GSM_EXTENDED.includes(char));
}

/** Slots used, counting the extended characters as the two they cost. */
function gsmLength(text: string): number {
  return [...text].reduce((total, char) => total + (GSM_EXTENDED.includes(char) ? 2 : 1), 0);
}

export interface MessageCost {
  /** How the carrier will encode it. */
  encoding: 'GSM-7' | 'UCS-2';
  /** Characters as a person counts them. */
  characters: number;
  /** Parts, which is what gets billed. */
  segments: number;
  /** Characters left before it spills into another part. */
  remaining: number;
}

export function measure(text: string): MessageCost {
  const characters = [...text].length;
  if (characters === 0) {
    return { encoding: 'GSM-7', characters: 0, segments: 0, remaining: 160 };
  }

  const gsm = isGsm7(text);
  const used = gsm ? gsmLength(text) : characters;
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;

  const segments = used <= single ? 1 : Math.ceil(used / multi);
  const capacity = segments === 1 ? single : segments * multi;

  return {
    encoding: gsm ? 'GSM-7' : 'UCS-2',
    characters,
    segments,
    remaining: capacity - used,
  };
}

/** The message as it will actually be sent. */
export function composeBody(body: string, includeOptOut: boolean): string {
  const trimmed = body.trim();
  if (!includeOptOut) return trimmed;
  // Don't say it twice if it is already there.
  return /\bstop\b/i.test(trimmed) ? trimmed : trimmed + OPT_OUT_SUFFIX;
}
