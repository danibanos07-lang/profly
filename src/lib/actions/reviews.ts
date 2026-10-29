"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { mapDbError } from "@/lib/moderation";
import { fieldErrors, reportSchema, reviewSchema, type ReviewInput } from "@/lib/validation";
import type { ActionResult } from "./result";
import type { Json } from "@/lib/supabase/database.types";

async function requireContributor() {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false as const, error: "notConfigured" as const };
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  if (!user.emailConfirmed) return { ok: false as const, error: "needsConfirmation" as const };
  if (user.isBanned) return { ok: false as const, error: "banned" as const };
  return { ok: true as const, supabase, user };
}

async function revalidateReviewTargets(professorCourseId: string) {
  const supabase = await getSupabase();
  if (!supabase) return;
  const { data } = await supabase
    .from("professor_course_directory")
    .select("professor_slug, course_slug")
    .eq("id", professorCourseId)
    .maybeSingle();
  if (data?.professor_slug && data.course_slug) {
    revalidatePath(`/professors/${data.professor_slug}`, "layout");
    revalidatePath(`/courses/${data.course_slug}`);
  }
  revalidatePath("/");
  revalidatePath("/dashboard");
}

export async function submitReview(input: ReviewInput): Promise<ActionResult<{ id: string; queued: boolean }>> {
  const ctx = await requireContributor();
  if (!ctx.ok) return { ok: false, error: ctx.error };

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput", fields: fieldErrors(parsed.error) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accepts_guidelines: _accepted, ...payload } = parsed.data;

  const { data: id, error } = await ctx.supabase.rpc("submit_review", { payload: payload as unknown as Json });
  if (error || !id) return { ok: false, error: mapDbError(error) };

  const { data: row } = await ctx.supabase.from("reviews").select("status").eq("id", id).maybeSingle();
  await revalidateReviewTargets(payload.professor_course_id);
  return { ok: true, data: { id, queued: row?.status !== "published" } };
}

export async function updateReview(reviewId: string, input: ReviewInput): Promise<ActionResult<{ queued: boolean }>> {
  const ctx = await requireContributor();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput", fields: fieldErrors(parsed.error) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accepts_guidelines: _accepted, ...payload } = parsed.data;

  const { data: existing } = await ctx.supabase
    .from("reviews")
    .select("id, professor_course_id, status")
    .eq("id", reviewId)
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "forbidden" };
  if (existing.status === "removed") return { ok: false, error: "notReviewable" };

  const { error } = await ctx.supabase.rpc("update_review", { p_review_id: reviewId, payload: payload as unknown as Json });
  if (error) return { ok: false, error: mapDbError(error) };
  const { data: row } = await ctx.supabase.from("reviews").select("status").eq("id", reviewId).maybeSingle();
  await revalidateReviewTargets(existing.professor_course_id);
  return { ok: true, data: { queued: row?.status === "under_review" } };
}

export async function deleteReview(reviewId: string): Promise<ActionResult> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: "notConfigured" };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const { data: existing } = await supabase
    .from("reviews")
    .select("professor_course_id")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "forbidden" };
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId).eq("user_id", user.id);
  if (error) return { ok: false, error: mapDbError(error) };
  await revalidateReviewTargets(existing.professor_course_id);
  return { ok: true };
}

export async function voteReview(reviewId: string, value: -1 | 0 | 1): Promise<ActionResult> {
  const ctx = await requireContributor();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (![-1, 0, 1].includes(value)) return { ok: false, error: "invalidInput" };
  const { error } = await ctx.supabase.rpc("cast_review_vote", { p_review_id: reviewId, p_value: value });
  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}

export async function reportReview(input: { review_id: string; reason: string; details?: string }): Promise<ActionResult> {
  const ctx = await requireContributor();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput", fields: fieldErrors(parsed.error) };
  const { error } = await ctx.supabase.from("review_reports").insert({
    review_id: parsed.data.review_id,
    reporter_id: ctx.user.id,
    reason: parsed.data.reason,
    details: parsed.data.details,
  });
  if (error) return { ok: false, error: error.code === "23505" ? "duplicateReview" : mapDbError(error) };
  return { ok: true };
}
