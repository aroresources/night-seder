'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { createPair } from '@/app/actions/zmanim';
import type { Role } from '@/lib/types';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

export interface PickablePerson {
  id: string;
  name: string;
  role: Role;
  /** Already in another pair this zman. Still pickable — see below. */
  paired: boolean;
}

/**
 * Make a pair by picking two or more people. The label defaults to their
 * names joined with "&", which is what you'd have written anyway.
 *
 * Everyone active is offered, including men already in a pair: a rabbi often
 * sits with two chavrusas, and attendance is per person anyway, so marking him
 * in one card marks him in both and he is still counted once.
 */
export function PairBuilder({
  zmanId,
  people,
}: {
  zmanId: string;
  people: PickablePerson[];
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [search, setSearch] = useState('');
  const [showPaired, setShowPaired] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function toggle(id: string) {
    setPicked((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  const needle = search.trim().toLowerCase();
  // Anyone already ticked stays visible whatever the search and the toggle say,
  // so a pick can't quietly vanish while you look for the second man.
  const visible = people.filter(
    (person) =>
      picked.includes(person.id) ||
      ((showPaired || !person.paired) && person.name.toLowerCase().includes(needle)),
  );
  const hiddenPaired = people.filter((person) => person.paired && !picked.includes(person.id)).length;

  if (!open) {
    return (
      <div className="px-4 pt-3">
        <Button className="px-0" onClick={() => setOpen(true)}>
          Add a pair
        </Button>
      </div>
    );
  }

  const defaultLabel = picked
    .map((id) => people.find((person) => person.id === id)?.name ?? '')
    .filter(Boolean)
    .join(' & ');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData();
        for (const id of picked) form.append('person_ids', id);
        form.set('label', label.trim());
        startTransition(async () => {
          try {
            await createPair(zmanId, form);
            setPicked([]);
            setLabel('');
            setOpen(false);
            router.refresh();
          } catch {
            toast("Couldn't save the pair.");
          }
        });
      }}
      className="mx-4 mt-3 rounded-xl bg-surface p-4"
    >
      <p className="mb-2 text-[13px] text-ink-secondary">
        Pick two or more people{picked.length > 0 ? ` · ${picked.length} picked` : ''}
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search names"
        aria-label="Search names"
        className={`${inputClasses} mb-2`}
      />

      {hiddenPaired > 0 || showPaired ? (
        <label className="mb-2 flex min-h-[2.75rem] items-center gap-3">
          <input
            type="checkbox"
            checked={showPaired}
            onChange={(event) => setShowPaired(event.target.checked)}
            className="h-5 w-5 accent-[var(--accent)]"
          />
          <span className="text-[15px] text-ink-secondary">
            Include men already in a pair{showPaired ? '' : ` (${hiddenPaired})`}
          </span>
        </label>
      ) : null}

      <div className="mb-3 max-h-64 divide-y divide-hairline overflow-y-auto rounded-lg border border-hairline">
        {visible.length === 0 ? (
          <p className="px-3 py-2.5 text-[15px] text-ink-secondary">
            {people.length === 0
              ? 'Nobody active is in night seder yet.'
              : needle
                ? 'Nobody matches that name.'
                : 'Everybody is already paired. Tick the box above to pair someone twice.'}
          </p>
        ) : (
          visible.map((person) => (
            <label key={person.id} className="flex min-h-[2.75rem] items-center gap-3 px-3 py-2">
              <input
                type="checkbox"
                checked={picked.includes(person.id)}
                onChange={() => toggle(person.id)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="flex-1 text-[17px]">{person.name}</span>
              {person.paired ? (
                <span className="text-[13px] text-ink-tertiary">already paired</span>
              ) : null}
              <span className="text-[13px] text-ink-tertiary">
                {person.role === 'rabbi' ? 'R' : 'W'}
              </span>
            </label>
          ))
        )}
      </div>

      <label className="mb-3 block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Label (optional)</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={defaultLabel || 'Their names'}
          className={inputClasses}
        />
      </label>

      <div className="flex gap-2">
        <Button type="submit" variant="filled" disabled={picked.length < 2 || pending}>
          {pending ? 'Saving' : 'Add pair'}
        </Button>
        <Button type="button" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
