'use server';

import { revalidatePath } from 'next/cache';

import { supabaseServer } from '@/lib/supabase/server';
import type { CalendarDate } from '@/lib/dates';

import { date, number, optionalText } from './form';

function refresh() {
  revalidatePath('/', 'layout');
}

type MorningDaysOff = 'daf_days_off' | 'shachris_days_off';

export async function addMorningDayOff(table: MorningDaysOff, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from(table).insert({
    date: date(form, 'date'),
    reason: optionalText(form, 'reason'),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeMorningDayOff(table: MorningDaysOff, id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from(table).delete().eq('id', id);
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

/** "Make today a day off", from the Morning banner. */
export async function makeMorningADayOff(
  table: MorningDaysOff,
  day: CalendarDate,
  reason: string,
) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from(table)
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
      shachris_absence_threshold: Math.max(1, number(form, 'shachris_absence_threshold', 3)),
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
  refresh();
}
