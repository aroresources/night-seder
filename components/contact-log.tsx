'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteContactEntry } from '@/app/actions/contact';
import { formatShortDate } from '@/lib/dates';
import { channelLabel, type Correspondence } from '@/lib/types';

import { ContactForm } from './contact-form';
import { Button } from './ui';
import { useToast } from './toast';

/**
 * A person's correspondence, newest first, with the same Log contact form
 * inline. Used both on the Contact screen and on the person's page.
 */
export function ContactLog({
  personId,
  entries,
}: {
  personId: string;
  entries: Correspondence[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const lastChannel = entries[0]?.channel;

  function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteContactEntry(id);
        router.refresh();
      } catch {
        toast("Couldn't delete that entry.");
      }
    });
  }

  return (
    <section className="px-4">
      <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">Contact log</h2>

      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
        {adding ? (
          <ContactForm
            personId={personId}
            defaultChannel={lastChannel}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-accent active:bg-surface-pressed"
          >
            Log contact
          </button>
        )}

        {entries.map((entry) =>
          editing === entry.id ? (
            <ContactForm key={entry.id} personId={personId} entry={entry} onDone={() => setEditing(null)} />
          ) : (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[15px]">
                  {formatShortDate(entry.date)}
                  <span className="text-ink-secondary"> · {channelLabel(entry.channel)}</span>
                </p>
                <div className="flex shrink-0 gap-3 text-[15px]">
                  <button type="button" onClick={() => setEditing(entry.id)} className="text-accent">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(entry.id)}
                    disabled={pending}
                    className="text-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {entry.note ? <p className="mt-1 text-[15px] text-ink-secondary">{entry.note}</p> : null}
              {entry.follow_up_date ? (
                <p className="mt-1 text-[13px] text-ink-secondary">
                  Follow up on {formatShortDate(entry.follow_up_date)}
                </p>
              ) : null}
            </div>
          ),
        )}

        {entries.length === 0 && !adding ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">Nothing logged yet.</p>
        ) : null}
      </div>
    </section>
  );
}

/** Snooze / unsnooze, shared by the Contact rows and the person page. */
export function SnoozeButtons({
  personId,
  snoozedUntil,
  onSnooze,
}: {
  personId: string;
  snoozedUntil: string | null;
  onSnooze: (personId: string, days: number) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(days: number) {
    startTransition(async () => {
      try {
        await onSnooze(personId, days);
        router.refresh();
      } catch {
        toast("Couldn't save. Check your connection.");
      }
    });
  }

  if (snoozedUntil) {
    return (
      <Button onClick={() => run(0)} disabled={pending} className="px-0">
        Unsnooze
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {[7, 14, 30].map((days) => (
        <Button key={days} onClick={() => run(days)} disabled={pending} className="px-2">
          Snooze {days}d
        </Button>
      ))}
    </div>
  );
}
