"use server";

import { z } from "zod";
import { getSupabase } from "@/lib/supabase/server";

export type ComboOption = {
  id: string;
  professor_id: string;
  professor_name: string;
  professor_slug: string;
  course_id: string;
  course_code: string;
  course_name: string;
  course_slug: string;
  campus_id: string | null;
};

/** Active professor–course assignments for one professor or one course (used by the review form). */
export async function fetchCombos(input: { professorId?: string; courseId?: string }): Promise<ComboOption[]> {
  const parsed = z.object({ professorId: z.uuid().optional(), courseId: z.uuid().optional() }).safeParse(input);
  if (!parsed.success || (!parsed.data.professorId && !parsed.data.courseId)) return [];
  const supabase = await getSupabase();
  if (!supabase) return [];
  let query = supabase
    .from("professor_course_directory")
    .select("id, professor_id, professor_name, professor_slug, course_id, course_code, course_name, course_slug, campus_id")
    .eq("is_active", true);
  if (parsed.data.professorId) query = query.eq("professor_id", parsed.data.professorId);
  if (parsed.data.courseId) query = query.eq("course_id", parsed.data.courseId);
  const { data } = await query.order("course_code");
  return (data ?? []) as ComboOption[];
}
