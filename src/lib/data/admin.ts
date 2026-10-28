import "server-only";
import { cache } from "react";
import { env } from "@/lib/env";
import { getSupabase } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

// Read models for the admin area. RLS limits all of these to moderators and
// admins; the admin layout also checks the role before rendering.

export const ADMIN_PAGE_SIZE = 25;

const REVIEW_FIELDS = `
  id, body, advice, status, tags, report_count, enrollment_verified, moderation_note,
  helpful_count, not_helpful_count, created_at, edited_at, user_id,
  professor:professors!reviews_professor_id_fkey(display_name, slug, is_fictional),
  course:courses!reviews_course_id_fkey(code, name, slug),
  term:academic_terms!reviews_term_id_fkey(label),
  scores:professor_review_scores(overall)
`;

export type AdminReview = {
  id: string;
  body: string;
  advice: string | null;
  status: "published" | "under_review" | "hidden" | "removed";
  tags: string[];
  report_count: number;
  enrollment_verified: boolean;
  moderation_note: string | null;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  edited_at: string | null;
  user_id: string;
  professor: { display_name: string; slug: string; is_fictional: boolean } | null;
  course: { code: string; name: string; slug: string } | null;
  term: { label: string } | null;
  scores: { overall: number | null } | { overall: number | null }[] | null;
};

export function reviewOverall(review: AdminReview) {
  const scores = Array.isArray(review.scores) ? review.scores[0] : review.scores;
  return scores?.overall ?? null;
}

/** All universities plus the one the admin is working on (from ?u=slug). */
export const getAdminUniversities = cache(async (slug?: string) => {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("universities").select("*").order("name");
  const universities = data ?? [];
  const current = universities.find((u) => u.slug === (slug || env.defaultUniversitySlug)) ?? universities[0] ?? null;
  return { universities, current };
});

export async function getUniversityLookups(universityId: string) {
  const supabase = await getSupabase();
  if (!supabase) return { campuses: [], departments: [], terms: [] };
  const [campuses, departments, terms] = await Promise.all([
    supabase.from("campuses").select("*").eq("university_id", universityId).order("is_default", { ascending: false }).order("name"),
    supabase.from("departments").select("*").eq("university_id", universityId).order("name"),
    supabase.from("academic_terms").select("*").eq("university_id", universityId).order("year", { ascending: false }).order("season"),
  ]);
  return { campuses: campuses.data ?? [], departments: departments.data ?? [], terms: terms.data ?? [] };
}

export type AdminOverview = {
  open_reports: number;
  queued_reviews: number;
  pending_suggestions: number;
  open_corrections: number;
  published_reviews: number;
  reviews_last_7_days: number;
  accounts: number;
  accounts_with_university_email: number;
  professors: number;
  courses: number;
  reviews_per_day: { day: string; count: number }[];
};

export async function getAdminOverview() {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) return null;
  return data as unknown as AdminOverview;
}

export async function getReports(status: "open" | "dismissed" | "actioned") {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("review_reports")
    .select(
      `id, reason, details, status, created_at, resolution_note, handled_at,
       reporter:profiles!review_reports_reporter_id_fkey(display_name),
       review:reviews!review_reports_review_id_fkey(${REVIEW_FIELDS})`,
    )
    .eq("status", status)
    .order("created_at", { ascending: status !== "open" ? false : true })
    .limit(100);
  return (data ?? []) as unknown as {
    id: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    resolution_note: string | null;
    handled_at: string | null;
    reporter: { display_name: string | null } | null;
    review: AdminReview | null;
  }[];
}

export async function getReviewsByStatus(status: AdminReview["status"], page = 1) {
  const supabase = await getSupabase();
  if (!supabase) return { rows: [] as AdminReview[], count: 0 };
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count } = await supabase
    .from("reviews")
    .select(REVIEW_FIELDS, { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: status === "under_review" })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  return { rows: (data ?? []) as unknown as AdminReview[], count: count ?? 0 };
}

export async function listAdminProfessors(universityId: string, query: string, page = 1) {
  const supabase = await getSupabase();
  if (!supabase) return { rows: [], count: 0 };
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let request = supabase
    .from("professors")
    .select("id, slug, display_name, honorific, is_active, is_fictional, merged_into_id, department:departments(name), stats:professor_stats(review_count, avg_overall)", {
      count: "exact",
    })
    .eq("university_id", universityId)
    .order("last_name")
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (query) request = request.ilike("search_text", `%${normalize(query)}%`);
  const { data, count } = await request;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function listAdminCourses(universityId: string, query: string, page = 1) {
  const supabase = await getSupabase();
  if (!supabase) return { rows: [], count: 0 };
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let request = supabase
    .from("courses")
    .select("id, slug, code, name, is_active, is_fictional, merged_into_id, department:departments(name), stats:course_stats(review_count, avg_difficulty)", {
      count: "exact",
    })
    .eq("university_id", universityId)
    .order("code")
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  if (query) request = request.ilike("search_text", `%${normalize(query)}%`);
  const { data, count } = await request;
  return { rows: data ?? [], count: count ?? 0 };
}

/** Lowercase, accent-free version of a query, matching `normalize_search()` in SQL. */
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[%_\\]/g, "")
    .trim();
}

