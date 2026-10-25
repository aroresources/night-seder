import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  addZmanDayOff,
  copyPairings,
  deleteZman,
  removeZmanDayOff,
} from '@/app/actions/zmanim';
import { PairBuilder } from '@/components/pair-builder';
import { PairingsList, type PairRow } from '@/components/pairings-list';
import { Button, Group, Row, ScreenHeader, inputClasses } from '@/components/ui';
import { scheduledNights } from '@/lib/attendance';
import { formatCompactDate, formatShortDate, today } from '@/lib/dates';
import { getPairs, getPeople, getZman, getZmanDaysOff, getZmanim } from '@/lib/queries';

export default async function ZmanPage(props: PageProps<'/more/zmanim/[id]'>) {
  const { id } = await props.params;

  const [zman, daysOff, pairs, people, allZmanim] = await Promise.all([
    getZman(id),
    getZmanDaysOff(id),
    getPairs(id),
    getPeople(),
    getZmanim(),
  ]);
  if (!zman) notFound();

  const peopleById = new Map(people.map((person) => [person.id, person]));
  const pairedIds = new Set(pairs.flatMap((pair) => pair.members.map((m) => m.person_id)));

  const pickable = people
    .filter((person) => person.active && person.in_night_seder)
    .map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      paired: pairedIds.has(person.id),
    }));
  const unpaired = pickable.filter((person) => !person.paired);

  // Resolved here, where the people are already loaded: the list itself only
  // ever needs the names.
  const pairRows: PairRow[] = pairs.map((pair) => ({
    id: pair.id,
    label: pair.label,
    members: pair.members
      .map((member) => peopleById.get(member.person_id))
      .filter((person) => person !== undefined)
      .map((person) => ({ id: person.id, name: person.name, role: person.role })),
  }));

  const nightsTotal = scheduledNights(zman, daysOff).length;
  const otherZmanim = allZmanim.filter((other) => other.id !== id);

  return (
    <>
      <ScreenHeader
        title={zman.name}
        subtitle={`${formatShortDate(zman.start_date)} – ${formatShortDate(zman.end_date)} · ${nightsTotal} nights`}
        action={
          <Link href={`/more/zmanim/${id}/edit`} className="text-[17px] text-accent">
            Edit
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <PairBuilder zmanId={id} people={pickable} />

        <PairingsList zmanId={id} pairs={pairRows} pickable={pickable} />
        <Group title="Still unpaired">
          {unpaired.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">Everybody is paired.</p>
          ) : (
            unpaired.map((person) => (
              <Row key={person.id}>
                <span className="flex-1 text-[15px]">{person.name}</span>
                <span className="text-[13px] text-ink-tertiary">
                  {person.role === 'rabbi' ? 'R' : 'W'}
                </span>
              </Row>
            ))
          )}
        </Group>

        {otherZmanim.length > 0 ? (
          <section className="px-4">
            <h2 className="px-1 pt-5 pb-2 text-[13px] font-medium text-ink-secondary">
              Copy pairings from
            </h2>
            <form action={copyPairings.bind(null, id)} className="rounded-xl bg-surface p-4">
              <select name="source_zman_id" className={`${inputClasses} mb-3`} aria-label="Zman">
                {otherZmanim.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="filled">
                Copy pairs
              </Button>
              <p className="pt-2 text-[13px] text-ink-secondary">
                Anyone no longer active is skipped.
              </p>
            </form>
          </section>
        ) : null}

        {/* Days off ------------------------------------------------------ */}
        <section className="px-4 pt-4">
          <form action={addZmanDayOff.bind(null, id)}>
            <div className="flex flex-col gap-3 rounded-xl bg-surface p-4">
              <label className="block">
                <span className="mb-1 block text-[13px] text-ink-secondary">Day off</span>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={today()}
                  min={zman.start_date}
                  max={zman.end_date}
                  className={inputClasses}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] text-ink-secondary">Reason (optional)</span>
                <input name="reason" placeholder="For example Sukkos" className={inputClasses} />
              </label>
              <div>
                <Button type="submit" variant="filled">
                  Add day off
                </Button>
              </div>
            </div>
          </form>
        </section>

        <Group
          title="Days off"
          footer="Adding a day off never deletes attendance. It only takes that night out of the expected count."
        >
          {daysOff.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">No days off yet.</p>
          ) : (
            daysOff.map((day) => (
              <Row key={day.id}>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px]">{formatCompactDate(day.date)}</p>
                  {day.reason ? (
                    <p className="truncate text-[13px] text-ink-secondary">{day.reason}</p>
                  ) : null}
                </div>
                <form action={removeZmanDayOff.bind(null, day.id)}>
                  <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-danger">
                    Delete
                  </button>
                </form>
              </Row>
            ))
          )}
        </Group>

        <Group title="Danger">
          <form action={deleteZman.bind(null, id)}>
            <button
              type="submit"
              className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-danger active:bg-surface-pressed"
            >
              Delete this zman
            </button>
          </form>
        </Group>
      </div>
    </>
  );
}
