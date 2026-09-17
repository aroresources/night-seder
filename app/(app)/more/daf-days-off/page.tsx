import Link from 'next/link';

import { addDafDayOff, removeDafDayOff } from '@/app/actions/schedule';
import { Button, ScreenHeader, inputClasses } from '@/components/ui';
import { formatCompactDate, today } from '@/lib/dates';
import { getDafDaysOff } from '@/lib/queries';

export default async function DafDaysOffPage() {
  const daysOff = await getDafDaysOff();

  return (
    <>
      <ScreenHeader
        title="Daf days off"
        subtitle="Saturdays are already off"
        action={
          <Link href="/more" className="text-[17px] text-accent">
            More
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <form action={addDafDayOff} className="px-4 pt-4">
          <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">Date</span>
              <input type="date" name="date" defaultValue={today()} required className={inputClasses} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] text-ink-secondary">Reason (optional)</span>
              <input name="reason" placeholder="For example Pesach" className={inputClasses} />
            </label>
            <div>
              <Button type="submit" variant="filled">
                Add day off
              </Button>
            </div>
          </div>
        </form>

        <section className="px-4">
          <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">Days off</h2>
          <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
            {daysOff.length === 0 ? (
              <p className="px-4 py-3 text-[15px] text-ink-secondary">
                No Daf days off yet. Add one when the shiur isn&apos;t running.
              </p>
            ) : (
              daysOff.map((day) => (
                <div key={day.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px]">{formatCompactDate(day.date)}</p>
                    {day.reason ? (
                      <p className="truncate text-[13px] text-ink-secondary">{day.reason}</p>
                    ) : null}
                  </div>
                  <form action={removeDafDayOff.bind(null, day.id)}>
                    <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-danger">
                      Delete
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
