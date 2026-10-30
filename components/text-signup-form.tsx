'use client';

import { useState, useTransition } from 'react';

import { signUpForTexts } from '@/app/actions/signups';

const field =
  'w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-[16px]';

/**
 * The form on the public page. Deliberately plain: it is opened by a man on
 * his phone from a WhatsApp link, fills in three boxes, and never comes back.
 */
export function TextSignupForm({ consentText }: { consentText: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="mt-6 rounded-xl bg-surface p-5">
        <p className="text-[17px] font-semibold">Thank you — you&apos;re on the list.</p>
        <p className="mt-2 text-[15px] text-ink-secondary">
          You&apos;ll start getting messages about night seder and morning learning. You can stop
          any time by replying STOP to one of them.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await signUpForTexts(form);
          if (result.ok) setDone(true);
          else setError(result.error ?? 'Something went wrong.');
        });
      }}
      className="mt-6 flex flex-col gap-4"
    >
      {/* Hidden from people, irresistible to scripts. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      <label className="block">
        <span className="mb-1 block text-[15px]">First name</span>
        <input name="first_name" autoComplete="given-name" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-[15px]">Last name</span>
        <input name="last_name" required autoComplete="family-name" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-[15px]">Mobile number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="732-555-0101"
          className={field}
        />
      </label>

      <label className="flex items-start gap-3 rounded-xl bg-surface p-4">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
        />
        <span className="text-[15px] leading-relaxed">
          {consentText}{' '}
          <a href="/privacy" className="text-accent underline">
            Privacy Policy
          </a>{' '}
          and{' '}
          <a href="/terms" className="text-accent underline">
            Terms
          </a>
          .
        </span>
      </label>

      {error ? <p className="text-[15px] text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-[2.75rem] rounded-xl bg-accent px-4 text-[17px] text-on-accent disabled:opacity-40"
      >
        {pending ? 'Sending…' : 'Sign me up'}
      </button>
    </form>
  );
}
