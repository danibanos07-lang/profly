import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/server";
import type { AcademicTerm, Campus, CourseSummary, Department, FeedReview, ProfessorCourse, ProfessorSummary, University } from "@/lib/types";
import type { ReviewSort } from "@/lib/constants";

// The directory views report every column as nullable; the columns we rely on
// are NOT NULL in the base tables, so narrowing here is safe.
const asProfessors = (rows: unknown) => (rows ?? []) as ProfessorSummary[];
const asCourses = (rows: unknown) => (rows ?? []) as CourseSummary[];
const asCombos = (rows: unknown) => (rows ?? []) as ProfessorCourse[];
const asReviews = (rows: unknown) => (rows ?? []) as FeedReview[];

export type UniversityContext = {
  university: University;
  campuses: Campus[];
  departments: Department[];
  terms: AcademicTerm[];
};

/** The university the site is scoped to (Tec by default) with its catalog metadata. */
export const getUniversityContext = cache(async (slug: string = env.defaultUniversitySlug): Promise<UniversityContext | null> => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data: university } = await supabase.from("universities").select("*").eq("slug", slug).maybeSingle();
  if (!university) return null;
  const [campuses, departments, terms] = await Promise.all([
    supabase.from("campuses").select("*").eq("university_id", university.id).order("is_default", { ascending: false }).order("name"),
    supabase.from("departments").select("*").eq("university_id", university.id).order("name"),
    supabase.from("academic_terms").select("*").eq("university_id", university.id).order("year", { ascending: false }).order("starts_on", { ascending: false }),
  ]);
  return {
    university,
    campuses: campuses.data ?? [],
    departments: departments.data ?? [],
    terms: terms.data ?? [],
  };
});

export async function getHomeData() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const [professors, courses, professorCount, courseCount, reviewCount] = await Promise.all([
    // Best rated among professors with a meaningful number of reviews.
    supabase
      .from("professor_directory")
      .select("*")
      .gte("review_count", 3)
      .order("avg_overall", { ascending: false, nullsFirst: false })
      .order("review_count", { ascending: false })
      .limit(6),
    supabase.from("course_directory").select("*").order("review_count", { ascending: false }).limit(6),
    supabase.from("professor_directory").select("id", { count: "exact", head: true }),
    supabase.from("course_directory").select("id", { count: "exact", head: true }),
    supabase.from("review_feed").select("id", { count: "exact", head: true }),
  ]);
  return {
    professors: asProfessors(professors.data),
    courses: asCourses(courses.data),
    counts: {
      professors: professorCount.count ?? 0,
      courses: courseCount.count ?? 0,
      reviews: reviewCount.count ?? 0,
    },
  };
}

export type ProfessorLookup =
  | { status: "found"; professor: ProfessorSummary; courses: ProfessorCourse[] }
  | { status: "merged"; slug: string }
  | { status: "missing" };

export const getProfessor = cache(async (slug: string): Promise<ProfessorLookup> => {
  const supabase = await getSupabase();
  if (!supabase) return { status: "missing" };
  const { data } = await supabase.from("professor_directory").select("*").eq("slug", slug).maybeSingle();
  if (!data) {
    // Profiles merged into another one keep redirecting to the survivor.
    const { data: merged } = await supabase
      .from("professors")
      .select("merged_into_id, target:professors!professors_merged_into_id_fkey(slug)")
      .eq("slug", slug)
      .not("merged_into_id", "is", null)
      .maybeSingle();
    const target = merged?.target as { slug: string } | null | undefined;
    return target?.slug ? { status: "merged", slug: target.slug } : { status: "missing" };
  }
  const professor = data as ProfessorSummary;
  const { data: combos } = await supabase
    .from("professor_course_directory")
    .select("*")
    .eq("professor_id", professor.id)
    .order("review_count", { ascending: false });
  return { status: "found", professor, courses: asCombos(combos) };
});

export type Prerequisite = {
  id: string;
  description: string | null;
  is_verified: boolean;
  source_url: string | null;
  prerequisite: { slug: string; code: string; name: string } | null;
};

export type CourseLookup =
  | { status: "found"; course: CourseSummary; professors: ProfessorCourse[]; prerequisites: Prerequisite[] }
  | { status: "merged"; slug: string }
  | { status: "missing" };

