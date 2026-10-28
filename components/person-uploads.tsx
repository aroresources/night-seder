'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import {
  deletePersonFile,
  removePersonPhoto,
  uploadPersonFile,
  uploadPersonPhoto,
} from '@/app/actions/files';
import { formatShortDate } from '@/lib/dates';
import { formatBytes } from '@/lib/uploads';

import { PhotoCrop } from './photo-crop';
import { useToast } from './toast';

/**
 * Picking a file submits it: a separate "Upload" button is one more tap for
 * nothing, and on a phone the file picker already is the confirmation.
 */
function useUpload(send: (form: FormData) => Promise<void>) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    startTransition(async () => {
      try {
        await send(form);
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Couldn't upload that.");
      } finally {
        // So picking the same file again still fires a change event.
        if (input.current) input.current.value = '';
      }
    });
  }

  return { pending, input, onPick };
}

export function PersonPhoto({
  personId,
  url,
  name,
}: {
  personId: string;
  /** A signed link that expires, or null when he has no photo. */
  url: string | null;
  name: string;
}) {
  const [picked, setPicked] = useState<File | null>(null);
  const [full, setFull] = useState(false);
  const [pending, startTransition] = useTransition();
  const [removing, startRemoving] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();

  function upload(file: File) {
    const form = new FormData();
    form.set('file', file);
    startTransition(async () => {
      try {
        await uploadPersonPhoto(personId, form);
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Couldn't upload that.");
      } finally {
        setPicked(null);
      }
    });
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      {picked ? (
        <PhotoCrop file={picked} onDone={upload} onCancel={() => setPicked(null)} />
      ) : null}

      {full && url ? (
        // Tapping anywhere closes it: there is nothing else to do in here.
        <button
          type="button"
          onClick={() => setFull(false)}
          aria-label="Close the photo"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
        >
          <Image
            src={url}
            alt={name}
            width={800}
            height={800}
            unoptimized
            className="max-h-full w-auto max-w-full rounded-xl object-contain"
          />
        </button>
      ) : null}

      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-canvas">
        {url ? (
          <button
            type="button"
            onClick={() => setFull(true)}
            aria-label={`See ${name} larger`}
            className="block h-20 w-20"
          >
            <Image
              src={url}
              alt={name}
              width={160}
              height={160}
              unoptimized
              className="h-20 w-20 object-cover"
            />
          </button>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center text-[13px] text-ink-tertiary">
            No photo
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <label className="min-h-[2.75rem] cursor-pointer text-[15px] leading-[2.75rem] text-accent">
          {pending ? 'Uploading…' : url ? 'Replace photo' : 'Add a photo'}
          <input
            ref={input}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Cleared straight away so picking the same photo again still fires.
              event.target.value = '';
              if (file) setPicked(file);
            }}
            disabled={pending}
            className="sr-only"
          />
        </label>

        {url ? (
          <button
            type="button"
            disabled={removing}
            onClick={() =>
              startRemoving(async () => {
                try {
                  await removePersonPhoto(personId);
                  router.refresh();
                } catch (error) {
                  toast(error instanceof Error ? error.message : "Couldn't remove that.");
                }
              })
            }
            className="text-[13px] text-danger"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface PersonFileRow {
  id: string;
  name: string;
  created_at: string;
  size_bytes: number | null;
  /** A signed link that expires, or null if it could not be made. */
  url: string | null;
}

export function PersonFiles({ personId, files }: { personId: string; files: PersonFileRow[] }) {
  const { pending, input, onPick } = useUpload((form) => uploadPersonFile(personId, form));
  const [busy, setBusy] = useState<string | null>(null);
  const [, startDeleting] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-2 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            {file.url ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-[15px] text-accent"
              >
                {file.name}
              </a>
            ) : (
              <span className="block truncate text-[15px] text-ink-secondary">{file.name}</span>
            )}
            <span className="text-[13px] text-ink-tertiary">
              {formatShortDate(file.created_at.slice(0, 10))}
              {file.size_bytes ? ` · ${formatBytes(file.size_bytes)}` : ''}
            </span>
          </div>
          <button
            type="button"
            disabled={busy === file.id}
            onClick={() => {
              setBusy(file.id);
              startDeleting(async () => {
                try {
                  await deletePersonFile(file.id);
                  router.refresh();
                } catch (error) {
                  toast(error instanceof Error ? error.message : "Couldn't delete that.");
                } finally {
                  setBusy(null);
                }
              });
            }}
            className="shrink-0 px-2 py-1 text-[13px] text-danger"
          >
            Delete
          </button>
        </div>
      ))}

      <div className="px-4">
        {/* The label is the control: a button inside one would swallow the
            click that opens the picker. */}
        <label className="block min-h-[2.75rem] cursor-pointer text-[15px] leading-[2.75rem] text-accent">
          {pending ? 'Uploading…' : 'Add a file'}
          <input
            ref={input}
            type="file"
            accept="application/pdf,image/*"
            onChange={onPick}
            disabled={pending}
            className="sr-only"
          />
        </label>
      </div>
    </>
  );
}
