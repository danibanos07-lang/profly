"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import { academicProfileSchema, courseRecordSchema } from "@/lib/validation";
import type { ActionResult } from "./result";

export async function updateAcademicProfile(input: unknown): Promise<ActionResult> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase) return { ok: false, error: "notConfigured" };
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = academicProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) {
    console.error("updateAcademicProfile", error.message);
    return { ok: false, error: "invalidInput" };
  }
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

export async function addCourseRecord(input: unknown): Promise<ActionResult> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase) return { ok: false, error: "notConfigured" };
  if (!user) return { ok: false, error: "unauthorized" };
  const parsed = courseRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalidInput" };
  const { error } = await supabase
    .from("student_course_records")
    .upsert({ user_id: user.id, course_id: parsed.data.course_id, status: parsed.data.status, term_id: null }, { onConflict: "user_id,course_id,term_id" });
  if (error) {
    console.error("addCourseRecord", error.message);
    return { ok: false, error: "generic" };
  }
  revalidatePath("/dashboard/plan");
  return { ok: true };
}

export async function removeCourseRecord(id: string): Promise<ActionResult> {
  const supabase = await getSupabase();
  const user = await getSessionUser();
  if (!supabase) return { ok: false, error: "notConfigured" };
  if (!user) return { ok: false, error: "unauthorized" };
  const { error } = await supabase.from("student_course_records").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/dashboard/plan");
  return { ok: true };
}
