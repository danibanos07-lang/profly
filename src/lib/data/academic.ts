import "server-only";
import { getSupabase } from "@/lib/supabase/server";

export type AcademicOptions = {
  universities: { id: string; name: string }[];
  campuses: { id: string; name: string; university_id: string }[];
  programs: { id: string; name: string; name_en: string | null; university_id: string; is_fictional: boolean }[];
  curricula: { id: string; program_id: string; version_label: string }[];
};

export type AcademicProfile = {
  university_id: string | null;
  campus_id: string | null;
  program_id: string | null;
  curriculum_id: string | null;
  current_semester: number | null;
  start_year: number | null;
};

export type CourseRecord = {
  id: string;
  status: "completed" | "in_progress" | "failed" | "withdrawn";
  course: { id: string; code: string; name: string; slug: string } | null;
};

export type NextSemesterCourse = {
  course_id: string;
  slug: string;
  code: string;
  name: string;
  planned_semester: number | null;
  requirement: "required" | "elective" | "concentration";
  is_catch_up: boolean;
  missing_prerequisites: string[];
  avg_difficulty: number | null;
  review_count: number;
  reviewed_professor_count: number;
  avg_grade: number | null;
  grade_count: number | null;
};

/** Everything the academic profile form can pick from. Empty lists when the schema predates programs. */
export async function getAcademicOptions(): Promise<AcademicOptions> {
  const supabase = await getSupabase();
  const empty: AcademicOptions = { universities: [], campuses: [], programs: [], curricula: [] };
  if (!supabase) return empty;
  const [universities, campuses, programs, curricula] = await Promise.all([
    supabase.from("universities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("campuses").select("id, name, university_id").eq("is_active", true).order("name"),
    supabase.from("degree_programs").select("id, name, name_en, university_id, is_fictional").eq("is_active", true).order("name"),
    supabase.from("curricula").select("id, program_id, version_label").eq("is_active", true).order("version_label", { ascending: false }),
  ]);
  return {
    universities: universities.data ?? [],
    campuses: campuses.data ?? [],
    programs: programs.data ?? [],
    curricula: curricula.data ?? [],
  };
}

export async function getMyAcademic(userId: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const [profile, records, curriculum] = await Promise.all([
    supabase.from("profiles").select("university_id, campus_id, program_id, curriculum_id, current_semester, start_year").eq("id", userId).maybeSingle(),
    supabase
      .from("student_course_records")
      .select("id, status, course:courses(id, code, name, slug)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("curriculum:curricula(is_official, is_active)").eq("id", userId).maybeSingle(),
  ]);
  // A missing column (schema not updated yet) shows up as an error: treat it as an empty profile.
  const p = (profile.error ? null : profile.data) as AcademicProfile | null;
  const official = Boolean(
    !curriculum.error && (curriculum.data?.curriculum as { is_official: boolean; is_active: boolean } | null)?.is_official,
  );
  let next: NextSemesterCourse[] = [];
  if (p?.curriculum_id && p.current_semester && official) {
    const { data, error } = await supabase.rpc("my_next_semester");
    if (error) console.error("my_next_semester", error.message);
    next = (data ?? []) as NextSemesterCourse[];
  }
  return {
    profile: p ?? { university_id: null, campus_id: null, program_id: null, curriculum_id: null, current_semester: null, start_year: null },
    records: (records.error ? [] : records.data ?? []) as CourseRecord[],
    hasOfficialCurriculum: official,
    next,
  };
}

/** Courses a student can mark as taken, for their university. */
export async function getRecordableCourses(universityId: string | null) {
  const supabase = await getSupabase();
  if (!supabase || !universityId) return [];
  const { data } = await supabase.from("course_directory").select("id, code, name").eq("university_id", universityId).order("code");
  return (data ?? []) as { id: string; code: string; name: string }[];
}
