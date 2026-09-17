'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { logContact, updateContactEntry } from '@/app/actions/contact';
import { today } from '@/lib/dates';
import { CHANNELS, type Channel, type Correspondence } from '@/lib/types';

import { Button, inputClasses } from './ui';
import { useToast } from './toast';

const SNOOZE_CHOICES = [7, 14, 30];

/**
 * The Log contact sheet. A date and a channel are enough to save; everything
 * else is optional. The date is editable so a call from last Tuesday can be
 * written down today.
 */
export function ContactForm({
  personId,
  entry,
  defaultChannel,
  onDone,
}: {
  personId: string;
  /** Present when editing an existing entry. */
  entry?: Correspondence;
  /** Preselected for a new entry: whatever was used last time. */
  defaultChannel?: Channel;
  onDone?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [date, setDate] = useState(entry?.date ?? today());
  const [channel, setChannel] = useState<Channel>(entry?.channel ?? defaultChannel ?? 'call');
  const [note, setNote] = useState(entry?.note ?? '');
  const [followUp, setFollowUp] = useState(entry?.follow_up_date ?? '');
  const [snoozeDays, setSnoozeDays] = useState(0);
  const [customSnooze, setCustomSnooze] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const form = new FormData();
    form.set('date', date);
    form.set('channel', channel);
    form.set('note', note);
    form.set('follow_up_date', followUp);
    if (!entry) form.set('snooze_days', String(snoozeDays));

    startTransition(async () => {
      try {
        if (entry) await updateContactEntry(entry.id, form);
        else await logContact(personId, form);
        setNote('');
        setFollowUp('');
        setSnoozeDays(0);
        setCustomSnooze('');
        router.refresh();
        onDone?.();
      } catch {
        toast("Couldn't save. Check your connection.");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 px-4 py-4">
      <label className="block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Date</span>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
          className={inputClasses}
        />
      </label>

      <div>
        <span className="mb-1 block text-[13px] text-ink-secondary">How</span>
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setChannel(option.value)}
              aria-pressed={channel === option.value}
              className={`min-h-[2.75rem] rounded-xl px-3 text-[15px] ${
                channel === option.value
                  ? 'bg-accent text-on-accent'
                  : 'bg-canvas text-ink-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Note (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className={inputClasses}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Follow up on (optional)</span>
        <input
          type="date"
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          className={inputClasses}
        />
      </label>

      {!entry ? (
        <div>
          <span className="mb-1 block text-[13px] text-ink-secondary">
            Snooze from Needs attention (optional)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {SNOOZE_CHOICES.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setSnoozeDays(snoozeDays === days ? 0 : days);
                  setCustomSnooze('');
                }}
                aria-pressed={snoozeDays === days}
                className={`min-h-[2.75rem] rounded-xl px-3 text-[15px] ${
                  snoozeDays === days ? 'bg-accent text-on-accent' : 'bg-canvas text-ink-secondary'
                }`}
              >
                {days} days
              </button>
            ))}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Days"
              value={customSnooze}
              onChange={(event) => {
                setCustomSnooze(event.target.value);
                setSnoozeDays(Number(event.target.value) || 0);
              }}
              className="w-24 rounded-lg border border-hairline bg-canvas px-3 py-2.5 text-[16px]"
            />
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="filled" disabled={pending}>
          {pending ? 'Saving' : entry ? 'Save changes' : 'Save'}
        </Button>
        {onDone ? (
          <Button type="button" onClick={onDone}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
