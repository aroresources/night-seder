'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { today } from '@/lib/dates';
import { supabaseServer } from '@/lib/supabase/server';
import type { Role } from '@/lib/types';

import { checkbox, optionalDate, optionalText, text } from './form';

function refreshEverything() {
  // A person shows up on every screen, so nothing here is worth narrowing.
  revalidatePath('/', 'layout');
}

function role(form: FormData): Role {
  return text(form, 'role') === 'rabbi' ? 'rabbi' : 'working';
}

export async function createPerson(form: FormData) {
  const supabase = await supabaseServer();
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const { data, error } = await supabase
    .from('people')
    .insert({
      name,
      role: role(form),
      phone: optionalText(form, 'phone'),
      notes: optionalText(form, 'notes'),
      in_night_seder: checkbox(form, 'in_night_seder'),
      in_daf: checkbox(form, 'in_daf'),
      start_date: optionalDate(form, 'start_date') ?? today(),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  refreshEverything();
  redirect(`/more/people/${data.id}`);
}

/** Paste a list of names, one per line; role and the Daf flag apply to all. */
export async function bulkAddPeople(form: FormData) {
  const names = text(form, 'names')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (names.length === 0) throw new Error('Paste at least one name');

  const supabase = await supabaseServer();
  const start_date = optionalDate(form, 'start_date') ?? today();
  const shared = {
    role: role(form),
    in_night_seder: checkbox(form, 'in_night_seder'),
    in_daf: checkbox(form, 'in_daf'),
    start_date,
  };

  const { error } = await supabase
    .from('people')
    .insert(names.map((name) => ({ name, ...shared })));
  if (error) throw new Error(error.message);

  refreshEverything();
  redirect('/more/people');
}

export async function updatePerson(id: string, form: FormData) {
  const supabase = await supabaseServer();
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const { error } = await supabase
    .from('people')
    .update({
      name,
      role: role(form),
      phone: optionalText(form, 'phone'),
      notes: optionalText(form, 'notes'),
      in_night_seder: checkbox(form, 'in_night_seder'),
      in_daf: checkbox(form, 'in_daf'),
      start_date: optionalDate(form, 'start_date') ?? today(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  refreshEverything();
  redirect(`/more/people/${id}`);
}

/**
 * Inactive is a state, never a delete: history stays, and `end_date` closes
 * the membership window so past reports keep the same numbers.
 */
export async function setPersonActive(id: string, active: boolean) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update({ active, end_date: active ? null : today() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  refreshEverything();
}

export async function setTrackContact(id: string, track: boolean) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('people').update({ track_contact: track }).eq('id', id);
  if (error) throw new Error(error.message);
  refreshEverything();
}

export async function snoozePerson(id: string, until: string | null) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('people').update({ snoozed_until: until }).eq('id', id);
  if (error) throw new Error(error.message);
  refreshEverything();
}

/** Only ever allowed when there is nothing to lose. */
export async function deletePerson(id: string) {
  const supabase = await supabaseServer();

  const [night, daf, contact] = await Promise.all([
    supabase.from('night_attendance').select('id').eq('person_id', id).limit(1),
    supabase.from('daf_attendance').select('id').eq('person_id', id).limit(1),
    supabase.from('correspondence').select('id').eq('person_id', id).limit(1),
  ]);
  const hasHistory =
    (night.data?.length ?? 0) > 0 ||
    (daf.data?.length ?? 0) > 0 ||
    (contact.data?.length ?? 0) > 0;
  if (hasHistory) {
    throw new Error('This person has history. Make them inactive instead of deleting them.');
  }

  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw new Error(error.message);

  refreshEverything();
  redirect('/more/people');
}

/** Used by the Daf screen's "Add someone to the Daf". */
export async function addExistingPersonToDaf(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('people').update({ in_daf: true }).eq('id', id);
  if (error) throw new Error(error.message);
  refreshEverything();
}

export async function createPersonForDaf(form: FormData) {
  const supabase = await supabaseServer();
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const { error } = await supabase.from('people').insert({
    name,
    role: role(form),
    in_daf: true,
    in_night_seder: checkbox(form, 'in_night_seder'),
    start_date: today(),
  });
  if (error) throw new Error(error.message);
  refreshEverything();
}
