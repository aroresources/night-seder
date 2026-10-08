'use client';

import { useRef, useState, useSyncExternalStore } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';
import type { AttendanceTable, Group, Role } from '@/lib/types';
import { useToast } from './toast';

export interface BoardPerson {
  id: string;
  name: string;
  role: Role;
}

export interface BoardGroup {
  key: string;
  title: string | null;
  people: BoardPerson[];
  /**
   * Offer a one-tap "mark both" on the heading. Only for real pairs: on a long
   * list like "Not paired" it would be a mass-mark one stray tap away.
   */
  markAll?: boolean;
}

type View = 'pairs' | 'flat';

/*
 * Which view you last chose, remembered between nights.
 *
 * localStorage is an external store, not React state: reading it in an effect
 * would render twice, and reading it while rendering would disagree with the
 * server. useSyncExternalStore is the thing that handles both — the server and
 * the first client render both say "pairs", then it settles on what's stored.
 */
const VIEW_KEY = 'night-seder:tonight-view';

const viewListeners = new Set<() => void>();

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'flat' ? 'flat' : 'pairs';
  } catch {
    // Private browsing, blocked site data. The default view is fine.
    return 'pairs';
  }
}

function serverView(): View {
  return 'pairs';
}

function subscribeToView(listener: () => void) {
  viewListeners.add(listener);
  return () => {
    viewListeners.delete(listener);
  };
}

function writeView(view: View) {
  try {
    window.localStorage.setItem(VIEW_KEY, view);
  } catch {
    // Not worth saying anything about: the view still changes for this visit.
  }
  for (const listener of viewListeners) listener();
}

/**
 * The tap-to-mark list behind Tonight and Daf.
 *
 * Attendance is per person, not per pair: the same person may appear in more
 * than one group, marking him anywhere marks him everywhere, and the footer
 * counts him once.
 *
 * Writes go straight to Supabase from the browser so the tap feels instant.
 * The row changes first; if the write fails it changes back and says so.
 */
