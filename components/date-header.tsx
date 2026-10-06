'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { addDays, formatHeaderDate, type CalendarDate } from '@/lib/dates';

/**
 * The date at the top of Tonight and Daf. Arrows step one calendar day; the
 * date itself is a real `<input type="date">` sitting invisibly on top of the
 * label, which is what opens the native picker on iOS.
 */
export function DateHeader({
  date,
  subtitle,
}: {
  date: CalendarDate;
  subtitle: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(to: CalendarDate) {
    // Keep everything else in the query, so stepping a day does not bounce you
    // from Shachris back to Daf.
    const next = new URLSearchParams(searchParams.toString());
    next.set('date', to);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 pt-safe backdrop-blur">
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-1 px-2 py-2">
        <button
          type="button"
          onClick={() => go(addDays(date, -1))}
          aria-label="Previous day"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px] text-accent active:bg-surface-pressed"
        >
          &lsaquo;
        </button>

        <div className="relative min-w-0 flex-1 text-center">
          <p className="truncate text-[17px] font-semibold">{formatHeaderDate(date)}</p>
          <p className="truncate text-[13px] text-ink-secondary">{subtitle}</p>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              if (event.target.value) go(event.target.value);
            }}
            aria-label="Pick a date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <button
          type="button"
          onClick={() => go(addDays(date, 1))}
          aria-label="Next day"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px] text-accent active:bg-surface-pressed"
        >
          &rsaquo;
        </button>
      </div>
    </header>
  );
}
