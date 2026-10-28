import Link from 'next/link';

import { ShidduchList, type ShidduchRow } from '@/components/shidduch-list';
import { Empty, ScreenHeader } from '@/components/ui';
import { ageOn, today } from '@/lib/dates';
import { supabaseServer } from '@/lib/supabase/server';
import { getPeople } from '@/lib/queries';

/**
 * Who is in shidduchim: the men marked single or divorced.
 *
 * Nobody is assumed single — a blank status means nobody has said, so he is
 * left off rather than put on a list he may not belong on.
 */
export default async function ShidduchimPage() {
  const now = today();
  const people = await getPeople();

  const inShidduchim = people.filter(
    (person) =>
      person.active && (person.marital_status === 'single' || person.marital_status === 'divorced'),
  );

  // One query for the lot rather than one each: all that is needed is whether
  // a man has anything on file at all.
  const supabase = await supabaseServer();
  const { data: fileRows } = await supabase
    .from('person_files')
    .select('person_id')
    .in(
      'person_id',
      inShidduchim.map((person) => person.id),
    );
  const withFiles = new Set((fileRows ?? []).map((row) => row.person_id));

  const rows: ShidduchRow[] = inShidduchim.map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    status: person.marital_status as 'single' | 'divorced',
    age: person.birthday ? ageOn(person.birthday, now) : null,
    job: person.job,
    hasFile: withFiles.has(person.id),
  }));

  const noBirthday = rows.filter((row) => row.age === null).length;

  return (
    <>
      <ScreenHeader
        title="Shidduchim"
        subtitle={`${rows.length} ${rows.length === 1 ? 'man' : 'men'}`}
        back={{ href: '/more', label: 'More' }}
        action={
          <Link href="/more/people" className="text-[17px] text-accent">
            People
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {rows.length === 0 ? (
          <Empty>
            Nobody is marked single or divorced yet. Set a man&apos;s status on his own page and
            he will show up here.
          </Empty>
        ) : (
          <>
            <ShidduchList rows={rows} />
            {noBirthday > 0 ? (
              <p className="px-5 pt-3 text-[13px] text-ink-tertiary">
                {noBirthday === 1 ? 'One man has' : `${noBirthday} men have`} no birthday on
                file, so no age to sort by.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
