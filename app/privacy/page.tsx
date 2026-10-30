import type { Metadata } from 'next';

import { Legal, P, Section } from '@/components/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Ohr Mattisyahu uses the information it keeps about its members.',
};

/**
 * Public, because the A2P campaign registration links to it and the carriers
 * check that it opens for anyone.
 *
 * The wording the carriers look for is deliberate: a page titled "Privacy
 * Policy", the registered brand name, what is collected, and the sentence
 * about not selling or sharing SMS opt-in data, verbatim.
 */
export default function PrivacyPage() {
  return (
    <Legal title="Privacy Policy">
      <P>
        This policy covers the text messaging program run by Ohr Mattisyahu for the men learning
        in its night seder and morning programs.
      </P>

      <Section title="What we collect">
        <P>
          For each man learning with us we keep his name, his mobile number where he has given
          one, and may keep an email address, a postal address and a date of birth. We record
          which sessions he attended, and a note of when someone from the shul was last in touch
          with him.
        </P>
      </Section>

      <Section title="How we use it">
        <P>
          We use it to run the learning programs: to know who is expected, to see who has not
          been coming, and to get in touch. Mobile numbers are used to send reminders of start
          times, notice when a session is cancelled or rescheduled, and occasional announcements
          about the program.
        </P>
      </Section>

      <Section title="Who we share it with">
        <P>
          <strong>
            We do not sell or share your SMS opt-in data or personal information with third
            parties for marketing purposes.
          </strong>{' '}
          Text messages are delivered by Twilio acting on our behalf, and the records are kept in
          a database hosted by Supabase. Neither uses the information for anything but providing
          that service to us. We share nothing with anybody else except where the law requires it.
        </P>
      </Section>

      <Section title="Text messages">
        <P>
          Nobody is added without having said yes. You can stop at any time by replying STOP to
          any message, and you will receive no further texts from us. Reply HELP for help.
          Message and data rates may apply.
        </P>
      </Section>

      <Section title="How long we keep it">
        <P>
          We keep attendance records for as long as the shul finds them useful. Ask us to remove
          your details and we will.
        </P>
      </Section>

      <Section title="Questions">
        <P>
          Ohr Mattisyahu, 953 E. County Line Rd., Lakewood, NJ 08701.{' '}
          <a href="mailto:tzvir@ohrmattisyahu.com" className="text-accent underline">
            tzvir@ohrmattisyahu.com
          </a>
        </P>
      </Section>
    </Legal>
  );
}
