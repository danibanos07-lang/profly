"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Browser Supabase client (singleton). Returns null when not configured. */
export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) return null;
  browserClient ??= createBrowserClient<Database>(env.supabaseUrl, env.supabaseKey);
  return browserClient;
}
