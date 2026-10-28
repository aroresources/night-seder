'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import type { MaritalStatus, Role } from '@/lib/types';

import { RoleMark } from './ui';

export interface ShidduchRow {
  id: string;
  name: string;
  role: Role;
  status: MaritalStatus;
  /** Null when no birthday is on file, so his age cannot be worked out. */
  age: number | null;
  job: string | null;
  /** He has a resume on file. */
  hasFile: boolean;
}

type Filter = 'all' | 'single' | 'divorced';
type Sort = 'name' | 'age';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'single', label: 'Single' },
  { value: 'divorced', label: 'Divorced' },
];

export function ShidduchList({ rows }: { rows: ShidduchRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('name');
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const kept = rows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false;
      if (needle && !row.name.toLowerCase().includes(needle)) return false;
      return true;
    });

    if (sort === 'name') return kept;
    // Youngest first, and a man with no birthday goes last rather than
    // sorting as if he were nought.
    return [...kept].sort((a, b) => {
      if (a.age === null && b.age === null) return 0;
      if (a.age === null) return 1;
      if (b.age === null) return -1;
      return a.age - b.age;
    });
  }, [rows, filter, sort, search]);

  const chip = (active: boolean) =>
    `min-h-[2.25rem] shrink-0 rounded-full px-3 text-[15px] ${
      active ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
    }`;

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
              className={chip(filter === option.value)}
            >
              {option.label}
            </button>
          ))}

          <span className="shrink-0 self-center px-1 text-[13px] text-ink-tertiary">by</span>

          {(['name', 'age'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSort(option)}
              aria-pressed={sort === option}
              className={chip(sort === option)}
            >
              {option === 'name' ? 'Name' : 'Age'}
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
            visible.map((row) => (
              <Link
                key={row.id}
                href={`/more/people/${row.id}`}
                className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5 active:bg-surface-pressed"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[17px]">{row.name}</span>
                    <RoleMark role={row.role} />
                  </div>
                  <p className="truncate text-[13px] text-ink-secondary">
                    {row.status === 'divorced' ? 'Divorced' : 'Single'}
                    {row.job ? ` · ${row.job}` : ''}
                    {row.hasFile ? ' · resume' : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[17px] tabular-nums text-ink-secondary">
                  {row.age ?? '–'}
                </span>
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
