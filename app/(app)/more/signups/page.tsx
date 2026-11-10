import {
  DismissedList,
  SignupList,
  SubscribedList,
  type SignupRow,
} from '@/components/signup-list';
import { Group, LinkRow, Row, ScreenHeader } from '@/components/ui';
import { formatForDisplay, toE164 } from '@/lib/phone';
import { getPeople } from '@/lib/queries';
import { supabaseServer } from '@/lib/supabase/server';
import type { SmsSignup } from '@/lib/types';

/**
 * What came in from a JOIN text or the public form, waiting to be dealt with.
 *
 * Nothing out there ticks anybody by itself — a page on the open internet
 * that could set a consent flag by guessing a phone number would let anyone
 * opt a man in. The decision happens here, where you can see who it is.
 *
 * Two lists, because there are two answers. Most numbers turn out to be a
 * man you hold, and he gets ticked. The rest are numbers nobody can name:
 * they can still have the texts, as a bare number with its own consent
 * record, and they are kept apart so they are never mistaken for members.
 */
export default async function SignupsPage() {
  const supabase = await supabaseServer();
  const [{ data: signups }, people] = await Promise.all([
    supabase
      .from('sms_signups')
      .select('*')
      // Handled rows are gone from view, except two kinds that have to stay:
      // the ones on the list in their own right, so they can be stopped, and
      // the ones dismissed without being matched, so a mis-tap is undoable.
      // Dismissing is one button away from ticking and deletes nothing.
      .or('handled_at.is.null,subscribed.is.true,person_id.is.null')
      .order('created_at', { ascending: true }),
    getPeople(),
  ]);

  // Matched on the number, which is the thing he typed that we also hold.
  // Spelling varies; a phone number does not.
  const byPhone = new Map<string, { id: string; name: string; optedIn: boolean }>();
  for (const person of people) {
    const e164 = toE164(person.phone);
    if (e164 && !byPhone.has(e164)) {
      byPhone.set(e164, { id: person.id, name: person.name, optedIn: person.sms_opt_in });
    }
  }

  const rows: SignupRow[] = ((signups ?? []) as SmsSignup[]).map((signup) => {
    const e164 = toE164(signup.phone);
    const match = e164 ? byPhone.get(e164) : undefined;
    return {
      id: signup.id,
      name: [signup.first_name, signup.last_name].filter(Boolean).join(' '),
      phone: e164 ? formatForDisplay(e164) : signup.phone,
      createdAt: signup.created_at,
      match: match ?? null,
      subscribed: signup.subscribed,
      optedOut: signup.opted_out,
      dismissed: signup.handled_at !== null && !signup.subscribed,
    };
  });

  const waiting = rows.filter((row) => !row.subscribed && !row.dismissed);
  const subscribed = rows.filter((row) => row.subscribed);
  const dismissed = rows.filter((row) => row.dismissed);
  const justNames = people.map((p) => ({ id: p.id, name: p.name }));

  // Who is actually on the list. The question "who gets a text if I send one
  // now?" had no answer anywhere before this: ticks were scattered one per
  // man across two hundred pages, so there was no way to see the whole list.
  const onTheList = people
    .filter((person) => person.active && person.sms_opt_in && !person.sms_opt_out)
    .map((person) => {
      const e164 = toE164(person.phone);
      return {
        id: person.id,
        name: person.name,
        phone: e164 ? formatForDisplay(e164) : (person.phone ?? ''),
        // A tick is not a working number. Worth seeing here rather than
        // discovering it in a send report.
        unusable: !e164,
      };
    });

  const askedToStop = people.filter((person) => person.active && person.sms_opt_out);
  const total = onTheList.length + subscribed.length;

  return (
    <>
      <ScreenHeader
        title="Text signups"
        subtitle={
          waiting.length > 0
            ? `${total} on the list · ${waiting.length} waiting`
            : `${total} on the list`
        }
        back={{ href: '/more', label: 'More' }}
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {/* What needs doing comes first; the list it feeds comes next; the
            two sets of leftovers sit below both. */}
        {waiting.length > 0 ? <SignupList rows={waiting} people={justNames} /> : null}

        <Group
          title={`On the text list (${total})`}
          footer="Everyone here gets a message sent to Everyone. Tap a man to untick him."
        >
          {total === 0 ? (
            <Row>
              <p className="text-[15px] text-ink-secondary">
                Nobody yet. A man joins by texting JOIN to the shul&rsquo;s number.
              </p>
            </Row>
          ) : (
            <>
              {onTheList.map((person) => (
                <LinkRow
                  key={person.id}
                  href={`/more/people/${person.id}`}
                  detail={person.unusable ? 'no usable number' : person.phone}
                >
                  <span className="truncate text-[15px]">{person.name}</span>
                </LinkRow>
              ))}
              {subscribed.map((row) => (
                <Row key={row.id}>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{row.phone}</span>
                  <span className="shrink-0 text-[13px] text-ink-tertiary">no name</span>
                </Row>
              ))}
            </>
          )}
        </Group>

        {subscribed.length > 0 ? <SubscribedList rows={subscribed} people={justNames} /> : null}
        {dismissed.length > 0 ? <DismissedList rows={dismissed} people={justNames} /> : null}

        {askedToStop.length > 0 ? (
          <Group
            title={`Asked to stop (${askedToStop.length})`}
            footer="They replied STOP. Nothing is sent to them, and only they can undo it by texting JOIN."
          >
            {askedToStop.map((person) => (
              <LinkRow key={person.id} href={`/more/people/${person.id}`}>
                <span className="truncate text-[15px]">{person.name}</span>
              </LinkRow>
            ))}
          </Group>
        ) : null}
      </div>
    </>
  );
}
