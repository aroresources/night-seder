import Link from 'next/link';
import { notFound } from 'next/navigation';

import { snoozeForDays } from '@/app/actions/contact';
import { ContactLog, SnoozeButtons } from '@/components/contact-log';
import { Chip, Group, Row, ScreenHeader } from '@/components/ui';
import { loadContactData } from '@/lib/contact-data';
import { formatShortDate } from '@/lib/dates';

export default async function ContactPersonPage(props: PageProps<'/contact/[id]'>) {
  const { id } = await props.params;
  const { rows, entriesByPerson, people } = await loadContactData();

  const person = people.find((p) => p.id === id);
  const row = rows.find((r) => r.id === id);
  if (!person || !row) notFound();

  const entries = entriesByPerson.get(id) ?? [];

  return (
    <>
      <ScreenHeader
        title={person.name}
        subtitle={person.role === 'rabbi' ? 'Rabbi' : 'Working'}
        action={
          <Link href="/contact" className="text-[17px] text-accent">
            Contact
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <Group title="Status">
          {row.reasons.length > 0 ? (
            <Row>
              <div className="flex flex-wrap gap-1.5">
                {row.reasons.map((reason) => (
                  <Chip key={reason.kind} tone="accent">
                    {reason.label}
                  </Chip>
                ))}
              </div>
            </Row>
          ) : null}

          {row.reasons.map((reason) =>
            reason.detail ? (
              <Row key={`${reason.kind}-detail`}>
                <span className="text-[15px] text-ink-secondary">{reason.detail}</span>
              </Row>
            ) : null,
          )}

          <Row>
            <span className="flex-1 text-[15px]">Last contact</span>
            <span className="text-[15px] text-ink-secondary">
              {row.lastContact ? formatShortDate(row.lastContact.date) : 'Never'}
            </span>
          </Row>

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
              <a href={`mailto:${person.email}`} className="truncate text-[15px] text-accent">
                {person.email}
              </a>
            </Row>
          ) : null}

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
        </Group>

        <ContactLog personId={person.id} entries={entries} />

        <div className="px-4 pt-5">
          <Link href={`/more/people/${person.id}`} className="text-[17px] text-accent">
            Open full profile
          </Link>
        </div>
      </div>
    </>
  );
}
