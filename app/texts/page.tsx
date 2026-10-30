import type { Metadata } from 'next';

import { CONSENT_TEXT } from '@/lib/consent';
import { TextSignupForm } from '@/components/text-signup-form';

export const metadata: Metadata = {
  title: 'Text message signup',
  description:
    'Get texts from Ohr Mattisyahu about night seder and morning learning in Lakewood, NJ.',
};

/**
 * The call-to-action, in public.
 *
 * The A2P campaign has to point at a page a reviewer can open that shows
 * where and how a man gives his number — which is this. It is also how the
 * consent actually gets collected: the link goes round on WhatsApp, and men
 * put themselves on the list rather than being put on it.
 */
export default function TextsPage() {
  return (
    <main className="mx-auto w-full max-w-[560px] px-5 py-10">
      <h1 className="text-[28px] font-semibold">Text message signup</h1>
      <p className="mt-1 text-[15px] text-ink-secondary">
        Ohr Mattisyahu · 953 E. County Line Rd., Lakewood, NJ 08701
      </p>

      <p className="mt-6 text-[16px] leading-relaxed">
        Put your mobile number in below and we&apos;ll text you about night seder and the morning
        learning — what time things start, when a seder is cancelled or moved, and the occasional
        announcement.
      </p>

      <ul className="mt-4 list-disc pl-5 text-[16px] leading-relaxed text-ink-secondary">
        <li>Usually fewer than four messages a month.</li>
        <li>Message and data rates may apply.</li>
        <li>Reply STOP to any message to stop. Reply HELP for help.</li>
        <li>Learning with us doesn&apos;t depend on this — plenty prefer the WhatsApp group.</li>
      </ul>

      <TextSignupForm consentText={CONSENT_TEXT} />

      <p className="mt-8 text-[13px] text-ink-tertiary">
        Questions: <a href="mailto:tzvir@ohrmattisyahu.com">tzvir@ohrmattisyahu.com</a>
      </p>
    </main>
  );
}
