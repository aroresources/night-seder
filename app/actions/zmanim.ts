'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { supabaseServer } from '@/lib/supabase/server';

import { date, optionalText, text } from './form';

function refresh() {
  revalidatePath('/', 'layout');
}

function offWeekdays(form: FormData): number[] {
  return form
    .getAll('off_weekdays')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6)
    .sort((a, b) => a - b);
}

function readZman(form: FormData) {
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');
  const start_date = date(form, 'start_date');
  const end_date = date(form, 'end_date');
  if (end_date < start_date) throw new Error('The end date comes before the start date');
  return { name, start_date, end_date, off_weekdays: offWeekdays(form) };
}

export async function createZman(form: FormData) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from('zmanim').insert(readZman(form)).select('id').single();
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/more/zmanim/${data.id}`);
}

export async function updateZman(id: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('zmanim').update(readZman(form)).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
  redirect(`/more/zmanim/${id}`);
}

export async function deleteZman(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('zmanim').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
  redirect('/more/zmanim');
}

/** Adding a day off changes the schedule. It never touches attendance rows. */
export async function addZmanDayOff(zmanId: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('zman_days_off').insert({
    zman_id: zmanId,
    date: date(form, 'date'),
    reason: optionalText(form, 'reason'),
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function removeZmanDayOff(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('zman_days_off').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

// Pairings ---------------------------------------------------------------

export async function createPair(zmanId: string, form: FormData) {
  const personIds = form.getAll('person_ids').map(String).filter(Boolean);
  if (personIds.length < 2) throw new Error('Pick at least two people');

  const supabase = await supabaseServer();

  const { data: existing, error: countError } = await supabase
    .from('pairs')
    .select('sort_order')
    .eq('zman_id', zmanId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (countError) throw new Error(countError.message);

  const { data: pair, error } = await supabase
    .from('pairs')
    .insert({
      zman_id: zmanId,
      label: optionalText(form, 'label'),
      sort_order: (existing?.[0]?.sort_order ?? -1) + 1,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const { error: memberError } = await supabase
    .from('pair_members')
    .insert(personIds.map((person_id) => ({ pair_id: pair.id, person_id })));
  if (memberError) throw new Error(memberError.message);

  refresh();
}

export async function deletePair(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('pairs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/** Add someone to a pair that already exists — a third man, or a replacement. */
export async function addPairMember(pairId: string, personId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('pair_members')
    .insert({ pair_id: pairId, person_id: personId });
  // 23505 is the unique violation: he is already in this pair, which is the
  // state we were asking for.
  if (error && error.code !== '23505') throw new Error(error.message);
  refresh();
}

/**
 * Rename a pair. An empty box clears the label, which puts it back to being
 * the members' names joined with "&" — so it follows the members again.
 */
export async function renamePair(pairId: string, form: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('pairs')
    .update({ label: optionalText(form, 'label') })
    .eq('id', pairId);
  if (error) throw new Error(error.message);
  refresh();
}

export async function removePairMember(pairId: string, personId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('pair_members')
    .delete()
    .eq('pair_id', pairId)
    .eq('person_id', personId);
  if (error) throw new Error(error.message);
  refresh();
}

/** Swap this pair's sort_order with its neighbour in the given direction. */
export async function movePair(zmanId: string, pairId: string, direction: 'up' | 'down') {
  const supabase = await supabaseServer();
  const { data: pairs, error } = await supabase
    .from('pairs')
    .select('id, sort_order')
    .eq('zman_id', zmanId)
    .order('sort_order');
  if (error) throw new Error(error.message);

  const index = pairs.findIndex((p) => p.id === pairId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || swapWith < 0 || swapWith >= pairs.length) return;

  // Rewrite the whole list as 0..n-1 with the two entries exchanged, so a
  // history of equal sort_orders can't leave the order ambiguous.
  const reordered = [...pairs];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];

  for (const [position, pair] of reordered.entries()) {
    const { error: updateError } = await supabase
      .from('pairs')
      .update({ sort_order: position })
      .eq('id', pair.id);
    if (updateError) throw new Error(updateError.message);
  }

  refresh();
}

/** Copy another zman's pairs, skipping anyone who is no longer active. */
export async function copyPairings(targetZmanId: string, form: FormData) {
  const sourceZmanId = text(form, 'source_zman_id');
  if (!sourceZmanId) throw new Error('Pick a zman to copy from');

  const supabase = await supabaseServer();

  const { data: sourcePairs, error: pairError } = await supabase
    .from('pairs')
    .select('id, label, sort_order')
    .eq('zman_id', sourceZmanId)
    .order('sort_order');
  if (pairError) throw new Error(pairError.message);
  if (sourcePairs.length === 0) return;

  const { data: members, error: memberError } = await supabase
    .from('pair_members')
    .select('pair_id, person_id')
    .in(
      'pair_id',
      sourcePairs.map((p) => p.id),
    );
  if (memberError) throw new Error(memberError.message);

  const { data: active, error: peopleError } = await supabase
    .from('people')
    .select('id')
    .eq('active', true)
    .eq('in_night_seder', true);
  if (peopleError) throw new Error(peopleError.message);
  const activeIds = new Set(active.map((p) => p.id));

  const { data: existing, error: existingError } = await supabase
    .from('pairs')
    .select('sort_order')
    .eq('zman_id', targetZmanId)
    .order('sort_order', { ascending: false })
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  for (const source of sourcePairs) {
    const people = members
      .filter((m) => m.pair_id === source.id)
      .map((m) => m.person_id)
      .filter((id) => activeIds.has(id));
    // A pair of one is not a pair; if only one member is still active, skip it.
    if (people.length < 2) continue;

    const { data: created, error } = await supabase
      .from('pairs')
      .insert({ zman_id: targetZmanId, label: source.label, sort_order: nextOrder })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    nextOrder += 1;

    const { error: insertError } = await supabase
      .from('pair_members')
      .insert(people.map((person_id) => ({ pair_id: created.id, person_id })));
    if (insertError) throw new Error(insertError.message);
  }

  refresh();
}
