import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';

/**
 * Runs before every page request: refreshes the Supabase session cookie and
 * keeps signed-out visitors on /login.
 *
 * In Next.js 16 this file is `proxy.ts`; it was called `middleware.ts` in
 * earlier versions, which is what the Supabase docs still show.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // Responses that set auth cookies must not be cached.
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // getUser() revalidates with Supabase; getSession() would trust the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const onLogin = pathname === '/login';

  if (!user && !onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return redirectKeepingCookies(url, response);
  }

  if (user && onLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return redirectKeepingCookies(url, response);
  }

  return response;
}

/** A redirect still has to carry the refreshed session cookies. */
function redirectKeepingCookies(url: URL, from: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the PWA files, which never need a
     * session and shouldn't pay for a network round-trip.
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|apple-touch-icon.png).*)',
  ],
};
