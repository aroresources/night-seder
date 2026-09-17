'use server';

import { revalidatePath } from 'next/cache';

import { supabaseServer } from '@/lib/supabase/server';
import type { CalendarDate } from '@/lib/dates';

import { date, number, optionalText } from './form';

function refresh() {
  revalidatePath('/', 'layout');
}

export async function addDafDayOff(form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('daf_days_off').insert({
    date: date(form, 'date'),
    reason: optionalText(form, 'reason'),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeDafDayOff(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('daf_days_off').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/** "Make tonight a day off", from the Tonight banner. */
export async function makeNightADayOff(zmanId: string, day: CalendarDate, reason: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('zman_days_off')
    .insert({ zman_id: zmanId, date: day, reason: reason.trim() || null });
  if (error) throw new Error(error.message);
  refresh();
}

/** "Make today a day off", from the Daf banner. */
export async function makeDafADayOff(day: CalendarDate, reason: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('daf_days_off')
    .insert({ date: day, reason: reason.trim() || null });
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateSettings(form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('settings')
    .update({
      night_absence_threshold: Math.max(1, number(form, 'night_absence_threshold', 3)),
      daf_absence_threshold: Math.max(1, number(form, 'daf_absence_threshold', 3)),
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  refresh();
}
