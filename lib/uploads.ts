/**
 * What may be uploaded against a person.
 *
 * A shidduch resume is a PDF or a photo, and nothing else has any business
 * being in the bucket. The check is on the declared type *and* the extension,
 * because a browser will happily report an empty type for a file it doesn't
 * recognise and the extension is what everything downstream reads.
 */

/**
 * The private bucket. Nothing in it is served without a signed link, so it
 * cannot be a constant in the server action file — a "use server" module may
 * only export async functions.
 */
export const BUCKET = 'person-files';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Images only, for the photo on his page. */
export const IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

/** Images and PDFs, for a resume. */
export const FILE_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  'application/pdf': 'pdf',
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface CheckedUpload {
  extension: string;
  type: string;
}

/**
 * Throws with something a person can act on, rather than returning null and
 * leaving the caller to invent a message.
 */
export function checkUpload(
  file: File | null,
  allowed: Record<string, string>,
  what: string,
): CheckedUpload {
  if (!file || file.size === 0) throw new Error(`Choose a ${what} first`);

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That ${what} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    );
  }

  const byType = allowed[file.type];
  if (byType) return { extension: byType, type: file.type };

  // An unknown type is not a refusal on its own: some phones send nothing.
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const match = Object.entries(allowed).find(([, ext]) => ext === extension);
  if (match) return { extension: match[1], type: match[0] };

  const list = [...new Set(Object.values(allowed))].join(', ');
  throw new Error(`That is not a ${what} this can take. Allowed: ${list}.`);
}
