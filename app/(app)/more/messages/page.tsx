import Link from 'next/link';

import { MessageComposer, type Recipient } from '@/components/message-composer';
import { Group, Row, ScreenHeader } from '@/components/ui';
import { formatShortDate } from '@/lib/dates';
import { getGroupMembership, getGroups, getMessages, getPeople } from '@/lib/queries';
import { smsConfigured } from '@/lib/sms';

export default async function MessagesPage() {
  const [people, groups, membership, history] = await Promise.all([
    getPeople(),
    getGroups(),
    getGroupMembership(),
    getMessages(),
  ]);

  const recipients: Recipient[] = people
    .filter((person) => person.active)
    .map((person) => ({
      id: person.id,
      name: person.name,
      phone: person.phone,
      inNight: person.in_night_seder,
      inDaf: person.in_daf,
      inShachris: person.in_shachris,
      inMisc: person.in_misc,
      optedIn: person.sms_opt_in,
      optedOut: person.sms_opt_out,
      groupIds: membership.get(person.id) ?? [],
    }));

  return (
    <>
      <ScreenHeader
        title="Messages"
        subtitle="One text each, never a group thread"
        back={{ href: '/more', label: 'More' }}
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <MessageComposer
          recipients={recipients}
          groups={groups}
          configured={smsConfigured()}
        />

        <Group title="Sent">
          {history.length === 0 ? (
            <p className="px-4 py-3 text-[15px] text-ink-secondary">Nothing sent yet.</p>
          ) : (
            history.map((entry) => (
              <Link
                key={entry.message.id}
                href={`/more/messages/${entry.message.id}`}
                className="block px-4 py-3 active:bg-surface-pressed"
              >
                <p className="truncate text-[15px]">{entry.message.body}</p>
                <p className="mt-1 text-[13px] text-ink-secondary">
                  {formatShortDate(entry.message.created_at.slice(0, 10))}
                  {entry.message.audience ? ` · ${entry.message.audience}` : ''} · {entry.sent} sent
                  {entry.failed > 0 ? `, ${entry.failed} failed` : ''}
                  {entry.skipped > 0 ? `, ${entry.skipped} skipped` : ''}
                </p>
              </Link>
            ))
          )}
        </Group>

        <Group title="How this works">
          <Row>
            <p className="text-[13px] text-ink-secondary">
              Everyone gets his own text, so nobody sees anyone else&apos;s number. Sends are kept
              out of the contact log on purpose — texting everyone shouldn&apos;t make it look
              like you spoke to all of them. Anyone who replies STOP is remembered and skipped
              from then on.
            </p>
          </Row>
        </Group>
      </div>
    </>
  );
}