export async function getAdminProfessor(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.from("professors").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getAdminCourse(id: string) {
  const supabase = await getSupabase();
  if (!supabase) return null;
  const [course, prerequisites, assignments] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("course_prerequisites")
      .select("*, prerequisite:courses!course_prerequisites_prerequisite_course_id_fkey(code, name)")
      .eq("course_id", id)
      .order("created_at"),
    supabase
      .from("professor_courses")
      .select("id, is_active, professor:professors(display_name, slug)")
      .eq("course_id", id),
  ]);
  if (!course.data) return null;
  return { course: course.data, prerequisites: prerequisites.data ?? [], assignments: assignments.data ?? [] };
}

/** Compact option lists for selects (id + label). */
export async function getCatalogOptions(universityId: string) {
  const supabase = await getSupabase();
  if (!supabase) return { professors: [], courses: [] };
  const [professors, courses] = await Promise.all([
    supabase
      .from("professors")
      .select("id, display_name, slug, is_fictional")
      .eq("university_id", universityId)
      .is("merged_into_id", null)
      .order("last_name")
      .limit(5000),
    supabase
      .from("courses")
      .select("id, code, name, is_fictional")
      .eq("university_id", universityId)
      .is("merged_into_id", null)
      .order("code")
      .limit(5000),
  ]);
  return { professors: professors.data ?? [], courses: courses.data ?? [] };
}

export async function listAssignments(universityId: string, query: string, page = 1) {
  const supabase = await getSupabase();
  if (!supabase) return { rows: [], count: 0 };
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  let request = supabase
    .from("professor_courses")
    .select(
      `id, is_active, created_at,
       campus:campuses(name),
       professor:professors!inner(display_name, slug, university_id, search_text),
       course:courses!inner(code, name, slug),
       stats:professor_course_stats(review_count)`,
      { count: "exact" },
    )
    .eq("professor.university_id", universityId)
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE - 1);
  // Matches the professor's name (accent-insensitive).
  if (query) request = request.ilike("professor.search_text", `%${normalize(query)}%`);
  const { data, count } = await request;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function getAllCampuses() {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("campuses").select("*").order("is_default", { ascending: false }).order("name");
  return data ?? [];
}

export async function getSuggestions(status: "pending" | "approved" | "rejected") {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("suggestions")
    .select("id, kind, payload, status, reviewer_note, created_at, reviewed_at, author:profiles!suggestions_user_id_fkey(display_name)")
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .limit(100);
  return (data ?? []) as unknown as {
    id: string;
    kind: "professor" | "course" | "assignment" | "prerequisite";
    payload: Record<string, Json>;
    status: string;
    reviewer_note: string | null;
    created_at: string;
    reviewed_at: string | null;
    author: { display_name: string | null } | null;
  }[];
}

export async function getCorrections(status: "open" | "resolved" | "rejected") {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("correction_requests")
    .select("*, professor:professors(display_name, slug), course:courses(code, name, slug)")
    .eq("status", status)
    .order("created_at", { ascending: status === "open" })
    .limit(100);
  return data ?? [];
}

export async function getUsers(query: string) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.rpc("admin_list_users", { p_query: query || undefined, p_limit: 100 });
  return data ?? [];
}

export async function getSuspiciousActivity(days: number) {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.rpc("admin_suspicious_activity", { p_days: days });
  return data ?? [];
}

export async function getBlockedTerms() {
  const supabase = await getSupabase();
  if (!supabase) return [];
  const { data } = await supabase.from("blocked_terms").select("*").order("term");
  return data ?? [];
}

export async function getModerationLogs(page = 1, targetId?: string) {
  const supabase = await getSupabase();
  if (!supabase) return { rows: [], count: 0 };
  const from = (page - 1) * ADMIN_PAGE_SIZE * 2;
  let request = supabase
    .from("moderation_logs")
    .select("*, actor:profiles!moderation_logs_actor_id_fkey(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + ADMIN_PAGE_SIZE * 2 - 1);
  if (targetId) request = request.eq("target_id", targetId);
  const { data, count } = await request;
  return { rows: data ?? [], count: count ?? 0 };
}
