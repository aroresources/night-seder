'use server';

import { revalidatePath } from 'next/cache';

import { supabaseServer } from '@/lib/supabase/server';
import { BUCKET, checkUpload, FILE_TYPES, IMAGE_TYPES } from '@/lib/uploads';

function refresh() {
  revalidatePath('/', 'layout');
}

/**
 * A fresh name every time, under the person's own folder.
 *
 * Never the uploaded filename: two men with "resume.pdf" would collide, and a
 * name off a phone can carry anything at all in it.
 */
function objectPath(personId: string, folder: string, extension: string): string {
  return `${personId}/${folder}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadPersonPhoto(personId: string, form: FormData) {
  const file = form.get('file');
  const checked = checkUpload(file instanceof File ? file : null, IMAGE_TYPES, 'photo');
  const supabase = await supabaseServer();

  const { data: person, error: readError } = await supabase
    .from('people')
    .select('photo_path')
    .eq('id', personId)
    .single();
  if (readError) throw new Error(readError.message);

  const path = objectPath(personId, 'photo', checked.extension);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file as File, { contentType: checked.type, upsert: false });
  if (error) throw new Error(error.message);

  const { error: saveError } = await supabase
    .from('people')
    .update({ photo_path: path })
    .eq('id', personId);
  if (saveError) {
    // The row is the record of truth; an object nothing points at is litter.
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(saveError.message);
  }

  // Only once the new one is safely pointed at.
  if (person.photo_path) await supabase.storage.from(BUCKET).remove([person.photo_path]);

  refresh();
}

export async function removePersonPhoto(personId: string) {
  const supabase = await supabaseServer();

  const { data: person, error: readError } = await supabase
    .from('people')
    .select('photo_path')
    .eq('id', personId)
    .single();
  if (readError) throw new Error(readError.message);
  if (!person.photo_path) return;

  const { error } = await supabase.from('people').update({ photo_path: null }).eq('id', personId);
  if (error) throw new Error(error.message);

  await supabase.storage.from(BUCKET).remove([person.photo_path]);
  refresh();
}

export async function uploadPersonFile(personId: string, form: FormData) {
  const picked = form.get('file');
  const file = picked instanceof File ? picked : null;
  const checked = checkUpload(file, FILE_TYPES, 'file');
  const supabase = await supabaseServer();

  const path = objectPath(personId, 'files', checked.extension);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file as File, { contentType: checked.type, upsert: false });
  if (error) throw new Error(error.message);

  const { error: saveError } = await supabase.from('person_files').insert({
    person_id: personId,
    path,
    name: file!.name || `resume.${checked.extension}`,
    content_type: checked.type,
    size_bytes: file!.size,
  });
  if (saveError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw new Error(saveError.message);
  }

  refresh();
}

export async function deletePersonFile(id: string) {
  const supabase = await supabaseServer();

  const { data: row, error: readError } = await supabase
    .from('person_files')
    .select('path')
    .eq('id', id)
    .single();
  if (readError) throw new Error(readError.message);

  const { error } = await supabase.from('person_files').delete().eq('id', id);
  if (error) throw new Error(error.message);

  await supabase.storage.from(BUCKET).remove([row.path]);
  refresh();
}
