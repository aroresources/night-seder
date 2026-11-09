'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  acceptSignup,
  dismissSignup,
  subscribeSignup,
  unsubscribeSignup,
} from '@/app/actions/signups';
import { formatShortDate } from '@/lib/dates';

import { Group } from './ui';
import { useToast } from './toast';

export interface SignupRow {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  /** The man whose number this is, if we hold it. */
  match: { id: string; name: string; optedIn: boolean } | null;
  /** On the list as a bare number, with nobody's name against it. */
  subscribed: boolean;
  /** He texted STOP. Only he can undo that, by texting JOIN again. */
  optedOut: boolean;
}

/** Shared by both lists: run an action, refresh, and say so if it fails. */
function useAction() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (error) {
        toast(error instanceof Error ? error.message : "Couldn't save that.");
      }
    });
  }

  return { pending, run };
}

export function SignupList({
  rows,
  people,
}: {
  rows: SignupRow[];
  people: { id: string; name: string }[];
}) {
  return (
    <Group title="Waiting to be matched">
      {rows.map((row) => (
        <Signup key={row.id} row={row} people={people} />
      ))}
    </Group>
  );
}

/**
 * Numbers getting texts with no name against them.
 *
 * Kept visibly apart from the men. These are not half-people — they have no
 * programme and no attendance — and the only things you can do to one are
 * put a name to it or stop texting it.
 */
export function SubscribedList({
  rows,
  people,
}: {
  rows: SignupRow[];
  people: { id: string; name: string }[];
}) {
  return (
    <Group title="Numbers with no name">
      {rows.map((row) => (
        <Subscribed key={row.id} row={row} people={people} />
      ))}
    </Group>
  );
}

function Signup({ row, people }: { row: SignupRow; people: { id: string; name: string }[] }) {
  // The number usually names the man on its own; the picker is for when it
  // doesn't, which is a new number or one we never had.
  const [personId, setPersonId] = useState(row.match?.id ?? '');
  const { pending, run } = useAction();

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[17px]">{row.name}</span>
        <span className="shrink-0 text-[13px] text-ink-tertiary">
          {formatShortDate(row.createdAt.slice(0, 10))}
        </span>
      </div>

      <p className="mt-0.5 text-[15px] text-ink-secondary">{row.phone}</p>

      <p className="mt-1 text-[13px] text-ink-tertiary">
        {row.optedOut
          ? 'He texted STOP before. Only he can undo that, by texting JOIN again.'
          : row.match
            ? row.match.optedIn
              ? `That number is ${row.match.name}, already ticked for texts.`
              : `That number is ${row.match.name}.`
            : "That number isn't one we hold. Pick who he is, give the number the texts on its own, or dismiss it."}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={personId}
          onChange={(event) => setPersonId(event.target.value)}
          aria-label={`Who is ${row.name}?`}
          className="min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 text-[15px]"
        >
          <option value="">Pick a man…</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={pending || personId === ''}
          onClick={() => run(() => acceptSignup(row.id, personId))}
          className="min-h-[2.75rem] shrink-0 rounded-xl bg-accent px-3 text-[15px] text-on-accent disabled:opacity-40"
        >
          Tick for texts
        </button>

        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => dismissSignup(row.id))}
          className="min-h-[2.75rem] shrink-0 px-2 text-[15px] text-danger"
        >
          Dismiss
        </button>
      </div>

      {row.match === null && !row.optedOut ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => subscribeSignup(row.id))}
          className="mt-1 min-h-[2.75rem] text-[15px] text-accent disabled:opacity-40"
        >
          Just text the number — don&apos;t ask me who it is
        </button>
      ) : null}
    </div>
  );
}

function Subscribed({ row, people }: { row: SignupRow; people: { id: string; name: string }[] }) {
  const [personId, setPersonId] = useState('');
  const [naming, setNaming] = useState(false);
  const { pending, run } = useAction();

  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[17px]">{row.phone}</span>
        <span className="shrink-0 text-[13px] text-ink-tertiary">
          {formatShortDate(row.createdAt.slice(0, 10))}
        </span>
      </div>

      <p className="mt-1 text-[13px] text-ink-tertiary">
        Gets messages sent to Everyone. Not on any programme, so he is never counted absent.
      </p>

      {naming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={personId}
            onChange={(event) => setPersonId(event.target.value)}
            aria-label={`Who is ${row.phone}?`}
            className="min-h-[2.75rem] min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 text-[15px]"
          >
            <option value="">Pick a man…</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || personId === ''}
            onClick={() => run(() => acceptSignup(row.id, personId))}
            className="min-h-[2.75rem] shrink-0 rounded-xl bg-accent px-3 text-[15px] text-on-accent disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="min-h-[2.75rem] text-[15px] text-accent"
          >
            I know who this is
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unsubscribeSignup(row.id))}
            className="min-h-[2.75rem] text-[15px] text-danger disabled:opacity-40"
          >
            Stop texting it
          </button>
        </div>
      )}
    </div>
  );
}