export const getCourse = cache(async (slug: string): Promise<CourseLookup> => {
  const supabase = await getSupabase();
  if (!supabase) return { status: "missing" };
  const { data } = await supabase.from("course_directory").select("*").eq("slug", slug).maybeSingle();
  if (!data) {
    const { data: merged } = await supabase
      .from("courses")
      .select("merged_into_id, target:courses!courses_merged_into_id_fkey(slug)")
      .eq("slug", slug)
      .not("merged_into_id", "is", null)
      .maybeSingle();
    const target = merged?.target as { slug: string } | null | undefined;
    return target?.slug ? { status: "merged", slug: target.slug } : { status: "missing" };
  }
  const course = data as CourseSummary;
  const [professors, prerequisites] = await Promise.all([
    supabase.from("professor_course_directory").select("*").eq("course_id", course.id).order("avg_overall", { ascending: false, nullsFirst: false }),
    supabase
      .from("course_prerequisites")
      .select("id, description, is_verified, source_url, prerequisite:courses!course_prerequisites_prerequisite_course_id_fkey(slug, code, name)")
      .eq("course_id", course.id),
  ]);
  return {
    status: "found",
    course,
    professors: asCombos(professors.data),
    prerequisites: (prerequisites.data ?? []) as Prerequisite[],
  };
});

export const getCombination = cache(async (professorSlug: string, courseSlug: string) => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("professor_course_directory")
    .select("*")
    .eq("professor_slug", professorSlug)
    .eq("course_slug", courseSlug)
    .maybeSingle();
  return (data as ProfessorCourse | null) ?? null;
});

export type ReviewQuery = {
  professorId?: string;
  courseId?: string;
  professorCourseId?: string;
  sort?: ReviewSort;
  page?: number;
  pageSize?: number;
};

