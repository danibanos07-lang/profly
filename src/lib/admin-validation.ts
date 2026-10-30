import { z } from "zod";
import { slugify } from "@/lib/format";

// Schemas for admin catalog forms and CSV imports. Database constraints are
// the final authority; these give early, readable errors.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish()
    .transform((v) => v ?? null);

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .nullish()
  .transform((v) => v || null);

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/)
  .nullish()
  .transform((v) => v || null);

const checkbox = z
  .union([z.boolean(), z.string()])
  .nullish()
  .transform((v) => v === true || v === "on" || v === "true" || v === "1" || v === "yes" || v === "sí" || v === "si");

const httpUrl = z
  .union([z.url({ protocol: /^https?$/ }), z.literal("")])
  .nullish()
  .transform((v) => v || null);

export const professorFormSchema = z
  .object({
    id: optionalUuid,
    university_id: z.uuid(),
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(120),
    honorific: optionalText(20),
    department_id: optionalUuid,
    primary_campus_id: optionalUuid,
    slug,
    is_fictional: checkbox,
    is_active: checkbox,
  })
  .transform((v) => ({ ...v, slug: v.slug ?? slugify(`${v.first_name} ${v.last_name}`) }));

export const courseFormSchema = z
  .object({
    id: optionalUuid,
    university_id: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/),
    name: z.string().trim().min(2).max(200),
    name_language: z.enum(["es", "en"]).default("es"),
    department_id: optionalUuid,
    description: optionalText(4000),
    credits: z
      .union([z.literal(""), z.coerce.number().min(0).max(40)])
      .nullish()
      .transform((v) => (v === "" || v == null ? null : v)),
    recommended_knowledge: optionalText(2000),
    slug,
    is_fictional: checkbox,
    is_active: checkbox,
  })
  .transform((v) => ({ ...v, slug: v.slug ?? slugify(`${v.code} ${v.name}`) }));

export const prerequisiteFormSchema = z
  .object({
    course_id: z.uuid(),
    prerequisite_course_id: optionalUuid,
    description: optionalText(500),
    source_url: httpUrl,
    is_verified: checkbox,
  })
  .refine((v) => v.prerequisite_course_id || v.description, { path: ["description"] })
  .refine((v) => v.prerequisite_course_id !== v.course_id, { path: ["prerequisite_course_id"] })
  // A verified prerequisite must cite its official source.
  .refine((v) => !v.is_verified || v.source_url, { path: ["source_url"] });

export const assignmentFormSchema = z.object({
  professor_id: z.uuid(),
  course_id: z.uuid(),
  campus_id: optionalUuid,
});

export const universityFormSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(2).max(200),
  short_name: z.string().trim().min(2).max(40),
  email_domains: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(/[\s,]+/)
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)).max(20)),
  website_url: httpUrl,
  is_active: checkbox,
});

export const campusFormSchema = z.object({
  id: optionalUuid,
  university_id: z.uuid(),
  name: z.string().trim().min(2).max(120),
  slug,
  city: optionalText(120),
  state: optionalText(120),
  is_active: checkbox,
  is_default: checkbox,
});

export const departmentFormSchema = z.object({
  id: optionalUuid,
  university_id: z.uuid(),
  name: z.string().trim().min(2).max(160),
  name_en: optionalText(160),
  slug,
});

export const termFormSchema = z
  .object({
    id: optionalUuid,
    university_id: z.uuid(),
    year: z.coerce.number().int().min(2000).max(2100),
    season: z.enum(["spring", "summer", "fall", "winter"]),
    label: z.string().trim().min(2).max(60),
    starts_on: z.iso.date().or(z.literal("")).nullish().transform((v) => v || null),
    ends_on: z.iso.date().or(z.literal("")).nullish().transform((v) => v || null),
    is_open_for_reviews: checkbox,
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on > v.starts_on, { path: ["ends_on"] });

export const blockedTermSchema = z.object({
  term: z.string().trim().toLowerCase().min(2).max(80),
  severity: z.enum(["flag", "block"]),
});

export const mergeSchema = z
  .object({
    kind: z.enum(["professor", "course"]),
    source: z.uuid(),
    target: z.uuid(),
    reason: optionalText(500),
  })
  .refine((v) => v.source !== v.target, { path: ["target"], message: "same" });

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

export const IMPORT_KINDS = ["professors", "courses", "assignments", "teaching", "programs", "curriculum"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];
export const IMPORT_MAX_ROWS = 2000;

export const IMPORT_COLUMNS: Record<ImportKind, { name: string; required: boolean }[]> = {
  professors: [
    { name: "first_name", required: true },
    { name: "last_name", required: true },
    { name: "honorific", required: false },
    { name: "department_slug", required: false },
    { name: "campus_slug", required: false },
    { name: "slug", required: false },
  ],
  courses: [
    { name: "code", required: true },
    { name: "name", required: true },
    { name: "name_language", required: false },
    { name: "department_slug", required: false },
    { name: "credits", required: false },
    { name: "description", required: false },
  ],
  assignments: [
    { name: "professor_slug", required: true },
    { name: "course_code", required: true },
    { name: "campus_slug", required: false },
  ],
  teaching: [
    { name: "professor_slug", required: true },
    { name: "course_code", required: true },
    { name: "term", required: true },
    { name: "campus_slug", required: false },
    { name: "section", required: false },
    { name: "source", required: false },
  ],
  programs: [
    { name: "name", required: true },
    { name: "slug", required: false },
    { name: "code", required: false },
    { name: "name_en", required: false },
    { name: "department_slug", required: false },
    { name: "campus_slugs", required: false },
  ],
  curriculum: [
    { name: "program_slug", required: true },
    { name: "version", required: true },
    { name: "course_code", required: true },
    { name: "semester", required: false },
    { name: "requirement", required: false },
    { name: "group", required: false },
    { name: "source_url", required: false },
  ],
};

const csvText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || undefined);

