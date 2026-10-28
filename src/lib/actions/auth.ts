"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { loginSchema, passwordSchema, profileSettingsSchema, signupSchema } from "@/lib/validation";

export type AuthState = { status: "idle" | "error" | "success"; message?: string; email?: string } | undefined;

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null | undefined) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : env.siteUrl;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "error", message: "notConfigured" };
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: "invalidCredentials" };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { status: "error", message: "emailNotConfirmed" };
    if (error.status === 429) return { status: "error", message: "rateLimited" };
    return { status: "error", message: "invalidCredentials" };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "error", message: "notConfigured" };
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name") || undefined,
  });
  if (!parsed.success) {
    const passwordIssue = parsed.error.issues.some((i) => i.path[0] === "password");
    return { status: "error", message: passwordIssue ? "passwordHint" : "genericError" };
  }
  const next = safeNext(formData.get("next"));
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { display_name: parsed.data.display_name, locale: formData.get("locale") === "en" ? "en" : "es" },
    },
  });
  if (error) {
    if (error.status === 429) return { status: "error", message: "rateLimited" };
    return { status: "error", message: "genericError" };
  }
  // Same response whether or not the email already exists (no account enumeration).
  return { status: "success", email: parsed.data.email };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await getSupabase();
  if (!supabase || !env.googleAuthEnabled) redirect("/login?error=google");
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "error", message: "notConfigured" };
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { status: "error", message: "genericError" };
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/callback?next=/auth/update-password`,
  });
  return { status: "success" };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "error", message: "notConfigured" };
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { status: "error", message: "passwordHint" };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { status: "error", message: error.status === 401 ? "linkInvalid" : "genericError" };
  return { status: "success" };
}

export async function signOut() {
  const supabase = await getSupabase();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateSettings(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: "error", message: "genericError" };
  const parsed = profileSettingsSchema.safeParse({
    campus_id: formData.get("campus_id") || null,
    preferred_locale: formData.get("preferred_locale"),
    display_name: formData.get("display_name") ?? undefined,
  });
  if (!parsed.success) return { status: "error", message: "genericError" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { status: "error", message: "genericError" };
  revalidatePath("/", "layout");
  return { status: "success" };
}

/** Permanently deletes the signed-in account (and, via cascades, its reviews). */
export async function deleteAccount(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase || !user) return { status: "error", message: "genericError" };
  const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
  if (confirmation !== "ELIMINAR" && confirmation !== "DELETE") return { status: "error", message: "confirm" };
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return { status: "error", message: "genericError" };
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/?account=deleted");
}
