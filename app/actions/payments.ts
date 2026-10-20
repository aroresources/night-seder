'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { today } from '@/lib/dates';
import { parseDollars } from '@/lib/money';
import { supabaseServer } from '@/lib/supabase/server';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/types';

import { date, optionalText, text } from './form';

function refresh() {
  revalidatePath('/', 'layout');
}

/**
 * Taken from the one list the form is built from, rather than a second copy
 * kept in step by hand. It used to fall back to cash when it didn't recognise
 * the value, which meant adding a method here would have quietly recorded
 * those payments as cash — wrong, and invisible.
 */
function method(form: FormData): PaymentMethod {
  const value = text(form, 'method');
  const match = PAYMENT_METHODS.find((m) => m.value === value);
  if (!match) throw new Error('Pick how it was paid');
  return match.value;
}

function amount(form: FormData): number {
  const cents = parseDollars(text(form, 'amount'));
  if (cents === null) throw new Error('Enter an amount, for example 180 or 180.50');
  return cents;
}

/**
 * The two ends of a period. A period that finishes before it starts is a typo,
 * and left alone it would quietly report nothing.
 */
function span(form: FormData): { start_date: string; end_date: string } {
  const start_date = date(form, 'start_date');
  const end_date = date(form, 'end_date');
  if (end_date < start_date) throw new Error('The period ends before it starts');
  return { start_date, end_date };
}

// Periods ----------------------------------------------------------------

export async function createPaymentPeriod(form: FormData) {
  const supabase = await supabaseServer();
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const { data, error } = await supabase
    .from('payment_periods')
    .insert({
      name,
      ...span(form),
      note: optionalText(form, 'note'),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  refresh();
  redirect(`/more/payments/${data.id}`);
}

export async function updatePaymentPeriod(id: string, form: FormData) {
  const supabase = await supabaseServer();
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const { error } = await supabase
    .from('payment_periods')
    .update({
      name,
      ...span(form),
      note: optionalText(form, 'note'),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/** Deleting a period deletes its payments with it, so it asks on the page first. */
export async function deletePaymentPeriod(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('payment_periods').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
  redirect('/more/payments');
}

// Payments ---------------------------------------------------------------

export async function recordPayment(periodId: string, personId: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('payments').insert({
    period_id: periodId,
    person_id: personId,
    amount_cents: amount(form),
    date_paid: text(form, 'date_paid') ? date(form, 'date_paid') : today(),
    method: method(form),
    note: optionalText(form, 'note'),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updatePayment(id: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('payments')
    .update({
      amount_cents: amount(form),
      date_paid: text(form, 'date_paid') ? date(form, 'date_paid') : today(),
      method: method(form),
      note: optionalText(form, 'note'),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deletePayment(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('payments').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}
