"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { mapDbError } from "@/lib/moderation";
import { MAX_COMPARE } from "@/lib/constants";
import type { ActionResult } from "./result";

const target = z.union([z.object({ professorId: z.uuid() }), z.object({ courseId: z.uuid() })]);

export async function toggleBookmark(input: { professorId: string } | { courseId: string }): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: "notConfigured" };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = target.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };

  const column = "professorId" in parsed.data ? "professor_id" : "course_id";
  const id = "professorId" in parsed.data ? parsed.data.professorId : parsed.data.courseId;
  const { data: existing } = await supabase.from("bookmarks").select("id").eq("user_id", user.id).eq(column, id).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("bookmarks").delete().eq("id", existing.id);
    if (error) return { ok: false, error: mapDbError(error) };
    revalidatePath("/dashboard");
    return { ok: true, data: { saved: false } };
  }
  const { error } = await supabase
    .from("bookmarks")
    .insert(column === "professor_id" ? { user_id: user.id, professor_id: id } : { user_id: user.id, course_id: id });
  if (error) return { ok: false, error: mapDbError(error) };
  revalidatePath("/dashboard");
  return { ok: true, data: { saved: true } };
}

const comparisonSchema = z.object({
  courseId: z.uuid(),
  professorIds: z.array(z.uuid()).min(2).max(MAX_COMPARE),
  name: z.string().trim().max(80).optional(),
});

export async function saveComparison(input: z.input<typeof comparisonSchema>): Promise<ActionResult> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: "notConfigured" };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = comparisonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const { error } = await supabase.from("saved_comparisons").insert({
    user_id: user.id,
    course_id: parsed.data.courseId,
    professor_ids: [...new Set(parsed.data.professorIds)],
    name: parsed.data.name || null,
  });
  if (error) return { ok: false, error: mapDbError(error) };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteComparison(id: string): Promise<ActionResult> {
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: "notConfigured" };
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const { error } = await supabase.from("saved_comparisons").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: mapDbError(error) };
  revalidatePath("/dashboard");
  return { ok: true };
}
