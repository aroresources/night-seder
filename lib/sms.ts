import 'server-only';

/**
 * Sending a text through Twilio.
 *
 * The auth token is the first real secret this app holds. It is read from a
 * plain server-side variable — never NEXT_PUBLIC_ — so it stays on the server
 * and is never compiled into anything the browser downloads. This module is
 * server-only for the same reason: importing it from a client component is a
 * build error rather than a leak.
 */

export interface SmsResult {
  ok: boolean;
  /** Twilio's id for the message, when it took it. */
  sid?: string;
  error?: string;
  /** Twilio's numeric code, so callers can act on specific failures. */
  code?: number;
}

/** 21610: the number replied STOP. Not a fault — he asked not to be texted. */
export const OPTED_OUT = 21610;

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM_NUMBER),
  );
}

/**
 * Send one message. Returns rather than throws: a broadcast carries on when
 * one number fails, and each failure is recorded against the man it was for.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !(service || from)) {
    return { ok: false, error: 'Texting is not set up yet.' };
  }

  const form = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service is what carries the 10DLC registration, so it wins
  // over a bare number when both are configured.
  if (service) form.set('MessagingServiceSid', service);
  else if (from) form.set('From', from);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    );

    const payload = (await response.json()) as {
      sid?: string;
      message?: string;
      code?: number;
    };

    if (!response.ok) {
      return {
        ok: false,
        error: payload.message ?? `Twilio returned ${response.status}`,
        code: payload.code,
      };
    }

    return { ok: true, sid: payload.sid };
  } catch (error) {
    // A network failure, not a rejection. Worth distinguishing: the message
    // may or may not have gone.
    return { ok: false, error: error instanceof Error ? error.message : 'Could not reach Twilio' };
  }
}
