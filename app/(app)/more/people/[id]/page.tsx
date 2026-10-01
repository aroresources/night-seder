import Link from 'next/link';
import { notFound } from 'next/navigation';

import { snoozeForDays } from '@/app/actions/contact';
import { deletePerson, setPersonActive, setTrackContact } from '@/app/actions/people';
import { ContactLog, SnoozeButtons } from '@/components/contact-log';
import { Chip, Group, Row, ScreenHeader } from '@/components/ui';
import {
  attendanceByPerson,
  heldDates,
  heldDatesInRange,
  missedStreak,
  personStats,
  type PersonWindow,
} from '@/lib/attendance';
import { formatCompactDate, formatShortDate, minDate, today } from '@/lib/dates';
import { formatCents } from '@/lib/money';
import {
  getAllAttendance,
  getCorrespondence,
  getCurrentZman,
  getPerson,
  getSettings,
} from '@/lib/queries';

export default async function PersonPage(props: PageProps<'/more/people/[id]'>) {
  const { id } = await props.params;
  const now = today();

  const [person, settings, zman, nightAttendance, dafAttendance, entries] = await Promise.all([
    getPerson(id),
    getSettings(),
    getCurrentZman(),
    getAllAttendance('night_attendance'),
    getAllAttendance('daf_attendance'),
    getCorrespondence(id),
  ]);
  if (!person) notFound();

  const window: PersonWindow = {
    id: person.id,
    start_date: person.start_date,
    end_date: person.end_date,
  };

  const nightByPerson = attendanceByPerson(nightAttendance).get(id);
  const dafByPerson = attendanceByPerson(dafAttendance).get(id);

  const nightHeldAll = heldDates(nightAttendance);
  const dafHeldAll = heldDates(dafAttendance);

  const zmanStats = zman
    ? personStats(
        window,
        heldDatesInRange(nightAttendance, zman.start_date, minDate(zman.end_date, now)),
        nightByPerson,
      )
    : null;
  const allTime = personStats(window, nightHeldAll, nightByPerson);
  const dafStats = personStats(window, dafHeldAll, dafByPerson);

  const nightStreak = missedStreak(window, nightHeldAll, nightByPerson);
  const dafStreak = missedStreak(window, dafHeldAll, dafByPerson);

  const recent = [
    ...[...(nightByPerson ?? [])].map((date) => ({ date, program: 'Night' })),
    ...[...(dafByPerson ?? [])].map((date) => ({ date, program: 'Daf' })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 20);

  const hasHistory =
    (nightByPerson?.size ?? 0) > 0 || (dafByPerson?.size ?? 0) > 0 || entries.length > 0;

  return (
    <>
      <ScreenHeader
        title={person.name}
        subtitle={[
          person.role === 'rabbi' ? 'Rabbi' : 'Working',
          person.active ? null : 'inactive',
        ]
          .filter(Boolean)
          .join(' · ')}
        action={
          <Link href={`/more/people/${id}/edit`} className="text-[17px] text-accent">
            Edit
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <Group title="Attendance">
          {zman && zmanStats ? (
            <Row>
              <span className="flex-1 text-[15px]">{zman.name}</span>
              <span className="text-[15px] tabular-nums text-ink-secondary">
                {zmanStats.attended}/{zmanStats.expected} · {zmanStats.percent}%
              </span>
            </Row>
          ) : null}
          <Row>
            <span className="flex-1 text-[15px]">Night seder, all time</span>
            <span className="text-[15px] tabular-nums text-ink-secondary">
              {allTime.attended}/{allTime.expected} · {allTime.percent}%
            </span>
          </Row>
          <Row>
            <span className="flex-1 text-[15px]">Daf</span>
            <span className="text-[15px] tabular-nums text-ink-secondary">
              {dafStats.attended}/{dafStats.expected} · {dafStats.percent}%
            </span>
          </Row>
          {person.gets_paid ? (
            <Row>
              <span className="flex-1 text-[15px]">Gets paid</span>
              <Link href="/more/payments" className="text-[15px] text-accent">
                {person.monthly_amount_cents != null
                  ? `${formatCents(person.monthly_amount_cents)} a month`
                  : 'No usual amount'}
              </Link>
            </Row>
          ) : null}
          <Row>
            <span className="flex-1 text-[15px]">Member since</span>
            <span className="text-[15px] text-ink-secondary">
              {formatShortDate(person.start_date)}
              {person.end_date ? ` – ${formatShortDate(person.end_date)}` : ''}
            </span>
          </Row>
        </Group>

        <Group title="Contact">
          {person.phone ? (
            <Row>
              <span className="flex-1 text-[15px]">Phone</span>
              <a href={`tel:${person.phone}`} className="text-[15px] text-accent">
                {person.phone}
              </a>
            </Row>
          ) : null}
          {person.email ? (
            <Row>
              <span className="flex-1 text-[15px]">Email</span>
              <a
                href={`mailto:${person.email}`}
                className="truncate text-[15px] text-accent"
              >
                {person.email}
              </a>
            </Row>
          ) : null}
          <Row>
            <span className="flex-1 text-[15px]">Last contact</span>
            <span className="text-[15px] text-ink-secondary">
              {entries[0] ? formatShortDate(entries[0].date) : 'Never'}
            </span>
          </Row>
          <Row>
            <span className="flex-1 text-[15px]">Missed streak</span>
            <div className="flex gap-1.5">
              {person.in_night_seder ? (
                <Chip tone={nightStreak >= settings.night_absence_threshold ? 'accent' : 'plain'}>
                  {nightStreak} nights
                </Chip>
              ) : null}
              {person.in_daf ? (
                <Chip tone={dafStreak >= settings.daf_absence_threshold ? 'accent' : 'plain'}>
                  {dafStreak} Daf
                </Chip>
              ) : null}
            </div>
          </Row>
          <Row>
            <div className="flex-1">
              {person.snoozed_until ? (
                <span className="text-[15px] text-ink-secondary">
                  Snoozed until {formatShortDate(person.snoozed_until)}
                </span>
              ) : (
                <span className="text-[15px]">Snooze</span>
              )}
            </div>
            <SnoozeButtons
              personId={person.id}
              snoozedUntil={person.snoozed_until}
              onSnooze={snoozeForDays}
            />
          </Row>
          <Row>
            <span className="flex-1 text-[15px]">
              {person.track_contact ? 'Shown on Contact' : 'Hidden from Contact'}
            </span>
            <form action={setTrackContact.bind(null, id, !person.track_contact)}>
              <button type="submit" className="min-h-[2.75rem] px-2 text-[15px] text-accent">
                {person.track_contact ? 'Hide' : 'Show'}
              </button>
            </form>
          </Row>
        </Group>

        <ContactLog personId={person.id} entries={entries} />

        <Group title="Last 20 sessions">
          {recent.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">Nothing recorded yet.</p>
          ) : (
            recent.map((item) => (
              <Row key={`${item.program}-${item.date}`}>
                <span className="flex-1 text-[15px]">{formatCompactDate(item.date)}</span>
                <span className="text-[13px] text-ink-secondary">{item.program}</span>
              </Row>
            ))
          )}
        </Group>

        {person.notes ? (
          <Group title="Notes">
            <Row>
              <p className="text-[15px] whitespace-pre-wrap">{person.notes}</p>
            </Row>
          </Group>
        ) : null}

        <Group
          title="Membership"
          footer={
            hasHistory
              ? 'He has history, so he can only be made inactive, never deleted.'
              : undefined
          }
        >
          <form action={setPersonActive.bind(null, id, !person.active)}>
            <button
              type="submit"
              className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-accent active:bg-surface-pressed"
            >
              {person.active ? 'Make inactive' : 'Reactivate'}
            </button>
          </form>

          {!hasHistory ? (
            <form action={deletePerson.bind(null, id)}>
              <button
                type="submit"
                className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-danger active:bg-surface-pressed"
              >
                Delete
              </button>
            </form>
          ) : null}
        </Group>
      </div>
    </>
  );
}
