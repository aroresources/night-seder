'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { inputClasses } from './ui';

/** Updates one search param, keeping the rest of the query intact. */
function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    router.push(`${pathname}?${next.toString()}`);
  };
}

export function ZmanPicker({
  zmanim,
  selected,
}: {
  zmanim: { id: string; name: string }[];
  selected: string;
}) {
  const setParam = useSetParam();

  return (
    <div className="px-4 pt-3">
      <label className="block">
        <span className="mb-1 block text-[13px] text-ink-secondary">Zman</span>
        <select
          value={selected}
          onChange={(event) => setParam({ zman: event.target.value })}
          className={inputClasses}
        >
          {zmanim.map((zman) => (
            <option key={zman.id} value={zman.id}>
              {zman.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const RANGES = [
  { value: 'month', label: 'This month' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom' },
];

export function DafRangePicker({
  range,
  from,
  to,
}: {
  range: string;
  from: string;
  to: string;
}) {
  const setParam = useSetParam();

  return (
    <div className="px-4 pt-3">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              setParam(
                option.value === 'custom'
                  ? { daf: 'custom', from, to }
                  : { daf: option.value, from: null, to: null },
              )
            }
            aria-pressed={range === option.value}
            className={`min-h-[2.25rem] rounded-full px-3 text-[15px] ${
              range === option.value ? 'bg-accent text-on-accent' : 'bg-surface text-ink-secondary'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {range === 'custom' ? (
        <div className="mt-3 flex gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-[13px] text-ink-secondary">From</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setParam({ daf: 'custom', from: event.target.value })}
              className={inputClasses}
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-[13px] text-ink-secondary">To</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setParam({ daf: 'custom', to: event.target.value })}
              className={inputClasses}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
