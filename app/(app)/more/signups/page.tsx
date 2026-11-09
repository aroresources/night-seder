import { SignupList, SubscribedList, type SignupRow } from '@/components/signup-list';
import { Empty, ScreenHeader } from '@/components/ui';
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
      // Handled rows are gone from view, except the ones that are on the
      // list in their own right — those have to stay visible to be stopped.
      .or('handled_at.is.null,subscribed.is.true')
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
    };
  });

  const waiting = rows.filter((row) => !row.subscribed);
  const subscribed = rows.filter((row) => row.subscribed);
  const justNames = people.map((p) => ({ id: p.id, name: p.name }));

  return (
    <>
      <ScreenHeader
        title="Text signups"
        subtitle={
          subscribed.length > 0
            ? `${waiting.length} waiting · ${subscribed.length} unnamed`
            : `${waiting.length} waiting`
        }
        back={{ href: '/more', label: 'More' }}
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {rows.length === 0 ? (
          <Empty>
            Nothing waiting. A man who texts JOIN from a number you hold is ticked straight
            away; anyone else shows up here to be dealt with.
          </Empty>
        ) : (
          <>
            {waiting.length > 0 ? <SignupList rows={waiting} people={justNames} /> : null}
            {subscribed.length > 0 ? (
              <SubscribedList rows={subscribed} people={justNames} />
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
