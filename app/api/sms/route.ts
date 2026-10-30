import { NextResponse, type NextRequest } from 'next/server';

import { toE164 } from '@/lib/phone';
import { classifyKeyword, isFromTwilio } from '@/lib/sms-inbound';
import { supabaseServer } from '@/lib/supabase/server';

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
 */

const JOINED =
  'Ohr Mattisyahu: You are now opted in to texts about night seder and morning learning. ' +
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

  const supabase = await supabaseServer();
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
      await supabase
        .from('people')
        .update({ sms_opt_out: true, sms_opt_in: false })
        .in(
          'id',
          matches.map((person) => person.id),
        );
    }
    // Twilio blocks him at its end regardless; this is so the app agrees.
    return twiml(LEFT);
  }

  if (matches.length > 0) {
    await supabase
      .from('people')
      .update({ sms_opt_in: true, sms_opt_out: false })
      .in(
        'id',
        matches.map((person) => person.id),
      );
  } else {
    // A number we don't hold. Recorded for matching rather than dropped: it
    // is somebody who asked to be on the list.
    await supabase.from('sms_signups').insert({
      last_name: 'Texted JOIN',
      phone: from,
      consent_text: `Texted "${(params.Body ?? '').trim().slice(0, 60)}" to the shul's number`,
    });
  }

  return twiml(JOINED);
}
