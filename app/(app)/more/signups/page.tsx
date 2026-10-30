import { SignupList, type SignupRow } from '@/components/signup-list';
import { Empty, ScreenHeader } from '@/components/ui';
import { toE164 } from '@/lib/phone';
import { getPeople } from '@/lib/queries';
import { supabaseServer } from '@/lib/supabase/server';
import type { SmsSignup } from '@/lib/types';

/**
 * What came in from the public form, waiting to be matched to a man.
 *
 * Nothing the form writes ticks anybody by itself — a page on the open
 * internet that could set a consent flag by guessing a phone number would let
 * anyone opt a man in. The match happens here, where you can see who it is.
 */
export default async function SignupsPage() {
  const supabase = await supabaseServer();
  const [{ data: signups }, people] = await Promise.all([
    supabase
      .from('sms_signups')
      .select('*')
      .is('handled_at', null)
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
      phone: signup.phone,
      createdAt: signup.created_at,
      match: match ?? null,
    };
  });

  return (
    <>
      <ScreenHeader
        title="Text signups"
        subtitle={`${rows.length} waiting`}
        back={{ href: '/more', label: 'More' }}
      />

      <div className="mx-auto w-full max-w-[480px] pb-tabbar">
        {rows.length === 0 ? (
          <Empty>
            Nothing waiting. Signups from the public form at /texts show up here to be matched to
            a man before he is ticked for texts.
          </Empty>
        ) : (
          <SignupList rows={rows} people={people.map((p) => ({ id: p.id, name: p.name }))} />
        )}
      </div>
    </>
  );
}
