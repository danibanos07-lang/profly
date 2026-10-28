import type { Tables, Views } from "@/lib/supabase/database.types";

/** Makes the listed keys required and non-null (views report every column as nullable). */
export type WithRequired<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

export type ProfessorSummary = WithRequired<
  Views<"professor_directory">,
  "id" | "slug" | "display_name" | "review_count" | "is_fictional" | "rating_distribution" | "tag_counts" | "attendance_counts" | "course_count"
>;

export type CourseSummary = WithRequired<
  Views<"course_directory">,
  | "id"
  | "slug"
  | "code"
  | "name"
  | "review_count"
  | "is_fictional"
  | "professor_count"
  | "difficulty_distribution"
  | "satisfaction_distribution"
  | "homework_counts"
  | "teamwork_counts"
>;

export type ProfessorCourse = WithRequired<
  Views<"professor_course_directory">,
  "id" | "professor_id" | "professor_slug" | "professor_name" | "course_id" | "course_slug" | "course_code" | "course_name" | "review_count"
>;

export type FeedReview = WithRequired<
  Views<"review_feed">,
  | "id"
  | "professor_id"
  | "professor_slug"
  | "professor_name"
  | "course_id"
  | "course_slug"
  | "course_code"
  | "course_name"
  | "term_label"
  | "teaching_format"
  | "would_take_again"
  | "recommends_course"
  | "weekly_hours"
  | "tags"
  | "body"
  | "enrollment_verified"
  | "helpful_count"
  | "not_helpful_count"
  | "professor_overall"
  | "difficulty"
  | "created_at"
>;

export type University = Tables<"universities">;
export type Campus = Tables<"campuses">;
export type Department = Tables<"departments">;
export type AcademicTerm = Tables<"academic_terms">;

export type SuggestItem = {
  kind: "professor" | "course";
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  code: string | null;
  rating: number | null;
  review_count: number;
};
