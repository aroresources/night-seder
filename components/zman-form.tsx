import { today, weekdayNameFor } from '@/lib/dates';
import type { Zman } from '@/lib/types';

import { Button, inputClasses } from './ui';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_OFF = [5, 6];

export function ZmanForm({
  action,
  zman,
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  zman?: Zman;
  submitLabel: string;
}) {
  const off = new Set(zman?.off_weekdays ?? DEFAULT_OFF);

  return (
    <form action={action} className="mx-auto w-full max-w-[480px] pb-tabbar">
      <section className="px-4 pt-4">
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Name</span>
            <input
              name="name"
              required
              autoFocus={!zman}
              placeholder="Winter 5787"
              defaultValue={zman?.name ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Starts</span>
            <input
              type="date"
              name="start_date"
              required
              defaultValue={zman?.start_date ?? today()}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Ends</span>
            <input
              type="date"
              name="end_date"
              required
              defaultValue={zman?.end_date ?? ''}
              className={inputClasses}
            />
          </label>
        </div>
      </section>

      <section className="px-4">
        <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
          Nights we never learn
        </h2>
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          {WEEKDAYS.map((day) => (
            <label key={day} className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                name="off_weekdays"
                value={day}
                defaultChecked={off.has(day)}
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-[17px]">{weekdayNameFor(day)}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="px-4 pt-4">
        <Button type="submit" variant="filled">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
