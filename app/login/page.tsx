'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';
import { Button, inputClasses } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setPending(false);
      return;
    }

    router.replace('/');
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col justify-center px-6 pb-16">
      <h1 className="mb-1 text-[28px] font-semibold">Night Seder</h1>
      <p className="mb-8 text-[15px] text-ink-secondary">Sign in to take attendance.</p>

      <form onSubmit={signIn} className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">Email</span>
          <input
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClasses}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[13px] text-ink-secondary">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClasses}
          />
        </label>

        {error ? (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="filled" disabled={pending} className="mt-2 w-full">
          {pending ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </main>
  );
}
