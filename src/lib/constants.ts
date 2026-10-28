import type { Enums } from "@/lib/supabase/database.types";

export const PROFESSOR_CATEGORIES = [
  "clarity",
  "attitude",
  "grading_fairness",
  "availability",
  "organization",
  "engagement",
] as const;
export type ProfessorCategory = (typeof PROFESSOR_CATEGORIES)[number];

export const COURSE_CATEGORIES = [
  "difficulty",
  "workload",
  "content_clarity",
  "usefulness",
  "organization",
  "satisfaction",
] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

// Keep in sync with the CHECK constraint on public.reviews.tags.
export const TAG_GROUPS = {
  methods: [
    "project_based",
    "group_work",
    "slides_heavy",
    "participation_matters",
    "exam_heavy",
    "flipped_classroom",
    "lots_of_homework",
    "real_world_examples",
  ],
  strengths: [
    "clear_explanations",
    "helpful_feedback",
    "available_outside_class",
    "inspiring",
    "flexible_deadlines",
    "fair_grading",
  ],
  weaknesses: ["tough_grader", "fast_paced", "disorganized", "late_feedback", "unclear_expectations"],
} as const;
export type TagGroup = keyof typeof TAG_GROUPS;
export type ReviewTag = (typeof TAG_GROUPS)[TagGroup][number];
export const ALL_TAGS: readonly ReviewTag[] = [...TAG_GROUPS.methods, ...TAG_GROUPS.strengths, ...TAG_GROUPS.weaknesses];
export const MAX_TAGS = 8;

export const TEACHING_FORMATS = ["in_person", "online", "hybrid"] as const satisfies readonly Enums<"teaching_format">[];
export const HOMEWORK_FREQUENCIES = ["none", "occasional", "weekly", "several_per_week"] as const satisfies readonly Enums<"homework_frequency">[];
export const TEAMWORK_LEVELS = ["none", "some", "frequent"] as const satisfies readonly Enums<"teamwork_level">[];
export const ATTENDANCE_POLICIES = ["mandatory", "counts_toward_grade", "optional"] as const satisfies readonly Enums<"attendance_policy">[];
export const REPORT_REASONS = [
  "harassment",
  "hate_speech",
  "threat",
  "personal_info",
  "false_information",
  "spam",
  "off_topic",
  "other",
] as const satisfies readonly Enums<"report_reason">[];

export const REVIEW_SORTS = ["newest", "highest", "lowest", "helpful"] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export const REVIEW_BODY_MIN = 40;
export const REVIEW_BODY_MAX = 3000;
export const REVIEW_ADVICE_MAX = 1000;

/** Below this many reviews, averages are shown with a low-confidence hint. */
export const LOW_CONFIDENCE_THRESHOLD = 5;
export const MAX_COMPARE = 3;
export const PAGE_SIZE = 12;