export function AttendanceBoard({
  table,
  date,
  groups,
  flatGroup,
  topicGroups = [],
  groupsByPerson = {},
  initialPresent,
}: {
  table: AttendanceTable;
  date: string;
  groups: BoardGroup[];
  /** Everyone in one list. Supplying it offers the by-pair / everyone switch. */
  flatGroup?: BoardGroup;
  /** Topic groups to filter by, e.g. Hilchasa. Empty hides the chips. */
  topicGroups?: Group[];
  /** Person id -> the topic groups he is in. */
  groupsByPerson?: Record<string, string[]>;
  initialPresent: string[];
}) {
  const toast = useToast();
  const [present, setPresent] = useState<ReadonlySet<string>>(() => new Set(initialPresent));
  const [topic, setTopic] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const view = useSyncExternalStore(subscribeToView, readView, serverView);
  const queues = useRef(new Map<string, Promise<unknown>>());

  const needle = search.trim().toLowerCase();

  /**
   * A group narrows the room: you are taking Oraysa's attendance, so the
   * footer counts Oraysa. A search only helps you find one man in a long
   * list, so it hides rows without changing what the footer is counting.
   */
  const inTopic = (person: BoardPerson) =>
    !topic || (groupsByPerson[person.id] ?? []).includes(topic);
  const matchesSearch = (person: BoardPerson) =>
    !needle || person.name.toLowerCase().includes(needle);

  const base = flatGroup && view === 'flat' ? [flatGroup] : groups;

  // A pair whose men are all filtered out drops away rather than sitting
  // there empty.
  const shown = base
    .map((group) => ({
      ...group,
      people: group.people.filter((person) => inTopic(person) && matchesSearch(person)),
    }))
    .filter((group) => group.people.length > 0);

  const scope = new Set(
    base.flatMap((group) => group.people.filter(inTopic).map((person) => person.id)),
  );
  const hereCount = [...scope].filter((id) => present.has(id)).length;

  // Not worth a search box over a handful of names.
  const showSearch =
    new Set(base.flatMap((group) => group.people.map((person) => person.id))).size > 8;

  function apply(personId: string, shouldBePresent: boolean) {
    setPresent((current) => {
      const next = new Set(current);
      if (shouldBePresent) next.add(personId);
      else next.delete(personId);
      return next;
    });
  }

  function setPresence(personId: string, shouldBePresent: boolean) {
    const wasPresent = present.has(personId);
    if (wasPresent === shouldBePresent) return;
    apply(personId, shouldBePresent);

    const write = async () => {
      const supabase = supabaseBrowser();
      if (shouldBePresent) {
        const { error } = await supabase.from(table).insert({ date, person_id: personId });
        // 23505 is the unique violation: the row is already there, which is
        // exactly the state we were asking for.
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('date', date)
          .eq('person_id', personId);
        if (error) throw new Error(error.message);
      }
    };

    // One write at a time per person, so fast double taps land in order.
    const queued = (queues.current.get(personId) ?? Promise.resolve()).then(write).catch(() => {
      apply(personId, wasPresent);
      toast("Couldn't save. Check your connection.");
    });
    queues.current.set(personId, queued);
  }

  /** Mark everyone in a pair at once, or clear them if they are all already here. */
  function toggleGroup(group: BoardGroup) {
    const ids = group.people.map((person) => person.id);
    const allPresent = ids.every((id) => present.has(id));
    for (const id of ids) setPresence(id, !allPresent);
  }

  return (
    <>
      {flatGroup ? (
        <div className="flex gap-2 px-4 pt-4">
          {(
            [
              ['pairs', 'By pair'],
              ['flat', 'Everyone'],
            ] as [View, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => writeView(value)}
              aria-pressed={view === value}
              className={`min-h-[2.25rem] rounded-full px-3 text-[15px] ${
                view === value ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {topicGroups.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {topicGroups.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTopic(topic === option.id ? null : option.id)}
              aria-pressed={topic === option.id}
              className={`min-h-[2.25rem] shrink-0 rounded-full px-3 text-[15px] ${
                topic === option.id ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
      ) : null}

      {showSearch ? (
        <div className="px-4 pt-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a name"
            aria-label="Find a name"
            className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[16px]"
          />
        </div>
      ) : null}

      <div className="pb-14">
        {shown.length === 0 ? (
          <p className="px-5 pt-6 text-[15px] text-ink-secondary">
            {needle ? `Nobody matching “${search.trim()}”.` : 'Nobody here is in that group.'}
          </p>
        ) : null}
        {shown.map((group) => {
          const allHere =
            group.people.length > 0 && group.people.every((person) => present.has(person.id));

          return (
            <section key={group.key} className="px-4">
              {group.title ? (
                <div className="flex items-center gap-2 px-1 pt-5 pb-2">
                  <h2 className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-secondary">
                    {group.title}
                  </h2>
                  {group.markAll && group.people.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group)}
                      className="shrink-0 text-[13px] text-accent"
                    >
                      {allHere ? 'Clear' : group.people.length > 2 ? 'Mark all' : 'Mark both'}
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="pt-4" />
              )}

              <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
                {group.people.map((person) => {
                  const isPresent = present.has(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => setPresence(person.id, !isPresent)}
                      aria-pressed={isPresent}
                      className={`flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-2 text-left text-[17px] ${
                        isPresent
                          ? 'bg-accent text-on-accent'
                          : 'bg-surface text-ink active:bg-surface-pressed'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{person.name}</span>
                      <span
                        className={`shrink-0 text-[13px] ${
                          isPresent ? 'text-on-accent/70' : 'text-ink-tertiary'
                        }`}
                      >
                        {person.role === 'rabbi' ? 'R' : 'W'}
                      </span>
                      <span aria-hidden className="w-4 shrink-0 text-center text-[17px]">
                        {isPresent ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
                {group.people.length === 0 ? (
                  <p className="px-4 py-3 text-[15px] text-ink-secondary">Nobody here.</p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-20 border-t border-hairline bg-canvas/95 backdrop-blur">
        <p className="mx-auto w-full max-w-[480px] px-4 py-3 text-[15px] font-medium">
          {hereCount} of {scope.size} here
        </p>
      </div>
    </>
  );
}
