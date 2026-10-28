import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Supabase client bound to the current request's auth cookies. Every query
 * runs as the signed-in user (or anon), so Row Level Security always applies.
 * Returns null when Supabase has not been configured yet.
 */
export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** Per-request memoised client. */
export const getSupabase = cache(createClient);

export type SessionUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  role: Database["public"]["Enums"]["user_role"];
  displayName: string | null;
  hasUniversityEmail: boolean;
  isBanned: boolean;
  preferredLocale: string;
  campusId: string | null;
  universityId: string | null;
};

/** The verified current user and their private profile, or null. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, has_university_email, is_banned, preferred_locale, campus_id, university_id")
    .eq("id", data.user.id)
    .maybeSingle();
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    emailConfirmed: Boolean(data.user.email_confirmed_at),
    role: profile?.role ?? "student",
    displayName: profile?.display_name ?? null,
    hasUniversityEmail: profile?.has_university_email ?? false,
    isBanned: profile?.is_banned ?? false,
    preferredLocale: profile?.preferred_locale ?? "es",
    campusId: profile?.campus_id ?? null,
    universityId: profile?.university_id ?? null,
  };
});
