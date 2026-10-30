'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { snoozeForDays } from '@/app/actions/contact';
import { setTrackContact } from '@/app/actions/people';
import { byLeastRecentlyContacted, type Reason } from '@/lib/contact';
import { formatShortDate } from '@/lib/dates';
import { channelLabel, type Channel, type Group, type Role } from '@/lib/types';

import { ContactForm } from './contact-form';
import { Chip } from './ui';
import { useToast } from './toast';

export interface ContactRow {
  id: string;
  name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  active: boolean;
  trackContact: boolean;
  inNightSeder: boolean;
  inDaf: boolean;
  inShachris: boolean;
  inMisc: boolean;
  /** "Was at Night seder Oct 27" — the programmes he has not dropped. */
  stillAttending: string | null;
  snoozedUntil: string | null;
  lastContact: { date: string; channel: Channel; note: string | null } | null;
  reasons: Reason[];
  /** The last time he turned up to anything he is in. */
  lastAttended: string | null;
  /** The longest he has gone without turning up to something he is in. */
  worstStreak: number;
  /** Spoken to since the last time he came. */
  chased: boolean;
  group: 'needs_attention' | 'everyone_else' | 'snoozed';
  /** The ids of the topic groups he is tagged with. */
  groupIds: string[];
}

type Filter =
  | 'all'
  | 'night'
  | 'daf'
  | 'shachris'
  | 'misc'
  | 'none'
  | 'unchased'
  | 'rabbi'
  | 'working'
  | 'hidden';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'night', label: 'Night seder' },
  { value: 'daf', label: 'Daf' },
  { value: 'shachris', label: 'Shachris' },
  { value: 'misc', label: 'Misc' },
  { value: 'none', label: 'Not in any' },
  { value: 'unchased', label: 'Not chased' },
  { value: 'rabbi', label: 'Rabbis' },
  { value: 'working', label: 'Working' },
  { value: 'hidden', label: 'Hidden' },
];

/** One place to say what each chip means, so the list and the counts agree. */
function matchesFilter(row: ContactRow, filter: Filter): boolean {
  switch (filter) {
    case 'night':
      return row.inNightSeder;
    case 'daf':
      return row.inDaf;
    case 'shachris':
      return row.inShachris;
    case 'misc':
      return row.inMisc;
    // Whatever the last conversation was about, it was not about this stretch
    // of missing: it happened before he was last seen.
    case 'unchased':
      return !row.chased;
    // The men nobody takes attendance for. They can never be flagged for a
    // missed session, so this is the list you work through by last contact.
    case 'none':
      return !row.inNightSeder && !row.inDaf && !row.inShachris && !row.inMisc;
    case 'rabbi':
      return row.role === 'rabbi';
    case 'working':
      return row.role === 'working';
    default:
      return true;
  }
}

type Sort = 'name' | 'contact' | 'missed';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'contact', label: 'Last contact' },
  { value: 'missed', label: 'Missed' },
];

/**
 * The rows come in surname order. Sorting is picked rather than imposed, and
 * never by last contact unless asked for: a list that reshuffles because you
 * logged a call loses your place in it.
 */
function sortRows(rows: ContactRow[], sort: Sort): ContactRow[] {
  if (sort === 'name') return rows;
  if (sort === 'missed') {
    return [...rows].sort((a, b) => b.worstStreak - a.worstStreak || a.name.localeCompare(b.name));
  }
  return [...rows].sort((a, b) =>
    byLeastRecentlyContacted(
      { lastContact: a.lastContact?.date ?? null, name: a.name },
      { lastContact: b.lastContact?.date ?? null, name: b.name },
    ),
  );
}

