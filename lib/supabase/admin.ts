import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/lib/types';
import { supabaseUrl } from './env';

/**
 * A Supabase client that is not a person.
 *
 * Every other client in this app carries the signed-in user's cookies, so
 * row-level security does the deciding. A webhook has no user: Twilio posts
 * to us with no session at all, which lands as the `anon` role. `people` is
 * granted to `authenticated` only, so that read comes back as an empty list —
 * *not* an error — and the caller quietly concludes it holds no such number.
 * That is exactly what went wrong: five men texted JOIN, were told they were
 * on the list, and were never ticked.
 *
 * So this client uses the service-role key, which bypasses RLS entirely.
 * That is a real weapon, and it is handled accordingly:
 *
 *   - `server-only`, so importing it from a client component fails the build
 *     rather than shipping the key to a browser.
 *   - The key is read from SUPABASE_SERVICE_ROLE_KEY. Never NEXT_PUBLIC_
 *     anything; that prefix is what puts a value in the browser bundle.
 *   - One caller: app/api/sms/route.ts, which refuses the request before
 *     reaching here unless Twilio's signature checks out.
 *
 * If you find yourself importing this somewhere else, use `supabaseServer()`
 * instead and let RLS do its job.
 */
export function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. The texting webhook needs it to look a ' +
        'number up without a signed-in user.',
    );
  }

  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Whether the webhook can do its job, so it can say so rather than guess. */
export function adminConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
