import Link from 'next/link';

import { addMorningDayOff, removeMorningDayOff } from '@/app/actions/schedule';
import { Button, ScreenHeader, inputClasses } from '@/components/ui';
import { formatCompactDate, today } from '@/lib/dates';
import { getMorningDaysOff } from '@/lib/queries';
import { MORNING_PROGRAMS } from '@/lib/types';
import type { DafDayOff } from '@/lib/types';

export default async function MorningDaysOffPage() {
  const [dafDaysOff, shachrisDaysOff] = await Promise.all(
    MORNING_PROGRAMS.map((program) => getMorningDaysOff(program.daysOffTable)),
  );

  const sections: { label: string; table: 'daf_days_off' | 'shachris_days_off'; daysOff: DafDayOff[] }[] = [
    { label: 'Daf', table: 'daf_days_off', daysOff: dafDaysOff },
    { label: 'Shachris', table: 'shachris_days_off', daysOff: shachrisDaysOff },
  ];

  return (
    <>
      <ScreenHeader
        title="Morning days off"
        subtitle="Shabbos is already off for both"
        action={
          <Link href="/more" className="text-[17px] text-accent">
            More
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {sections.map((section) => (
          <section key={section.table} className="px-4">
            <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
              {section.label}
            </h2>

            <form action={addMorningDayOff.bind(null, section.table)} className="mb-3">
              <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
                <label className="block">
                  <span className="mb-1 block text-[13px] text-ink-secondary">Date</span>
                  <input
                    type="date"
                    name="date"
                    defaultValue={today()}
                    required
                    className={inputClasses}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[13px] text-ink-secondary">
                    Reason (optional)
                  </span>
                  <input name="reason" placeholder="For example Pesach" className={inputClasses} />
                </label>
                <div>
                  <Button type="submit" variant="filled">
                    Add day off
                  </Button>
                </div>
              </div>
            </form>

            <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
              {section.daysOff.length === 0 ? (
                <p className="px-4 py-3 text-[15px] text-ink-secondary">
                  No {section.label} days off yet.
                </p>
              ) : (
                section.daysOff.map((day) => (
                  <div key={day.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px]">{formatCompactDate(day.date)}</p>
                      {day.reason ? (
                        <p className="truncate text-[13px] text-ink-secondary">{day.reason}</p>
                      ) : null}
                    </div>
                    <form action={removeMorningDayOff.bind(null, section.table, day.id)}>
                      <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-danger">
                        Delete
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