export function ContactList({ rows, groups }: { rows: ContactRow[]; groups: Group[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [topic, setTopic] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showSnoozed, setShowSnoozed] = useState(false);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'hidden' ? row.trackContact : !row.trackContact) return false;
      if (!matchesFilter(row, filter)) return false;
      if (topic && !row.groupIds.includes(topic)) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, filter, topic, search]);

  const needsAttention = sortRows(
    visible.filter((row) => row.group === 'needs_attention'),
    sort,
  );
  const everyoneElse = sortRows(
    visible.filter((row) => row.group === 'everyone_else'),
    sort,
  );
  const snoozed = sortRows(
    visible.filter((row) => row.group === 'snoozed'),
    sort,
  );

  return (
    <div>
      <div className="px-4 pt-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              aria-pressed={filter === option.value}
              className={`min-h-[2.25rem] shrink-0 rounded-full px-3 text-[15px] ${
                filter === option.value
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface text-ink-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {groups.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTopic(topic === option.id ? null : option.id)}
                aria-pressed={topic === option.id}
                className={`min-h-[2.25rem] shrink-0 rounded-full px-3 text-[15px] ${
                  topic === option.id
                    ? 'bg-accent text-on-accent'
                    : 'bg-surface text-ink-secondary'
                }`}
              >
                {option.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 overflow-x-auto pb-2">
          <span className="shrink-0 self-center pr-1 text-[13px] text-ink-tertiary">Sort by</span>
          {SORTS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              aria-pressed={sort === option.value}
              className={`min-h-[2.25rem] shrink-0 rounded-full px-3 text-[15px] ${
                sort === option.value
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface text-ink-secondary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filter === 'unchased' ? (
          <p className="pb-2 text-[13px] text-ink-tertiary">
            Men you haven&apos;t spoken to since the last time they came.
          </p>
        ) : null}

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search names"
          aria-label="Search names"
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[16px]"
        />
      </div>

      {filter === 'hidden' ? (
        <Section title="Hidden from Contact" rows={visible} empty="Nobody is hidden." />
      ) : (
        <>
          <Section
            title="Needs attention"
            rows={needsAttention}
            empty="Nobody needs chasing right now."
          />
          <Section title="Everyone else" rows={everyoneElse} empty="Nobody here." />

          {snoozed.length > 0 ? (
            <section className="px-4">
              <button
                type="button"
                onClick={() => setShowSnoozed((open) => !open)}
                className="flex w-full items-center justify-between px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary"
              >
                <span>Snoozed ({snoozed.length})</span>
                <span aria-hidden>{showSnoozed ? '⌃' : '⌄'}</span>
              </button>
              {showSnoozed ? (
                <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
                  {snoozed.map((row) => (
                    <Row key={row.id} row={row} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: ContactRow[];
  empty: string;
}) {
  return (
    <section className="px-4">
      <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">{title}</h2>
      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">{empty}</p>
        ) : (
          rows.map((row) => <Row key={row.id} row={row} />)
        )}
      </div>
    </section>
  );
}

function Row({ row }: { row: ContactRow }) {
  const [menu, setMenu] = useState<'closed' | 'open' | 'log' | 'snooze'>('closed');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function run(work: () => Promise<void>) {
    startTransition(async () => {
      try {
        await work();
        setMenu('closed');
        router.refresh();
      } catch {
        toast("Couldn't save. Check your connection.");
      }
    });
  }

  const lastLine = row.lastContact
    ? `${formatShortDate(row.lastContact.date)} · ${channelLabel(row.lastContact.channel)}`
    : 'Never contacted';
  const noteLine = row.lastContact?.note?.split('\n')[0] ?? null;

  return (
    <div>
      <div className="flex items-start gap-2">
        <Link href={`/contact/${row.id}`} className="min-w-0 flex-1 px-4 py-3 active:bg-surface-pressed">
          <div className="flex items-center gap-2">
            <span className="truncate text-[17px]">{row.name}</span>
            <span className="shrink-0 text-[13px] text-ink-tertiary">
              {row.role === 'rabbi' ? 'R' : 'W'}
            </span>
            {!row.active ? <Chip>inactive</Chip> : null}
          </div>

          {row.reasons.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {row.reasons.map((reason) => (
                <Chip key={reason.kind} tone="accent">
                  {reason.label}
                </Chip>
              ))}
            </div>
          ) : null}

          {row.reasons.length > 0 && row.reasons[0].detail ? (
            <p className="mt-1 text-[13px] text-ink-secondary">{row.reasons[0].detail}</p>
          ) : null}

          {row.stillAttending ? (
            <p className="mt-1 text-[13px] text-ink-secondary">{row.stillAttending}</p>
          ) : null}

          <p className="mt-1 text-[13px] text-ink-secondary">{lastLine}</p>
          {noteLine ? <p className="truncate text-[13px] text-ink-tertiary">{noteLine}</p> : null}
          {row.snoozedUntil ? (
            <p className="mt-1 text-[13px] text-ink-secondary">
              Snoozed until {formatShortDate(row.snoozedUntil)}
            </p>
          ) : null}
        </Link>

        <button
          type="button"
          onClick={() => setMenu(menu === 'closed' ? 'open' : 'closed')}
          aria-label={`Actions for ${row.name}`}
          aria-expanded={menu !== 'closed'}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-center text-[20px] text-ink-secondary active:opacity-60"
        >
          &hellip;
        </button>
      </div>

      {menu === 'open' ? (
        <div className="flex flex-col border-t border-hairline bg-canvas">
          <MenuItem onClick={() => setMenu('log')}>Log contact</MenuItem>
          {row.snoozedUntil ? (
            <MenuItem onClick={() => run(() => snoozeForDays(row.id, 0))} disabled={pending}>
              Unsnooze
            </MenuItem>
          ) : (
            <MenuItem onClick={() => setMenu('snooze')}>Snooze</MenuItem>
          )}
          <MenuItem
            onClick={() => run(() => setTrackContact(row.id, !row.trackContact))}
            disabled={pending}
          >
            {row.trackContact ? 'Hide from Contact' : 'Show in Contact'}
          </MenuItem>
          {row.phone ? (
            <a
              href={`tel:${row.phone}`}
              className="min-h-[2.75rem] px-4 py-2.5 text-left text-[17px] text-accent active:bg-surface-pressed"
            >
              Call {row.phone}
            </a>
          ) : null}
          {row.email ? (
            <a
              href={`mailto:${row.email}`}
              className="min-h-[2.75rem] truncate px-4 py-2.5 text-left text-[17px] text-accent active:bg-surface-pressed"
            >
              Email {row.email}
            </a>
          ) : null}
        </div>
      ) : null}

      {menu === 'snooze' ? (
        <div className="flex flex-wrap gap-2 border-t border-hairline bg-canvas px-4 py-3">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              type="button"
              disabled={pending}
              onClick={() => run(() => snoozeForDays(row.id, days))}
              className="min-h-[2.75rem] rounded-xl bg-surface px-3 text-[15px] text-accent"
            >
              {days} days
            </button>
          ))}
          <CustomSnooze onPick={(days) => run(() => snoozeForDays(row.id, days))} />
        </div>
      ) : null}

      {menu === 'log' ? (
        <div className="border-t border-hairline bg-canvas">
          <ContactForm
            personId={row.id}
            defaultChannel={row.lastContact?.channel}
            onDone={() => setMenu('closed')}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[2.75rem] px-4 py-2.5 text-left text-[17px] text-accent active:bg-surface-pressed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function CustomSnooze({ onPick }: { onPick: (days: number) => void }) {
  const [days, setDays] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(days);
        if (value > 0) onPick(value);
      }}
      className="flex items-center gap-2"
    >
      <input
        type="number"
        min={1}
        inputMode="numeric"
        value={days}
        onChange={(event) => setDays(event.target.value)}
        placeholder="Days"
        aria-label="Snooze for this many days"
        className="w-24 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[16px]"
      />
      <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-accent">
        Snooze
      </button>
    </form>
  );
}
