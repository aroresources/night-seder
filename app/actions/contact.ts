'use server';

import { revalidatePath } from 'next/cache';

import { addDays, today } from '@/lib/dates';
import { supabaseServer } from '@/lib/supabase/server';
import type { Channel } from '@/lib/types';

import { date, number, optionalDate, optionalText, text } from './form';

function refresh() {
  revalidatePath('/', 'layout');
}

const CHANNEL_VALUES: Channel[] = ['call', 'text', 'whatsapp', 'email', 'in_person'];

function channel(form: FormData): Channel {
  const value = text(form, 'channel');
  const match = CHANNEL_VALUES.find((c) => c === value);
  if (!match) throw new Error('Pick how you got in touch');
  return match;
}

/**
 * A date and a channel are enough. The snooze is separate on purpose: logging
 * a call doesn't mean he came back, so it never clears a missed-streak flag.
 */
export async function logContact(personId: string, form: FormData) {
  const supabase = await supabaseServer();

  const { error } = await supabase.from('correspondence').insert({
    person_id: personId,
    date: date(form, 'date'),
    channel: channel(form),
    note: optionalText(form, 'note'),
    follow_up_date: optionalDate(form, 'follow_up_date'),
  });
  if (error) throw new Error(error.message);

  const snoozeDays = number(form, 'snooze_days', 0);
  if (snoozeDays > 0) {
    const { error: snoozeError } = await supabase
      .from('people')
      .update({ snoozed_until: addDays(today(), snoozeDays) })
      .eq('id', personId);
    if (snoozeError) throw new Error(snoozeError.message);
  }

  refresh();
}

export async function updateContactEntry(id: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('correspondence')
    .update({
      date: date(form, 'date'),
      channel: channel(form),
      note: optionalText(form, 'note'),
      follow_up_date: optionalDate(form, 'follow_up_date'),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteContactEntry(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('correspondence').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function snoozeForDays(personId: string, days: number) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update({ snoozed_until: days > 0 ? addDays(today(), days) : null })
    .eq('id', personId);
  if (error) throw new Error(error.message);
  refresh();
}
