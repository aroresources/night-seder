import { notFound } from 'next/navigation';

import { Group, Row, ScreenHeader } from '@/components/ui';
import { formatShortDate } from '@/lib/dates';
import { formatForDisplay, toE164 } from '@/lib/phone';
import { getMessage, getPeople } from '@/lib/queries';
import type { MessageRecipient } from '@/lib/types';

const STATUS_ORDER = { failed: 0, skipped: 1, sent: 2 } as const;

export default async function MessagePage(props: PageProps<'/more/messages/[id]'>) {
  const { id } = await props.params;
  const [detail, people] = await Promise.all([getMessage(id), getPeople()]);
  if (!detail) notFound();

  const names = new Map(people.map((person) => [person.id, person.name]));

  /**
   * Who this went to. A recipient is a man, or a number nobody has named —
   * and a number is shown as the number, since that is all there is to say.
   */
  function label(row: MessageRecipient): string {
    if (row.person_id) return names.get(row.person_id) ?? 'Removed';
    const e164 = toE164(row.phone);
    return e164 ? formatForDisplay(e164) : (row.phone ?? 'Unnamed number');
  }

  // Anything that went wrong first: that is what this page is for.
  const rows = [...detail.recipients].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || label(a).localeCompare(label(b)),
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
                {label(row)}
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
