'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { addPairMember, renamePair } from '@/app/actions/zmanim';
import type { Role } from '@/lib/types';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

export interface PairCandidate {
  id: string;
  name: string;
  role: Role;
  /** Already in some pair this zman — still offered, just noted. */
  paired: boolean;
}

/**
 * Editing a pair in place: add another man to it, or rename it.
 *
 * Both are tucked behind a control rather than always on screen, because the
 * common case is reading the pairings, not changing them.
 */
export function PairEditor({
  pairId,
  label,
  hasOwnLabel,
  candidates,
}: {
  pairId: string;
  /** What the pair currently reads as, derived or not. */
  label: string;
  /** False when the label is just the members' names joined up. */
  hasOwnLabel: boolean;
  /** Everyone who could be added — current members already excluded. */
  candidates: PairCandidate[];
}) {
  const [open, setOpen] = useState<'closed' | 'add' | 'rename'>('closed');
  const [search, setSearch] = useState('');
  const [name, setName] = useState(hasOwnLabel ? label : '');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const needle = search.trim().toLowerCase();
  const visible = candidates.filter((person) => person.name.toLowerCase().includes(needle));

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        setOpen('closed');
        setSearch('');
        router.refresh();
      } catch {
        toast("Couldn't save. Check your connection.");
      }
    });
  }

  if (open === 'closed') {
    return (
      <div className="mt-1 flex gap-4">
        <button type="button" onClick={() => setOpen('add')} className="text-[13px] text-accent">
          Add someone
        </button>
        <button type="button" onClick={() => setOpen('rename')} className="text-[13px] text-accent">
          Rename
        </button>
      </div>
    );
  }

  if (open === 'rename') {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData();
          form.set('label', name);
          run(() => renamePair(pairId, form));
        }}
        className="mt-2 flex flex-col gap-2"
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={label}
          aria-label="Pair name"
          className={inputClasses}
        />
        <p className="text-[13px] text-ink-tertiary">
          Leave it empty to go back to the members&apos; names.
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="filled" disabled={pending}>
            {pending ? 'Saving' : 'Save name'}
          </Button>
          <Button type="button" onClick={() => setOpen('closed')}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <input
        autoFocus
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search names"
        aria-label="Search names to add"
        className={inputClasses}
      />

      <div className="max-h-56 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline">
        {visible.length === 0 ? (
          <p className="px-3 py-2.5 text-[15px] text-ink-secondary">
            {candidates.length === 0 ? 'Everyone is already in this pair.' : 'Nobody matches.'}
          </p>
        ) : (
          visible.map((person) => (
            <button
              key={person.id}
              type="button"
              disabled={pending}
              onClick={() => run(() => addPairMember(pairId, person.id))}
              className="flex min-h-[2.75rem] w-full items-center gap-2 px-3 py-2 text-left active:bg-surface-pressed disabled:opacity-40"
            >
              <span className="min-w-0 flex-1 truncate text-[15px]">{person.name}</span>
              {person.paired ? (
                <span className="shrink-0 text-[13px] text-ink-tertiary">already paired</span>
              ) : null}
              <span className="shrink-0 text-[13px] text-ink-tertiary">
                {person.role === 'rabbi' ? 'R' : 'W'}
              </span>
            </button>
          ))
        )}
      </div>

      <div>
        <Button type="button" onClick={() => setOpen('closed')}>
          Done
        </Button>
      </div>
    </div>
  );
}
