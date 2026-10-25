'use client';

import { useMemo, useState } from 'react';

import { deletePair, movePair, removePairMember } from '@/app/actions/zmanim';
import type { Role } from '@/lib/types';

import { PairEditor, type PairCandidate } from './pair-editor';
import { Group, inputClasses } from './ui';

export interface PairedMan {
  id: string;
  name: string;
  role: Role;
}

export interface PairRow {
  id: string;
  /** The name given to the pair, or null when it reads as its members. */
  label: string | null;
  members: PairedMan[];
}

/**
 * Every pair in a zman, with a box to find one.
 *
 * A zman runs to dozens of pairs, so finding the man you want meant scrolling
 * past everyone else. A search matches the pair rather than the man: type one
 * name and you get him *and* his chavrusa, which is the thing you came to
 * look up. It also matches a pair's own name, for the ones that have one.
 *
 * Reordering and deleting are hidden while a search is running — the arrows
 * move a pair relative to the ones around it, and the ones around it are not
 * on screen.
 */
export function PairingsList({
  zmanId,
  pairs,
  pickable,
}: {
  zmanId: string;
  pairs: PairRow[];
  /** Everyone who could join a pair, for the per-pair editor. */
  pickable: PairCandidate[];
}) {
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!needle) return pairs;
    return pairs.filter(
      (pair) =>
        pair.label?.toLowerCase().includes(needle) ||
        pair.members.some((member) => member.name.toLowerCase().includes(needle)),
    );
  }, [pairs, needle]);

  const nameOf = (pair: PairRow) =>
    pair.label ?? pair.members.map((member) => member.name).join(' & ');

  return (
    <>
      {pairs.length > 1 ? (
        <div className="px-4 pt-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search pairs"
            aria-label="Search pairs"
            className={inputClasses}
          />
        </div>
      ) : null}

      <Group
        title={
          needle ? `Pairings (${visible.length} of ${pairs.length})` : `Pairings (${pairs.length})`
        }
      >
        {pairs.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">
            No pairs yet. Add one, or copy last zman&apos;s.
          </p>
        ) : visible.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">
            Nobody matching &ldquo;{search.trim()}&rdquo;.
          </p>
        ) : (
          visible.map((pair) => {
            const label = nameOf(pair);
            const index = pairs.indexOf(pair);

            return (
              <div key={pair.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-[17px]">{label}</p>
                  {needle ? null : (
                    <>
                      <form action={movePair.bind(null, zmanId, pair.id, 'up')}>
                        <button
                          type="submit"
                          disabled={index === 0}
                          aria-label={`Move ${label} up`}
                          className="h-11 w-8 text-[17px] text-accent disabled:opacity-30"
                        >
                          &uarr;
                        </button>
                      </form>
                      <form action={movePair.bind(null, zmanId, pair.id, 'down')}>
                        <button
                          type="submit"
                          disabled={index === pairs.length - 1}
                          aria-label={`Move ${label} down`}
                          className="h-11 w-8 text-[17px] text-accent disabled:opacity-30"
                        >
                          &darr;
                        </button>
                      </form>
                      <form action={deletePair.bind(null, pair.id)}>
                        <button type="submit" className="h-11 px-2 text-[15px] text-danger">
                          Delete
                        </button>
                      </form>
                    </>
                  )}
                </div>

                <div className="mt-1 flex flex-col">
                  {pair.members.map((member) => (
                    <div key={member.id} className="flex items-center gap-2 py-0.5">
                      <span className="flex-1 text-[15px] text-ink-secondary">
                        {member.name}
                        <span className="text-ink-tertiary">
                          {' '}
                          {member.role === 'rabbi' ? 'R' : 'W'}
                        </span>
                      </span>
                      <form action={removePairMember.bind(null, pair.id, member.id)}>
                        <button type="submit" className="px-2 py-1 text-[13px] text-danger">
                          Remove
                        </button>
                      </form>
                    </div>
                  ))}
                </div>

                <PairEditor
                  pairId={pair.id}
                  label={label}
                  hasOwnLabel={pair.label !== null}
                  candidates={pickable.filter(
                    (person) => !pair.members.some((member) => member.id === person.id),
                  )}
                />
              </div>
            );
          })
        )}
      </Group>
    </>
  );
}
