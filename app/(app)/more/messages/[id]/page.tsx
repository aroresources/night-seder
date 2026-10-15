import { notFound } from 'next/navigation';

import { Group, Row, ScreenHeader } from '@/components/ui';
import { formatShortDate } from '@/lib/dates';
import { getMessage, getPeople } from '@/lib/queries';

const STATUS_ORDER = { failed: 0, skipped: 1, sent: 2 } as const;

export default async function MessagePage(props: PageProps<'/more/messages/[id]'>) {
  const { id } = await props.params;
  const [detail, people] = await Promise.all([getMessage(id), getPeople()]);
  if (!detail) notFound();

  const names = new Map(people.map((person) => [person.id, person.name]));

  // Anything that went wrong first: that is what this page is for.
  const rows = [...detail.recipients].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (names.get(a.person_id) ?? '').localeCompare(names.get(b.person_id) ?? ''),
  );

  const sent = rows.filter((r) => r.status === 'sent').length;

  return (
    <>
      <ScreenHeader
        title="Message"
        subtitle={`${formatShortDate(detail.message.created_at.slice(0, 10))} · ${sent} sent`}
        back={{ href: '/more/messages', label: 'Messages' }}
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        <Group title={detail.message.audience ?? 'Sent to'}>
          <Row>
            <p className="text-[15px] whitespace-pre-wrap">{detail.message.body}</p>
          </Row>
        </Group>

        <Group title={`Recipients (${rows.length})`}>
          {rows.map((row) => (
            <Row key={row.id}>
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {names.get(row.person_id) ?? 'Removed'}
              </span>
              <span
                className={`shrink-0 text-[13px] ${
                  row.status === 'sent' ? 'text-ink-tertiary' : 'text-danger'
                }`}
              >
                {row.status === 'sent' ? 'sent' : (row.error ?? row.status)}
              </span>
            </Row>
          ))}
        </Group>
      </div>
    </>
  );
}
