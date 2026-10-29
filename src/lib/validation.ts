import { z } from "zod";
import {
  ALL_TAGS,
  ATTENDANCE_POLICIES,
  HOMEWORK_FREQUENCIES,
  MAX_TAGS,
  REPORT_REASONS,
  REVIEW_ADVICE_MAX,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  TEACHING_FORMATS,
  TEAMWORK_LEVELS,
} from "@/lib/constants";
import { cleanUserText, containsContactInfo } from "@/lib/moderation";

const score = z.coerce.number().int().min(1).max(5);
const optionalBool = z.boolean().nullable().optional().transform((v) => v ?? null);

const cleanText = (min: number, max: number) =>
  z
    .string()
    .transform((value) => cleanUserText(value))
    .pipe(z.string().min(min, "tooShort").max(max, "tooLong"))
    .refine((value) => !containsContactInfo(value), "personalInfo");

export const reviewSchema = z.object({
  professor_course_id: z.uuid(),
  campus_id: z.uuid(),
  term_id: z.uuid(),
  teaching_format: z.enum(TEACHING_FORMATS),
  would_take_again: z.boolean(),
  recommends_course: z.boolean(),
  weekly_hours: z.coerce.number().int().min(0).max(60),
  exam_count: z.coerce.number().int().min(0).max(20).nullable().optional().transform((v) => v ?? null),
  exam_difficulty: score.nullable().optional().transform((v) => v ?? null),
  homework_frequency: z.enum(HOMEWORK_FREQUENCIES).nullable().optional().transform((v) => v ?? null),
  teamwork_level: z.enum(TEAMWORK_LEVELS).nullable().optional().transform((v) => v ?? null),
  attendance_policy: z.enum(ATTENDANCE_POLICIES).nullable().optional().transform((v) => v ?? null),
  requires_programming: optionalBool,
  requires_math: optionalBool,
  prior_knowledge_needed: optionalBool,
  tags: z
    .array(z.enum(ALL_TAGS as [string, ...string[]]))
    .max(MAX_TAGS)
    .transform((tags) => [...new Set(tags)]),
  body: cleanText(REVIEW_BODY_MIN, REVIEW_BODY_MAX),
  advice: z
    .string()
    .optional()
    .transform((value) => cleanUserText(value))
    .pipe(z.string().max(REVIEW_ADVICE_MAX, "tooLong"))
    .refine((value) => !containsContactInfo(value), "personalInfo"),
  professor_scores: z.object({
    clarity: score,
    attitude: score,
    grading_fairness: score,
    availability: score,
    organization: score,
    engagement: score,
  }),
  course_scores: z.object({
    difficulty: score,
    workload: score,
    content_clarity: score,
    usefulness: score,
    organization: score,
    satisfaction: score,
  }),
  // Optional self-reported final grade. The database checks it against the
  // university's grading scale; it is stored apart from the review.
  final_grade: z.coerce.number().min(0).max(1000).nullable().optional().transform((v) => v ?? null),
  accepts_guidelines: z.literal(true),
});
export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewPayload = Omit<z.output<typeof reviewSchema>, "accepts_guidelines">;

export const reportSchema = z.object({
  review_id: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .max(1000)
    .optional()
    .transform((value) => cleanUserText(value) || null),
});

export const passwordSchema = z
  .string()
  .min(8, "passwordHint")
  .max(72)
  .regex(/[a-zA-Z]/, "passwordHint")
  .regex(/[0-9]/, "passwordHint");

export const signupSchema = z.object({
  email: z.email().max(200),
  password: passwordSchema,
  display_name: z
    .string()
    .max(60)
    .optional()
    .transform((value) => cleanUserText(value) || undefined),
});

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1).max(200) });

export const suggestionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("professor"),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(120),
    department: z.string().trim().max(160).optional(),
    details: z.string().trim().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("course"),
    course_code: z.string().trim().min(2).max(24),
    course_name: z.string().trim().min(2).max(200),
    department: z.string().trim().max(160).optional(),
    details: z.string().trim().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("assignment"),
    professor_name: z.string().trim().min(2).max(200),
    course_code: z.string().trim().min(2).max(24),
    details: z.string().trim().max(1000).optional(),
  }),
  z.object({
    kind: z.literal("prerequisite"),
    course_code: z.string().trim().min(2).max(24),
    details: z.string().trim().min(5).max(1000),
  }),
]);

export const correctionSchema = z
  .object({
    professor_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    course_id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    requester_name: z.string().trim().min(2).max(120),
    requester_email: z.email().max(200),
    relationship: z.enum(["professor", "staff", "student", "other"]),
    message: z.string().trim().min(20).max(3000),
  })
  .refine((value) => value.professor_id || value.course_id, { path: ["professor_id"], message: "required" });

export const profileSettingsSchema = z.object({
  campus_id: z.uuid().nullable(),
  preferred_locale: z.enum(["es", "en"]),
  display_name: z
    .string()
    .max(60)
    .optional()
    .transform((value) => cleanUserText(value) || null),
});

/** Turns a zod error into { field: messageKey } for form display. */
export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const optionalUuid = z.uuid().nullable().optional().transform((v) => v ?? null);

export const academicProfileSchema = z.object({
  university_id: optionalUuid,
  campus_id: optionalUuid,
  program_id: optionalUuid,
  curriculum_id: optionalUuid,
  current_semester: z.number().int().min(1).max(20).nullable().optional().transform((v) => v ?? null),
  start_year: z.number().int().min(1950).max(2100).nullable().optional().transform((v) => v ?? null),
});

export const courseRecordSchema = z.object({
  course_id: z.uuid(),
  status: z.enum(["completed", "in_progress", "failed", "withdrawn"]),
});
