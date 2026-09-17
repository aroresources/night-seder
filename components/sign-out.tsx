'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';

export function SignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await supabaseBrowser().auth.signOut();
        router.replace('/login');
        router.refresh();
      }}
      className="flex min-h-[2.75rem] w-full items-center px-4 py-2.5 text-left text-[17px] text-danger active:bg-surface-pressed"
    >
      {pending ? 'Signing out' : 'Sign out'}
    </button>
  );
}
