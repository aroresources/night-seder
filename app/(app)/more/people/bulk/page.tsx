import Link from 'next/link';

import { bulkAddPeople } from '@/app/actions/people';
import { Button, ScreenHeader, inputClasses } from '@/components/ui';
import { today } from '@/lib/dates';

export default function BulkAddPage() {
  return (
    <>
      <ScreenHeader
        title="Paste a list"
        subtitle="One full name per line"
        action={
          <Link href="/more/people" className="text-[17px] text-accent">
            People
          </Link>
        }
      />

      <form action={bulkAddPeople} className="mx-auto w-full max-w-[480px] pb-tabbar">
        <section className="px-4 pt-4">
          <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
            <label className="block px-4 py-2.5">
              <span className="mb-1 block text-[13px] text-ink-secondary">Names</span>
              <textarea
                name="names"
                rows={10}
                required
                autoFocus
                placeholder={'Dovid Cohen\nMoshe Chaim Levy\nYaakov Stern'}
                className={inputClasses}
              />
              <span className="mt-1 block text-[13px] text-ink-tertiary">
                The first word is the first name, the last is the surname, anything between is
                the middle. Fix any it gets wrong on the person&apos;s page.
              </span>
            </label>

            <label className="block px-4 py-2.5">
              <span className="mb-1 block text-[13px] text-ink-secondary">Role for all of them</span>
              <select name="role" defaultValue="working" className={inputClasses}>
                <option value="working">Working</option>
                <option value="rabbi">Rabbi</option>
              </select>
            </label>

            <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
              <input
                type="checkbox"
                name="in_night_seder"
                defaultChecked
                className="h-5 w-5 accent-[var(--accent)]"
              />
              <span className="text-[17px]">In night seder</span>
            </label>

            <label className="flex min-h-[2.75rem] items-center gap-3 px-4 py-2.5">
              <input type="checkbox" name="in_daf" className="h-5 w-5 accent-[var(--accent)]" />
              <span className="text-[17px]">In Daf</span>
            </label>

            <label className="block px-4 py-2.5">
              <span className="mb-1 block text-[13px] text-ink-secondary">Start date</span>
              <input type="date" name="start_date" defaultValue={today()} className={inputClasses} />
            </label>
          </div>
        </section>

        <div className="px-4 pt-4">
          <Button type="submit" variant="filled">
            Add them
          </Button>
        </div>
      </form>
    </>
  );
}
