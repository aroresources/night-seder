'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { today } from '@/lib/dates';
import { parseDollars } from '@/lib/money';
import { parseFullName, type NameParts } from '@/lib/names';
import { supabaseServer } from '@/lib/supabase/server';
import { BUCKET } from '@/lib/uploads';
import { PAYMENT_METHODS, type MaritalStatus, type PaymentMethod, type Role } from '@/lib/types';

/** Which morning programme a person is being added to. */
type MorningFlag = 'in_daf' | 'in_shachris' | 'in_misc';

import { checkbox, optionalDate, optionalText, text } from './form';
import { setPersonGroups } from './groups';

function refreshEverything() {
  // A person shows up on every screen, so nothing here is worth narrowing.
  revalidatePath('/', 'layout');
}

function role(form: FormData): Role {
  return text(form, 'role') === 'rabbi' ? 'rabbi' : 'working';
}

/** An empty box means "no usual amount", not zero. */
function monthlyAmount(form: FormData): number | null {
  return parseDollars(text(form, 'monthly_amount'));
}

/** Blank means nobody has said how he is paid, which is not the same as cash. */
function usualPaymentMethod(form: FormData): PaymentMethod | null {
  const value = text(form, 'usual_payment_method');
  return PAYMENT_METHODS.find((m) => m.value === value)?.value ?? null;
}

/** Blank means nobody has said yet, which is not the same as single. */
function maritalStatus(form: FormData): MaritalStatus | null {
  const value = text(form, 'marital_status');
  return value === 'single' || value === 'married' || value === 'divorced' ? value : null;
}

/** The ticked group checkboxes. An empty list means "in no groups". */
function groupIds(form: FormData): string[] {
  return form.getAll('group_ids').map(String).filter(Boolean);
}

/**
 * The three name boxes. Only the first is required; the database joins them
 * into the display name, so nothing here writes `name` itself.
 */
function nameParts(form: FormData): NameParts {
  const last_name = text(form, 'last_name');
  if (!last_name) throw new Error('A last name is required');
  return {
    first_name: optionalText(form, 'first_name'),
    middle_name: optionalText(form, 'middle_name'),
    last_name,
  };
}

export async function createPerson(form: FormData) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from('people')
    .insert({
      ...nameParts(form),
      email: optionalText(form, 'email'),
      address: optionalText(form, 'address'),
      marital_status: maritalStatus(form),
      birthday: optionalDate(form, 'birthday'),
      job: optionalText(form, 'job'),
      rebbe: optionalText(form, 'rebbe'),
      looking_for: optionalText(form, 'looking_for'),
      role: role(form),
      phone: optionalText(form, 'phone'),
      notes: optionalText(form, 'notes'),
      in_night_seder: checkbox(form, 'in_night_seder'),
      in_daf: checkbox(form, 'in_daf'),
      in_shachris: checkbox(form, 'in_shachris'),
      in_misc: checkbox(form, 'in_misc'),
      start_date: optionalDate(form, 'start_date') ?? today(),
      gets_paid: checkbox(form, 'gets_paid'),
      monthly_amount_cents: monthlyAmount(form),
      usual_payment_method: usualPaymentMethod(form),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  await setPersonGroups(data.id, groupIds(form));

  refreshEverything();
  redirect(`/more/people/${data.id}`);
}

/**
 * Paste a list of names, one per line; role and the Daf flag apply to all.
 * Each line is split into first / middle / last, which is a guess — a two-word
 * surname lands in the middle — but every one is editable afterwards.
 */
export async function bulkAddPeople(form: FormData) {
  const parsed = text(form, 'names')
    .split('\n')
    .map(parseFullName)
    .filter((parts): parts is NameParts => parts !== null);
  if (parsed.length === 0) throw new Error('Paste at least one name');

  const supabase = await supabaseServer();
  const shared = {
    role: role(form),
    in_night_seder: checkbox(form, 'in_night_seder'),
    in_daf: checkbox(form, 'in_daf'),
    in_shachris: checkbox(form, 'in_shachris'),
    start_date: optionalDate(form, 'start_date') ?? today(),
  };

  const { error } = await supabase
    .from('people')
    .insert(parsed.map((parts) => ({ ...parts, ...shared })));
  if (error) throw new Error(error.message);

  refreshEverything();
  redirect('/more/people');
}

export async function updatePerson(id: string, form: FormData) {
  const supabase = await supabaseServer();

  const { error } = await supabase
    .from('people')
    .update({
      ...nameParts(form),
      email: optionalText(form, 'email'),
      address: optionalText(form, 'address'),
      marital_status: maritalStatus(form),
      birthday: optionalDate(form, 'birthday'),
      job: optionalText(form, 'job'),
      rebbe: optionalText(form, 'rebbe'),
      looking_for: optionalText(form, 'looking_for'),
      role: role(form),
      phone: optionalText(form, 'phone'),
      notes: optionalText(form, 'notes'),
      in_night_seder: checkbox(form, 'in_night_seder'),
      in_daf: checkbox(form, 'in_daf'),
      in_shachris: checkbox(form, 'in_shachris'),
      in_misc: checkbox(form, 'in_misc'),
      start_date: optionalDate(form, 'start_date') ?? today(),
      gets_paid: checkbox(form, 'gets_paid'),
      monthly_amount_cents: monthlyAmount(form),
      usual_payment_method: usualPaymentMethod(form),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  await setPersonGroups(id, groupIds(form));

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

  // His photo and files go with him. The rows cascade on their own, but the
  // objects would be left behind in the bucket with nothing pointing at them.
  const { data: files } = await supabase.from('person_files').select('path').eq('person_id', id);
  const { data: person } = await supabase
    .from('people')
    .select('photo_path')
    .eq('id', id)
    .single();
  const objects = [...(files ?? []).map((file) => file.path), person?.photo_path].filter(
    (path): path is string => typeof path === 'string',
  );

  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (objects.length > 0) await supabase.storage.from(BUCKET).remove(objects);

  refreshEverything();
  redirect('/more/people');
}

/** Used by the Morning screen's "Add someone to Daf / Shachris". */
export async function addPersonToMorning(flag: MorningFlag, id: string) {
  const supabase = await supabaseServer();
  // Spelled out rather than a computed key: the Insert type rejects those.
  const patch =
    flag === 'in_daf' ? { in_daf: true } : flag === 'in_shachris' ? { in_shachris: true } : { in_misc: true };
  const { error } = await supabase.from('people').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  refreshEverything();
}

/** The Morning quick add takes one box, so the line gets split like a paste. */
export async function createPersonForMorning(flag: MorningFlag, form: FormData) {
  const supabase = await supabaseServer();
  const parts = parseFullName(text(form, 'name'));
  if (!parts) throw new Error('A name is required');

  const { error } = await supabase.from('people').insert({
    ...parts,
    role: role(form),
    ...(flag === 'in_daf'
      ? { in_daf: true }
      : flag === 'in_shachris'
        ? { in_shachris: true }
        : { in_misc: true }),
    in_night_seder: checkbox(form, 'in_night_seder'),
    start_date: today(),
  });
  if (error) throw new Error(error.message);
  refreshEverything();
}
