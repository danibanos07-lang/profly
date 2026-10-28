"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase/server";
import { isLocale, LOCALE_COOKIE } from "./config";

export async function setLocale(locale: string) {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const supabase = await getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ preferred_locale: locale }).eq("id", data.user.id);
  }
  revalidatePath("/", "layout");
}
