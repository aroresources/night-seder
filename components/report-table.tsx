'use client';

import { useMemo, useState } from 'react';

import { Chip } from './ui';

export interface ReportRow {
  id: string;
  name: string;
  /** Surname first, lowercased — what "sort by name" actually means here. */
  sortKey: string;
  role: 'rabbi' | 'working';
  pair: string | null;
  attended: number;
  expected: number;
  percent: number;
  flagged: boolean;
  streak: number;
}

type Sort = 'name' | 'percent';
type Filter = 'all' | 'rabbi' | 'working';

/** Turn a value into a CSV field, quoting only when it has to. */
function csvField(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function ReportTable({
  rows,
  filename,
  showPair,
}: {
  rows: ReportRow[];
  filename: string;
  showPair: boolean;
}) {
  const [sort, setSort] = useState<Sort>('name');
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => filter === 'all' || row.role === filter);
    return [...filtered].sort((a, b) =>
      sort === 'name'
        ? a.sortKey.localeCompare(b.sortKey)
        : b.percent - a.percent || a.sortKey.localeCompare(b.sortKey),
    );
  }, [rows, sort, filter]);

  function downloadCsv() {
    const header = ['Name', 'Role', ...(showPair ? ['Pair'] : []), 'Attended', 'Expected', 'Percent'];
    const lines = [
      header.join(','),
      ...visible.map((row) =>
        [
          csvField(row.name),
          csvField(row.role === 'rabbi' ? 'Rabbi' : 'Working'),
          ...(showPair ? [csvField(row.pair ?? '')] : []),
          row.attended,
          row.expected,
          row.percent,
        ].join(','),
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="px-4">
      <div className="flex items-center justify-between gap-2 px-1 pt-5 pb-2">
        <h2 className="text-[13px] font-medium text-ink-secondary">Per person</h2>
        <button type="button" onClick={downloadCsv} className="text-[15px] text-accent">
          Export CSV
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['rabbi', 'Rabbis'],
            ['working', 'Working'],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-[2.25rem] rounded-full px-3 text-[15px] ${
              filter === value ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
            }`}
          >
            {label}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          {(
            [
              ['name', 'Name'],
              ['percent', '%'],
            ] as [Sort, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setSort(value)}
              aria-pressed={sort === value}
              className={`min-h-[2.25rem] rounded-full px-3 text-[15px] ${
                sort === value ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
        {visible.length === 0 ? (
          <p className="px-4 py-3 text-[15px] text-ink-secondary">Nobody to report on yet.</p>
        ) : (
          visible.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[17px]">{row.name}</span>
                  <span className="shrink-0 text-[13px] text-ink-tertiary">
                    {row.role === 'rabbi' ? 'R' : 'W'}
                  </span>
                  {row.flagged ? <Chip tone="accent">Missed {row.streak}</Chip> : null}
                </div>
                {showPair && row.pair ? (
                  <p className="truncate text-[13px] text-ink-secondary">{row.pair}</p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[17px] tabular-nums">{row.percent}%</p>
                <p className="text-[13px] tabular-nums text-ink-secondary">
                  {row.attended}/{row.expected}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
