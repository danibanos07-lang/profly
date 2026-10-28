"use server";

import { headers } from "next/headers";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { getUniversityContext } from "@/lib/data/catalog";
import { cleanUserText } from "@/lib/moderation";
import { hitRateLimit } from "@/lib/rate-limit";
import { correctionSchema, suggestionSchema } from "@/lib/validation";
import { mapDbError } from "@/lib/moderation";
import type { Json } from "@/lib/supabase/database.types";

export type FormState = { status: "idle" | "error" | "success"; message?: string } | undefined;

export async function submitSuggestion(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase) return { status: "error", message: "notConfigured" };
  if (!user) return { status: "error", message: "unauthorized" };
  const raw = Object.fromEntries([...formData.entries()].map(([k, v]) => [k, typeof v === "string" ? cleanUserText(v) || undefined : undefined]));
  const parsed = suggestionSchema.safeParse(raw);
  if (!parsed.success) return { status: "error", message: "invalidInput" };
  const context = await getUniversityContext();
  if (!context) return { status: "error", message: "notConfigured" };
  const { kind, ...payload } = parsed.data;
  const { error } = await supabase.from("suggestions").insert({
    user_id: user.id,
    kind,
    university_id: context.university.id,
    payload: payload as Json,
  });
  if (error) return { status: "error", message: mapDbError(error) };
  return { status: "success" };
}

export async function submitCorrection(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await getSupabase();
  if (!supabase) return { status: "error", message: "notConfigured" };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  if (hitRateLimit(`correction:${ip}`, 5, 60 * 60 * 1000)) return { status: "error", message: "rateLimited" };
  // Honeypot: real users never fill this hidden field.
  if (formData.get("website")) return { status: "success" };
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { status: "error", message: "invalidInput" };
  const { error } = await supabase.from("correction_requests").insert({
    professor_id: parsed.data.professor_id ?? null,
    course_id: parsed.data.course_id ?? null,
    requester_name: parsed.data.requester_name,
    requester_email: parsed.data.requester_email,
    relationship: parsed.data.relationship,
    message: parsed.data.message,
  });
  if (error) return { status: "error", message: mapDbError(error) };
  return { status: "success" };
}
