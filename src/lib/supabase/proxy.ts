import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/reviews/new", "/suggest"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * signed-out visitors away from account-only pages. Role checks for /admin
 * happen again on the server in the admin layout and in the database.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it would
  // make session refresh flaky.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims?.sub);

  const path = request.nextUrl.pathname;
  if (!isSignedIn && PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  return response;
}
