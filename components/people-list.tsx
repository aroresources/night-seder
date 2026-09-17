'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { Person } from '@/lib/types';

type Filter = 'all' | 'rabbi' | 'working' | 'daf' | 'inactive';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'rabbi', label: 'Rabbis' },
  { value: 'working', label: 'Working' },
  { value: 'daf', label: 'Daf' },
  { value: 'inactive', label: 'Inactive' },
];

export function PeopleList({ people }: { people: Person[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return people.filter((person) => {
      if (needle && !person.name.toLowerCase().includes(needle)) return false;
      switch (filter) {
        case 'rabbi':
          return person.role === 'rabbi' && person.active;
        case 'working':
          return person.role === 'working' && person.active;
        case 'daf':
          return person.in_daf && person.active;
        case 'inactive':
          return !person.active;
        default:
          return true;
      }
    });
  }, [people, filter, search]);

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
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search names"
          aria-label="Search names"
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[16px]"
        />
      </div>

      <section className="px-4 pt-4">
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          {visible.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">Nobody matches.</p>
          ) : (
            visible.map((person) => (
              <Link
                key={person.id}
                href={`/more/people/${person.id}`}
                className={`flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed ${
                  person.active ? '' : 'text-ink-tertiary'
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[17px]">{person.name}</span>
                <span className="shrink-0 text-[13px] text-ink-tertiary">
                  {person.role === 'rabbi' ? 'R' : 'W'}
                </span>
                {person.in_daf ? (
                  <span className="shrink-0 text-[13px] text-ink-tertiary">Daf</span>
                ) : null}
                {!person.active ? (
                  <span className="shrink-0 text-[13px] text-ink-tertiary">inactive</span>
                ) : null}
                <span aria-hidden className="text-[17px] leading-none text-ink-tertiary">
                  &rsaquo;
                </span>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
