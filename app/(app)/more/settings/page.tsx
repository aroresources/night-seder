import Link from 'next/link';

import { updateSettings } from '@/app/actions/schedule';
import { Button, Field, ScreenHeader, inputClasses } from '@/components/ui';
import { getSettings } from '@/lib/queries';

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <ScreenHeader
        title="Settings"
        action={
          <Link href="/more" className="text-[17px] text-accent">
            More
          </Link>
        }
      />

      <form action={updateSettings} className="mx-auto w-full max-w-[480px] pb-tabbar">
        <section className="px-4 pt-4">
          <div className="divide-hairline overflow-hidden rounded-xl bg-surface">
            <Field label="Flag someone after this many missed nights in a row">
              <input
                type="number"
                name="night_absence_threshold"
                min={1}
                inputMode="numeric"
                defaultValue={settings.night_absence_threshold}
                className={inputClasses}
              />
            </Field>
            <Field label="...missed Daf mornings in a row">
              <input
                type="number"
                name="daf_absence_threshold"
                min={1}
                inputMode="numeric"
                defaultValue={settings.daf_absence_threshold}
                className={inputClasses}
              />
            </Field>
          </div>
          <p className="px-1 pt-2 text-[13px] text-ink-secondary">
            Missed sessions, not missed days: Fridays, days off and the break between zmanim never
            count. Changing these takes effect right away in Contact and Reports.
          </p>
        </section>

        <div className="px-4 pt-4">
          <Button type="submit" variant="filled">
            Save
          </Button>
        </div>
      </form>
    </>
  );
}
