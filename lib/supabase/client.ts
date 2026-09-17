'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/types';
import { supabaseAnonKey, supabaseUrl } from './env';

type Client = ReturnType<typeof createBrowserClient<Database>>;

let client: Client | undefined;

/**
 * The browser client, created once. Screens read through Server Components;
 * this is for the writes that have to feel instant — tapping a name.
 */
export function supabaseBrowser(): Client {
  client ??= createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
  return client;
}