export async function getReviews({ professorId, courseId, professorCourseId, sort = "newest", page = 1, pageSize = 10 }: ReviewQuery) {
  const supabase = await getSupabase();
  if (!supabase) return { reviews: [] as FeedReview[], total: 0 };
  let query = supabase.from("review_feed").select("*", { count: "exact" });
  if (professorId) query = query.eq("professor_id", professorId);
  if (courseId) query = query.eq("course_id", courseId);
  if (professorCourseId) query = query.eq("professor_course_id", professorCourseId);
  switch (sort) {
    case "highest":
      query = query.order("professor_overall", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "lowest":
      query = query.order("professor_overall", { ascending: true }).order("created_at", { ascending: false });
      break;
    case "helpful":
      query = query.order("helpful_score", { ascending: false }).order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  const from = (Math.max(page, 1) - 1) * pageSize;
  const { data, count } = await query.range(from, from + pageSize - 1);
  return { reviews: asReviews(data), total: count ?? 0 };
}

/** The signed-in user's votes for a set of reviews, keyed by review id. */
export async function getMyVotes(reviewIds: string[]) {
  const supabase = await getSupabase();
  if (!supabase || reviewIds.length === 0) return {} as Record<string, 1 | -1>;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return {} as Record<string, 1 | -1>;
  const { data } = await supabase.from("review_votes").select("review_id, value").in("review_id", reviewIds);
  return Object.fromEntries((data ?? []).map((row) => [row.review_id, row.value as 1 | -1]));
}

export type ProfessorSearchParams = {
  query?: string;
  campusId?: string;
  departmentId?: string;
  courseId?: string;
  minRating?: number;
  maxDifficulty?: number;
  minReviews?: number;
  minTakeAgain?: number;
  maxWeeklyHours?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function searchProfessors(params: ProfessorSearchParams, universityId?: string) {
  const supabase = await getSupabase();
  if (!supabase) return { items: [] as ProfessorSummary[], hasMore: false };
  const pageSize = params.pageSize ?? 12;
  const page = Math.max(params.page ?? 1, 1);
  const { data, error } = await supabase.rpc("search_professors", {
    p_query: params.query || undefined,
    p_university_id: universityId,
    p_campus_id: params.campusId,
    p_department_id: params.departmentId,
    p_course_id: params.courseId,
    p_min_rating: params.minRating,
    p_max_difficulty: params.maxDifficulty,
    p_min_reviews: params.minReviews,
    p_min_take_again: params.minTakeAgain,
    p_max_weekly_hours: params.maxWeeklyHours,
    p_sort: params.sort === "reviews" ? "count" : params.sort ?? "relevance",
    p_limit: pageSize + 1,
    p_offset: (page - 1) * pageSize,
  });
  if (error) console.error("search_professors", error.message);
  const rows = asProfessors(data);
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export type CourseSearchParams = {
  query?: string;
  campusId?: string;
  departmentId?: string;
  maxDifficulty?: number;
  maxWorkload?: number;
  maxWeeklyHours?: number;
  minReviews?: number;
  minRecommend?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export async function searchCourses(params: CourseSearchParams, universityId?: string) {
  const supabase = await getSupabase();
  if (!supabase) return { items: [] as CourseSummary[], hasMore: false };
  const pageSize = params.pageSize ?? 12;
  const page = Math.max(params.page ?? 1, 1);
  const { data, error } = await supabase.rpc("search_courses", {
    p_query: params.query || undefined,
    p_university_id: universityId,
    p_campus_id: params.campusId,
    p_department_id: params.departmentId,
    p_max_difficulty: params.maxDifficulty,
    p_max_workload: params.maxWorkload,
    p_max_weekly_hours: params.maxWeeklyHours,
    p_min_reviews: params.minReviews,
    p_min_recommend: params.minRecommend,
    p_sort: params.sort === "reviews" ? "count" : params.sort ?? "relevance",
    p_limit: pageSize + 1,
    p_offset: (page - 1) * pageSize,
  });
  if (error) console.error("search_courses", error.message);
  const rows = asCourses(data);
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

/** Professors teaching a course, for the comparison page. */
export async function getCourseProfessors(courseId: string) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("professor_course_directory")
    .select("*")
    .eq("course_id", courseId)
    .order("review_count", { ascending: false });
  return asCombos(data);
}

export async function listCourses(universityId?: string) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  let query = supabase.from("course_directory").select("*").order("code");
  if (universityId) query = query.eq("university_id", universityId);
  const { data } = await query;
  return asCourses(data);
}

export async function getProfessorsByIds(ids: string[]) {
  const supabase = await getSupabase();
  if (!supabase || ids.length === 0) return [];
  const { data } = await supabase.from("professor_directory").select("*").in("id", ids);
  return asProfessors(data);
}

export async function isBookmarked(target: { professorId?: string; courseId?: string }) {
  const supabase = await getSupabase();
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  let query = supabase.from("bookmarks").select("id").eq("user_id", auth.user.id);
  if (target.professorId) query = query.eq("professor_id", target.professorId);
  if (target.courseId) query = query.eq("course_id", target.courseId);
  const { data } = await query.maybeSingle();
  return Boolean(data);
}

export type GradeSummary = {
  grade_count: number;
  /** Null until the group reaches GRADE_MIN_SAMPLE grades. */
  avg_grade: number | null;
  grade_scale_min: number;
  grade_scale_max: number;
};

const asGrade = (row: { grade_count: number | null; avg_grade: number | null; grade_scale_min: number | null; grade_scale_max: number | null }): GradeSummary => ({
  grade_count: row.grade_count ?? 0,
  avg_grade: row.avg_grade,
  grade_scale_min: row.grade_scale_min ?? 0,
  grade_scale_max: row.grade_scale_max ?? 100,
});

/** Thresholded, anonymous grade average for a course (null when nobody reported one). */
export const getCourseGrades = cache(async (courseId: string): Promise<GradeSummary | null> => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from("course_grade_summary").select("*").eq("course_id", courseId).maybeSingle();
  if (error) console.error("course_grade_summary", error.message);
  return data ? asGrade(data) : null;
});

/** Grade averages per professor-course, keyed by professor_course_id. */
export const getComboGrades = cache(async (by: "course" | "professor", id: string): Promise<Record<string, GradeSummary>> => {
  const supabase = await getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("professor_course_grade_summary")
    .select("*")
    .eq(by === "course" ? "course_id" : "professor_id", id);
  if (error) console.error("professor_course_grade_summary", error.message);
  return Object.fromEntries((data ?? []).filter((row) => row.professor_course_id).map((row) => [row.professor_course_id as string, asGrade(row)]));
});