export const importRowSchemas = {
  professors: z.object({
    first_name: z.string().trim().min(1).max(80),
    last_name: z.string().trim().min(1).max(120),
    honorific: csvText(20),
    department_slug: csvText(80),
    campus_slug: csvText(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/)
      .max(80)
      .optional()
      .transform((v) => v || undefined),
  }),
  courses: z.object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Za-z0-9][A-Za-z0-9 ._-]{1,23}$/),
    name: z.string().trim().min(2).max(200),
    name_language: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => v || "es")
      .pipe(z.enum(["es", "en"])),
    department_slug: csvText(80),
    credits: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .pipe(z.number().min(0).max(40).optional()),
    description: csvText(4000),
  }),
  assignments: z.object({
    professor_slug: z.string().trim().toLowerCase().min(1).max(80),
    course_code: z.string().trim().toUpperCase().min(2).max(24),
    campus_slug: csvText(80),
  }),
  teaching: z.object({
    professor_slug: z.string().trim().toLowerCase().min(1).max(80),
    course_code: z.string().trim().toUpperCase().min(2).max(24),
    // Academic term as YEAR-SEASON, e.g. 2026-fall.
    term: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^(20\d{2})-(spring|summer|fall|winter)$/),
    campus_slug: csvText(80),
    section: csvText(24),
    source: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => v || "official")
      .pipe(z.enum(["official", "admin", "student_report"])),
  }),
  programs: z.object({
    name: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/)
      .max(80)
      .optional()
      .transform((v) => v || undefined),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^([A-Za-z0-9][A-Za-z0-9 ._-]{0,23})?$/)
      .optional()
      .transform((v) => v || undefined),
    name_en: csvText(200),
    department_slug: csvText(80),
    // Semicolon-separated campus slugs where the program is offered.
    campus_slugs: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v.split(";").map((x) => x.trim()).filter(Boolean) : [])),
  }),
  curriculum: z.object({
    program_slug: z.string().trim().toLowerCase().min(1).max(80),
    version: z.string().trim().min(1).max(40),
    course_code: z.string().trim().toUpperCase().min(2).max(24),
    semester: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? Number(v) : undefined))
      .pipe(z.number().int().min(1).max(20).optional()),
    requirement: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => v || "required")
      .pipe(z.enum(["required", "elective", "concentration"])),
    group: csvText(120),
    // A source URL marks the curriculum as official. Without one it is stored
    // but never used for recommendations.
    source_url: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined)
      .pipe(z.url().max(500).optional()),
  }),
} satisfies Record<ImportKind, z.ZodType>;

export type ImportRow<K extends ImportKind> = z.output<(typeof importRowSchemas)[K]>;

/** Validates parsed CSV records; returns valid rows (with their 1-based line) and per-row errors. */
export function validateImportRows<K extends ImportKind>(kind: K, records: Record<string, string>[]) {
  const schema = importRowSchemas[kind];
  const valid: { line: number; row: ImportRow<K> }[] = [];
  const errors: { line: number; message: string }[] = [];
  records.forEach((record, index) => {
    // Line 1 is the header row.
    const line = index + 2;
    const parsed = schema.safeParse(record);
    if (parsed.success) valid.push({ line, row: parsed.data as ImportRow<K> });
    else
      errors.push({
        line,
        message: parsed.error.issues.map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`).join("; "),
      });
  });
  return { valid, errors };
}

/** Header check: returns the required columns missing from the file. */
export function missingColumns(kind: ImportKind, headers: string[]) {
  const present = new Set(headers.map((h) => h.trim().toLowerCase()));
  return IMPORT_COLUMNS[kind].filter((c) => c.required && !present.has(c.name)).map((c) => c.name);
}
