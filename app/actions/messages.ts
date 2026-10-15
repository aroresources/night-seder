'use server';

import { revalidatePath } from 'next/cache';

import { toE164 } from '@/lib/phone';
import { OPTED_OUT, sendSms, smsConfigured } from '@/lib/sms';
import { supabaseServer } from '@/lib/supabase/server';
import type { Person } from '@/lib/types';

import { text } from './form';

export interface SendOutcome {
  sent: number;
  failed: number;
  skipped: number;
  /** Why anyone was skipped or failed, by name, so it can be fixed. */
  problems: { name: string; reason: string }[];
}

/** Who the message is going to. Mirrors the filters on the People screen. */
function pickRecipients(people: Person[], audience: string, groupIds: Set<string>): Person[] {
  return people.filter((person) => {
    if (!person.active) return false;
    switch (audience) {
      case 'night':
        return person.in_night_seder;
      case 'daf':
        return person.in_daf;
      case 'shachris':
        return person.in_shachris;
      case 'group':
        return groupIds.has(person.id);
      default:
        return true;
    }
  });
}

/**
 * Send one message to everybody chosen, one text each — never a group thread.
 *
 * Carries on when a number fails so one bad number can't stop the rest, and
 * writes down what happened to each man. Nothing is logged to the
 * correspondence log: a broadcast is not the same as reaching out to someone,
 * and recording it there would reset every man's "last contact" to today.
 */
export async function sendBroadcast(form: FormData): Promise<SendOutcome> {
  const body = text(form, 'body').trim();
  if (!body) throw new Error('Write a message first');
  if (!smsConfigured()) throw new Error('Texting is not set up yet — add the Twilio keys first');

  const audience = text(form, 'audience') || 'all';
  const groupId = text(form, 'group_id');

  const supabase = await supabaseServer();

  const { data: people, error: peopleError } = await supabase.from('people').select('*');
  if (peopleError) throw new Error(peopleError.message);

  let inGroup = new Set<string>();
  if (audience === 'group' && groupId) {
    const { data: members, error } = await supabase
      .from('person_groups')
      .select('person_id')
      .eq('group_id', groupId);
    if (error) throw new Error(error.message);
    inGroup = new Set(members.map((m) => m.person_id));
  }

  const recipients = pickRecipients(people, audience, inGroup);
  if (recipients.length === 0) throw new Error('Nobody matches that');

  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({ body, audience: text(form, 'audience_label') || audience })
    .select('id')
    .single();
  if (messageError) throw new Error(messageError.message);

  const outcome: SendOutcome = { sent: 0, failed: 0, skipped: 0, problems: [] };
  const rows: {
    message_id: string;
    person_id: string;
    phone: string | null;
    status: 'sent' | 'failed' | 'skipped';
    error: string | null;
  }[] = [];
  const nowOptedOut: string[] = [];

  for (const person of recipients) {
    const phone = toE164(person.phone);

    if (person.sms_opt_out) {
      outcome.skipped += 1;
      outcome.problems.push({ name: person.name, reason: 'He asked not to be texted' });
      rows.push({
        message_id: message.id,
        person_id: person.id,
        phone,
        status: 'skipped',
        error: 'opted out',
      });
      continue;
    }

    if (!phone) {
      outcome.skipped += 1;
      outcome.problems.push({
        name: person.name,
        reason: person.phone ? `Can't read "${person.phone}"` : 'No phone number',
      });
      rows.push({
        message_id: message.id,
        person_id: person.id,
        phone: null,
        status: 'skipped',
        error: 'no usable number',
      });
      continue;
    }

    const result = await sendSms(phone, body);
    if (result.ok) {
      outcome.sent += 1;
      rows.push({
        message_id: message.id,
        person_id: person.id,
        phone,
        status: 'sent',
        error: null,
      });
    } else {
      outcome.failed += 1;
      outcome.problems.push({ name: person.name, reason: result.error ?? 'Failed' });
      rows.push({
        message_id: message.id,
        person_id: person.id,
        phone,
        status: 'failed',
        error: result.error ?? null,
      });
      // He replied STOP at some point: remember it so he isn't tried again.
      if (result.code === OPTED_OUT) nowOptedOut.push(person.id);
    }
  }

  const { error: rowsError } = await supabase.from('message_recipients').insert(rows);
  if (rowsError) throw new Error(rowsError.message);

  if (nowOptedOut.length > 0) {
    await supabase.from('people').update({ sms_opt_out: true }).in('id', nowOptedOut);
  }

  revalidatePath('/', 'layout');
  return outcome;
}
