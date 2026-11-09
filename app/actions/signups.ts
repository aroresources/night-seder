'use server';

import { revalidatePath } from 'next/cache';

import { CONSENT_TEXT } from '@/lib/consent';
import { toE164 } from '@/lib/phone';
import { supabaseServer } from '@/lib/supabase/server';

export interface SignupResult {
  ok: boolean;
  error?: string;
}

/**
 * The public form at /texts.
 *
 * This runs for anyone on the internet, so it only ever inserts into
 * `sms_signups` — it cannot read a member, and it cannot tick anybody for
 * texts. That happens in the app, once the signup has been matched to a man.
 */
export async function signUpForTexts(form: FormData): Promise<SignupResult> {
  // A field no person can see, so anything in it was filled in by a script.
  if (String(form.get('website') ?? '') !== '') return { ok: true };

  if (form.get('consent') !== 'on') {
    return { ok: false, error: 'Please tick the box to agree.' };
  }

  const take = (name: string) => String(form.get(name) ?? '').trim().slice(0, 80);
  const last_name = take('last_name');
  if (!last_name) return { ok: false, error: 'Please put in your last name.' };

  const typed = take('phone');
  if (!toE164(typed)) {
    return { ok: false, error: "That doesn't look like a mobile number. Try 732-555-0101." };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from('sms_signups').insert({
    first_name: take('first_name') || null,
    last_name,
    phone: typed,
    consent_text: CONSENT_TEXT,
  });
  if (error) return { ok: false, error: "Something went wrong. Please try again." };

  revalidatePath('/more/signups');
  return { ok: true };
}

/** Tick the man for texts and mark the signup dealt with. */
export async function acceptSignup(signupId: string, personId: string) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('people')
    .update({ sms_opt_in: true })
    .eq('id', personId);
  if (error) throw new Error(error.message);

  // Unsubscribed in the same breath. If the number was getting texts in its
  // own right and is now a man who is ticked, leaving both on would send him
  // every broadcast twice.
  const { error: markError } = await supabase
    .from('sms_signups')
    .update({ handled_at: new Date().toISOString(), person_id: personId, subscribed: false })
    .eq('id', signupId);
  if (markError) throw new Error(markError.message);

  revalidatePath('/', 'layout');
}

/** Dealt with, but nobody was ticked — a duplicate, or not one of ours. */
export async function dismissSignup(signupId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('sms_signups')
    .update({ handled_at: new Date().toISOString() })
    .eq('id', signupId);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/**
 * Give the number itself the texts, without knowing whose it is.
 *
 * He texted JOIN, which is consent whether or not anyone can put a name to
 * him, and he was told he would be added. This is how that promise is kept
 * when nobody recognises the number. He gets messages aimed at everybody and
 * nothing else: the programme lists are lists he is not on.
 *
 * Deliberately a decision you make rather than something that happens by
 * itself, so a wrong number or a stranger can be dismissed instead.
 */
export async function subscribeSignup(signupId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('sms_signups')
    .update({ subscribed: true, handled_at: new Date().toISOString() })
    .eq('id', signupId)
    // Never undo a STOP with a tap. He asked not to be texted; only he can
    // change that, by texting JOIN again.
    .eq('opted_out', false);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}

/** Stop texting a number you never put a name to. */
export async function unsubscribeSignup(signupId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('sms_signups')
    .update({ subscribed: false })
    .eq('id', signupId);
  if (error) throw new Error(error.message);
  revalidatePath('/', 'layout');
}
