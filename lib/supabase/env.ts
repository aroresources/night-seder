/**
 * The environment variables the app needs.
 *
 * The publishable anon key is what every ordinary request uses, so RLS does
 * the deciding. The service-role key is the one exception and lives in
 * `admin.ts`: it bypasses RLS and is read only by the texting webhook, which
 * has no signed-in user to carry. It must never be NEXT_PUBLIC_.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in your Supabase project URL and anon key.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
