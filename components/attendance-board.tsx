'use client';

import { useRef, useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';
import type { AttendanceTable, Role } from '@/lib/types';
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
  initialPresent,
}: {
  table: AttendanceTable;
  date: string;
  groups: BoardGroup[];
  initialPresent: string[];
}) {
  const toast = useToast();
  const [present, setPresent] = useState<ReadonlySet<string>>(() => new Set(initialPresent));
  const queues = useRef(new Map<string, Promise<unknown>>());

  const everyone = new Set(groups.flatMap((group) => group.people.map((p) => p.id)));
  const hereCount = [...everyone].filter((id) => present.has(id)).length;

  function apply(personId: string, shouldBePresent: boolean) {
    setPresent((current) => {
      const next = new Set(current);
      if (shouldBePresent) next.add(personId);
      else next.delete(personId);
      return next;
    });
  }

  function toggle(personId: string) {
    const wasPresent = present.has(personId);
    const shouldBePresent = !wasPresent;
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

  return (
    <>
      <div className="pb-14">
        {groups.map((group) => (
          <section key={group.key} className="px-4">
            {group.title ? (
              <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
                {group.title}
              </h2>
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
                    onClick={() => toggle(person.id)}
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
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-20 border-t border-hairline bg-canvas/95 backdrop-blur">
        <p className="mx-auto w-full max-w-[480px] px-4 py-3 text-[15px] font-medium">
          {hereCount} of {everyone.size} here
        </p>
      </div>
    </>
  );
}
