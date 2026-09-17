import { today } from '@/lib/dates';
import type { Person } from '@/lib/types';

import { Button, inputClasses } from './ui';

/** Add and edit share one form; `person` is absent when adding. */
export function PersonForm({
  action,
  person,
  submitLabel,
}: {
  action: (form: FormData) => Promise<void>;
  person?: Person;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mx-auto w-full max-w-[480px] pb-tabbar">
      <section className="px-4 pt-4">
        <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Name</span>
            <input
              name="name"
              required
              autoFocus={!person}
              defaultValue={person?.name ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Role</span>
            <select name="role" defaultValue={person?.role ?? 'working'} className={inputClasses}>
              <option value="working">Working</option>
              <option value="rabbi">Rabbi</option>
            </select>
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Phone (optional)</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={person?.phone ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={person?.notes ?? ''}
              className={inputClasses}
            />
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_night_seder"
              defaultChecked={person ? person.in_night_seder : true}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">In night seder</span>
          </label>

          <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
            <input
              type="checkbox"
              name="in_daf"
              defaultChecked={person ? person.in_daf : false}
              className="h-5 w-5 accent-[var(--accent)]"
            />
            <span className="text-[17px]">In Daf</span>
          </label>

          <label className="block px-4 py-2.5">
            <span className="mb-1 block text-[13px] text-ink-secondary">Start date</span>
            <input
              type="date"
              name="start_date"
              defaultValue={person?.start_date ?? today()}
              className={inputClasses}
            />
            <span className="mt-1 block text-[13px] text-ink-tertiary">
              He is only expected at sessions from this date on.
            </span>
          </label>
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
