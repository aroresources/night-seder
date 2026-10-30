import type { Metadata } from 'next';

import { Legal, P, Section } from '@/components/legal';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms of the Ohr Mattisyahu text messaging program.',
};

/**
 * Public, for the same reason as the privacy policy. The carriers check for a
 * page titled "Terms & Conditions", an SMS section, the brand name, and the
 * "message and data rates may apply" disclosure, so all four are here.
 */
export default function TermsPage() {
  return (
    <Legal title="Terms &amp; Conditions">
      <P>
        These terms cover the text messaging program run by Ohr Mattisyahu for the men learning
        in its night seder and morning programs.
      </P>

      <Section title="SMS Terms">
        <P>
          By giving Ohr Mattisyahu your mobile number and agreeing to receive text messages, you
          consent to receive messages about the learning programs you are part of: reminders of
          start times, notice when a session is cancelled or rescheduled, and occasional
          announcements. Message frequency varies and is usually fewer than four messages a
          month.
        </P>
        <P>
          <strong>Message and data rates may apply.</strong> Carriers are not liable for delayed
          or undelivered messages.
        </P>
        <P>
          Agreeing to texts is not a condition of learning with us, and the same notices are
          given out at the shul.
        </P>
      </Section>

      <Section title="Stopping messages">
        <P>
          Reply STOP to any message and you will be removed at once and receive no further texts.
          Reply HELP for help, or speak to the program coordinator at Ohr Mattisyahu.
        </P>
      </Section>

      <Section title="Your information">
        <P>
          What we keep and how we use it is set out in our{' '}
          <a href="/privacy" className="text-accent underline">
            Privacy Policy
          </a>
          . We do not sell or share your SMS opt-in data or personal information with third
          parties for marketing purposes.
        </P>
      </Section>

      <Section title="Changes">
        <P>
          Ohr Mattisyahu may update these terms. The version on this page is the one that applies.
        </P>
      </Section>
    </Legal>
  );
}
