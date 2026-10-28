/**
 * Central access to environment configuration. Public values are inlined at
 * build time by Next.js, so they must be referenced with their full names.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Supabase's new "publishable" key; the legacy anon key works the same way.
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  googleAuthEnabled: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true",
  defaultUniversitySlug: process.env.NEXT_PUBLIC_DEFAULT_UNIVERSITY_SLUG ?? "tec",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseKey);
}
