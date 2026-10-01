'use server';

import { revalidatePath } from 'next/cache';

import { supabaseServer } from '@/lib/supabase/server';

import { text } from './form';

function refresh() {
  // Groups show up as filters on several screens.
  revalidatePath('/', 'layout');
}

export async function createGroup(form: FormData) {
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const supabase = await supabaseServer();
  const { error } = await supabase.from('groups').insert({ name });
  if (error) {
    // 23505 is the unique index on lower(name).
    if (error.code === '23505') throw new Error(`There is already a group called ${name}`);
    throw new Error(error.message);
  }
  refresh();
}

export async function renameGroup(id: string, form: FormData) {
  const name = text(form, 'name');
  if (!name) throw new Error('A name is required');

  const supabase = await supabaseServer();
  const { error } = await supabase.from('groups').update({ name }).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/**
 * Deleting a group removes the tag from everyone who had it. Nobody's
 * attendance, pairs or history are touched — a group is only a label.
 */
export async function deleteGroup(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/**
 * Replace a person's groups with exactly the ids given. Called after saving
 * the person form, so the checkboxes are the whole truth.
 */
export async function setPersonGroups(personId: string, groupIds: string[]) {
  const supabase = await supabaseServer();

  const { error: clearError } = await supabase
    .from('person_groups')
    .delete()
    .eq('person_id', personId);
  if (clearError) throw new Error(clearError.message);

  if (groupIds.length > 0) {
    const { error } = await supabase
      .from('person_groups')
      .insert(groupIds.map((group_id) => ({ person_id: personId, group_id })));
    if (error) throw new Error(error.message);
  }

  refresh();
}
