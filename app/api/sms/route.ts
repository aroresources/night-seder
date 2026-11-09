import { NextResponse, type NextRequest } from 'next/server';

import { toE164 } from '@/lib/phone';
import { classifyKeyword, isFromTwilio } from '@/lib/sms-inbound';
import { adminConfigured, supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Where Twilio delivers a text somebody sent to the shul's number.
 *
 * This is the one door into the app with no password on it, so nothing is
 * read or written until the request is proved to have come from Twilio. Every
 * reply is TwiML, which is what Twilio expects back.
 *
 * Opting a man in from his own text is safe in a way the web form is not: the
 * number is the carrier's, not something typed into a box, so the man who
 * texted JOIN really does hold it.
 *
 * It talks to Supabase as the service role rather than through a cookie,
 * because Twilio has no session. With the ordinary client this request lands
 * as `anon`, and `people` is granted to `authenticated` only — so the lookup
 * came back empty with no error, every man was treated as a stranger, and
 * every JOIN was answered with a promise the app had not kept. See
 * lib/supabase/admin.ts.
 */

const JOINED =
  'Ohr Mattisyahu: You are now opted in to texts about night seder and morning learning. ' +
  'Msg & data rates may apply. Reply HELP for help, STOP to opt out.';

// He is not one of ours yet, so he is not told he is on the list. Saying so
// is what made the bug invisible: the men believed it, and nobody chased it.
const NOTED =
  'Ohr Mattisyahu: Thanks, we have your number and will add you to the list shortly. ' +
  'Msg & data rates may apply. Reply HELP for help, STOP to opt out.';

const LEFT = 'Ohr Mattisyahu: You will get no further texts. Reply JOIN to start again.';

const HELP =
  'Ohr Mattisyahu night seder texts. Reply JOIN to get messages, STOP to stop. ' +
  'Msg & data rates may apply. tzvir@ohrmattisyahu.com';

function twiml(message: string | null) {
  const body = message
    ? `<Response><Message>${message.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Message></Response>`
    : '<Response/>';
  return new NextResponse(body, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Refuse rather than fall open: an unverified request could opt anyone in.
  if (!authToken) return new NextResponse('Not configured', { status: 503 });

  // Refuse rather than half-work. Without the key every man reads as a
  // stranger, which is a silent wrong answer — Twilio retries a 503, so a
  // text that arrives during a misconfiguration is held rather than mishandled.
  if (!adminConfigured()) return new NextResponse('Not configured', { status: 503 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') params[key] = value;
  }

  // The URL Twilio signed, not whatever the proxy in front rewrote it to.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const url = `https://${host}${request.nextUrl.pathname}`;

  if (!isFromTwilio(authToken, url, params, request.headers.get('x-twilio-signature'))) {
    return new NextResponse('Bad signature', { status: 403 });
  }

  const from = toE164(params.From ?? '');
  const keyword = classifyKeyword(params.Body ?? '');
  if (!from || keyword === 'other') return twiml(null);
  if (keyword === 'help') return twiml(HELP);

  const supabase = supabaseAdmin();
  const { data: people, error } = await supabase
    .from('people')
    .select('id, phone')
    .eq('active', true);
  if (error) throw new Error(error.message);

  // Matched on the number itself: how it was typed into the app varies, the
  // number does not.
  const matches = people.filter((person) => toE164(person.phone) === from);

  if (keyword === 'stop') {
    if (matches.length > 0) {
      const { error: stopError } = await supabase
        .from('people')
        .update({ sms_opt_out: true, sms_opt_in: false })
        .in(
          'id',
          matches.map((person) => person.id),
        );
      if (stopError) throw new Error(stopError.message);
    }
    // Twilio blocks him at its end regardless; this is so the app agrees.
    return twiml(LEFT);
  }

  if (matches.length > 0) {
    const { error: joinError } = await supabase
      .from('people')
      .update({ sms_opt_in: true, sms_opt_out: false })
      .in(
        'id',
        matches.map((person) => person.id),
      );
    if (joinError) throw new Error(joinError.message);
    return twiml(JOINED);
  }

  // A number we don't hold. Recorded for matching rather than dropped: it
  // is somebody who asked to be on the list.
  const { error: signupError } = await supabase.from('sms_signups').insert({
    last_name: 'Texted JOIN',
    phone: from,
    consent_text: `Texted "${(params.Body ?? '').trim().slice(0, 60)}" to the shul's number`,
  });
  if (signupError) throw new Error(signupError.message);

  return twiml(NOTED);
}
