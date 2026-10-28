import test from 'node:test';
import assert from 'node:assert/strict';

import { checkUpload, formatBytes, FILE_TYPES, IMAGE_TYPES, MAX_UPLOAD_BYTES } from './uploads.ts';

function file(name: string, type: string, size = 1000): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

test('a PDF resume is accepted and keeps its extension', () => {
  assert.deepEqual(checkUpload(file('resume.pdf', 'application/pdf'), FILE_TYPES, 'file'), {
    extension: 'pdf',
    type: 'application/pdf',
  });
});

test('a file with no type is read from its extension instead', () => {
  // Some phones send an empty type for a file they don't recognise.
  assert.deepEqual(checkUpload(file('resume.PDF', ''), FILE_TYPES, 'file'), {
    extension: 'pdf',
    type: 'application/pdf',
  });
});

test('a PDF is not a photo', () => {
  assert.throws(
    () => checkUpload(file('resume.pdf', 'application/pdf'), IMAGE_TYPES, 'photo'),
    /not a photo this can take/,
  );
});

test('anything else is refused by type and by extension alike', () => {
  assert.throws(() => checkUpload(file('x.docx', 'application/msword'), FILE_TYPES, 'file'), /Allowed/);
  assert.throws(() => checkUpload(file('x.exe', ''), FILE_TYPES, 'file'), /Allowed/);
});

test('an oversized file says how big it is and what the limit is', () => {
  assert.throws(
    () => checkUpload(file('big.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1), FILE_TYPES, 'file'),
    /10\.0 MB/,
  );
});

test('nothing chosen, or an empty file, is not an upload', () => {
  assert.throws(() => checkUpload(null, FILE_TYPES, 'file'), /Choose a file first/);
  assert.throws(() => checkUpload(file('empty.pdf', 'application/pdf', 0), FILE_TYPES, 'file'), /Choose a file first/);
});

test('sizes read the way a person would say them', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
});
