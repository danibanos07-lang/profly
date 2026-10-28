"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { getSessionUser, getSupabase, type ServerSupabase } from "@/lib/supabase/server";
import {
  IMPORT_KINDS,
  IMPORT_MAX_ROWS,
  assignmentFormSchema,
  blockedTermSchema,
  campusFormSchema,
  courseFormSchema,
  departmentFormSchema,
  mergeSchema,
  missingColumns,
  prerequisiteFormSchema,
  professorFormSchema,
  termFormSchema,
  universityFormSchema,
  validateImportRows,
  type ImportKind,
} from "@/lib/admin-validation";
import { slugify } from "@/lib/format";
import { USER_ROLES, type UserRole } from "@/lib/constants";

// Every mutation here is also enforced by RLS / SECURITY DEFINER checks in
// the database; the role checks below only give a faster, clearer error.

export type AdminMessage = "saved" | "deleted" | "error" | "forbidden" | "conflict" | "inUse" | "invalid" | "same" | "refreshed" | "merged";

export type AdminState =
  | {
      ok: boolean;
      message: AdminMessage;
      /** Changes on every submission so the client can re-toast identical results. */
      at: number;
      fields?: string[];
      import?: ImportSummary;
    }
  | undefined;

export type ImportSummary = {
  dryRun: boolean;
  valid: number;
  saved: number;
  errors: { line: number; message: string }[];
};

type Staff = { supabase: NonNullable<ServerSupabase>; userId: string };

async function staff(level: "moderator" | "admin"): Promise<Staff | AdminState> {
  const [supabase, user] = await Promise.all([getSupabase(), getSessionUser()]);
  if (!supabase || !user) return fail("forbidden");
  const allowed = level === "admin" ? user.role === "admin" : user.role === "admin" || user.role === "moderator";
  if (!allowed) return fail("forbidden");
  return { supabase, userId: user.id };
}

const isStaff = (value: Staff | AdminState): value is Staff => Boolean(value && "supabase" in value);

function fail(message: AdminMessage, fields?: string[]): AdminState {
  return { ok: false, message, at: Date.now(), fields };
}

function done(message: AdminMessage = "saved"): AdminState {
  revalidatePath("/", "layout");
  return { ok: true, message, at: Date.now() };
}

function dbFail(error: { code?: string; message?: string }): AdminState {
  if (error.code === "42501" || error.message?.includes("forbidden") || error.message?.includes("row-level security")) return fail("forbidden");
  if (error.code === "23505") return fail("conflict");
  if (error.code === "23503") return fail("inUse");
  if (error.code === "23514" || error.code === "22P02" || error.code === "22023") return fail("invalid");
  console.error("[admin]", error.code, error.message);
  return fail("error");
}

function formObject(formData: FormData) {
  return Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
}

function issuesToFields(error: { issues: { path: PropertyKey[] }[] }) {
  return [...new Set(error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean))];
}

const reasonOf = (formData: FormData) => {
  const value = String(formData.get("reason") ?? "").trim().slice(0, 500);
  return value || null;
};

// ---------------------------------------------------------------------------
// Moderation (moderators and admins)
// ---------------------------------------------------------------------------

const REVIEW_ACTIONS = ["publish", "queue", "hide", "remove", "verify_enrollment", "unverify_enrollment"] as const;

export async function moderateReview(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("moderator");
  if (!isStaff(ctx)) return ctx;
  const action = String(formData.get("action"));
  const reviewId = String(formData.get("review_id"));
  if (!(REVIEW_ACTIONS as readonly string[]).includes(action)) return fail("invalid");
  const { error } = await ctx.supabase.rpc("moderate_review", { p_review_id: reviewId, p_action: action, p_reason: reasonOf(formData) ?? undefined });
  return error ? dbFail(error) : done();
}

export async function resolveReport(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("moderator");
  if (!isStaff(ctx)) return ctx;
  const status = String(formData.get("status"));
  if (status !== "dismissed" && status !== "actioned") return fail("invalid");
  const { error } = await ctx.supabase.rpc("resolve_report", {
    p_report_id: String(formData.get("report_id")),
    p_status: status,
    p_note: reasonOf(formData) ?? undefined,
  });
  return error ? dbFail(error) : done();
}

export async function reviewSuggestion(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("moderator");
  if (!isStaff(ctx)) return ctx;
  const status = String(formData.get("status"));
  if (status !== "approved" && status !== "rejected") return fail("invalid");
  const { error } = await ctx.supabase.rpc("review_suggestion", {
    p_suggestion_id: String(formData.get("id")),
    p_status: status,
    p_note: reasonOf(formData) ?? undefined,
  });
  return error ? dbFail(error) : done();
}

export async function resolveCorrection(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("moderator");
  if (!isStaff(ctx)) return ctx;
  const status = String(formData.get("status"));
  if (status !== "resolved" && status !== "rejected") return fail("invalid");
  const { error } = await ctx.supabase.rpc("resolve_correction", {
    p_request_id: String(formData.get("id")),
    p_status: status,
    p_note: reasonOf(formData) ?? undefined,
  });
  return error ? dbFail(error) : done();
}

export async function setUserBan(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("moderator");
  if (!isStaff(ctx)) return ctx;
  const { error } = await ctx.supabase.rpc("admin_set_user_ban", {
    p_user_id: String(formData.get("user_id")),
    p_banned: formData.get("banned") === "true",
    p_reason: reasonOf(formData) ?? undefined,
  });
  return error ? dbFail(error) : done();
}

// ---------------------------------------------------------------------------
// Administration (admins only)
// ---------------------------------------------------------------------------

export async function setUserRole(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const role = String(formData.get("role")) as UserRole;
  if (!USER_ROLES.includes(role)) return fail("invalid");
  const { error } = await ctx.supabase.rpc("admin_set_user_role", { p_user_id: String(formData.get("user_id")), p_role: role });
  return error ? dbFail(error) : done();
}

export async function refreshStats(): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const { error } = await ctx.supabase.rpc("admin_refresh_all_stats");
  return error ? dbFail(error) : done("refreshed");
}

export async function mergeRecords(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = mergeSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail(parsed.error.issues.some((i) => i.message === "same") ? "same" : "invalid");
  const { kind, source, target, reason } = parsed.data;
  const args = { p_source: source, p_target: target, p_reason: reason ?? undefined };
  const { error } =
    kind === "professor" ? await ctx.supabase.rpc("admin_merge_professors", args) : await ctx.supabase.rpc("admin_merge_courses", args);
  return error ? dbFail(error) : done("merged");
}

export async function saveProfessor(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = professorFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await ctx.supabase.from("professors").update(values).eq("id", id)
    : await ctx.supabase.from("professors").insert({ ...values, created_by: ctx.userId });
  return error ? dbFail(error) : done();
}

export async function saveCourse(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = courseFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await ctx.supabase.from("courses").update(values).eq("id", id)
    : await ctx.supabase.from("courses").insert({ ...values, created_by: ctx.userId });
  return error ? dbFail(error) : done();
}

export async function addPrerequisite(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = prerequisiteFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const values = parsed.data;
  const { error } = await ctx.supabase.from("course_prerequisites").insert({
    ...values,
    verified_by: values.is_verified ? ctx.userId : null,
    verified_at: values.is_verified ? new Date().toISOString() : null,
  });
  return error ? dbFail(error) : done();
}

export async function setPrerequisiteVerified(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const verified = formData.get("verified") === "true";
  const id = String(formData.get("id"));
  if (verified) {
    const { data } = await ctx.supabase.from("course_prerequisites").select("source_url").eq("id", id).maybeSingle();
    if (!data?.source_url) return fail("invalid", ["source_url"]);
  }
  const { error } = await ctx.supabase
    .from("course_prerequisites")
    .update({ is_verified: verified, verified_by: verified ? ctx.userId : null, verified_at: verified ? new Date().toISOString() : null })
    .eq("id", id);
  return error ? dbFail(error) : done();
}

export async function deletePrerequisite(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const { error } = await ctx.supabase.from("course_prerequisites").delete().eq("id", String(formData.get("id")));
  return error ? dbFail(error) : done("deleted");
}

export async function addAssignment(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = assignmentFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { error } = await ctx.supabase.from("professor_courses").insert(parsed.data);
  return error ? dbFail(error) : done();
}

export async function setAssignmentActive(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const { error } = await ctx.supabase
    .from("professor_courses")
    .update({ is_active: formData.get("active") === "true" })
    .eq("id", String(formData.get("id")));
  return error ? dbFail(error) : done();
}

export async function deleteAssignment(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const id = String(formData.get("id"));
  // Reviews reference the assignment; keep history by deactivating instead.
  const { count } = await ctx.supabase.from("reviews").select("id", { count: "exact", head: true }).eq("professor_course_id", id);
  if (count) return fail("inUse");
  const { error } = await ctx.supabase.from("professor_courses").delete().eq("id", id);
  return error ? dbFail(error) : done("deleted");
}

export async function saveUniversity(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = universityFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...values } = parsed.data;
  const { error } = await ctx.supabase.from("universities").update(values).eq("id", id);
  return error ? dbFail(error) : done();
}

export async function saveCampus(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = campusFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...rest } = parsed.data;
  const values = { ...rest, slug: rest.slug ?? slugify(rest.name) };
  if (values.is_default) {
    // Only one default campus per university.
    const { error } = await ctx.supabase
      .from("campuses")
      .update({ is_default: false })
      .eq("university_id", values.university_id)
      .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    if (error) return dbFail(error);
  }
  const { error } = id ? await ctx.supabase.from("campuses").update(values).eq("id", id) : await ctx.supabase.from("campuses").insert(values);
  return error ? dbFail(error) : done();
}

export async function saveDepartment(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = departmentFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...rest } = parsed.data;
  const values = { ...rest, slug: rest.slug ?? slugify(rest.name) };
  const { error } = id ? await ctx.supabase.from("departments").update(values).eq("id", id) : await ctx.supabase.from("departments").insert(values);
  return error ? dbFail(error) : done();
}

export async function saveTerm(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = termFormSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { id, ...values } = parsed.data;
  const { error } = id
    ? await ctx.supabase.from("academic_terms").update(values).eq("id", id)
    : await ctx.supabase.from("academic_terms").insert(values);
  return error ? dbFail(error) : done();
}

export async function addBlockedTerm(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const parsed = blockedTermSchema.safeParse(formObject(formData));
  if (!parsed.success) return fail("invalid", issuesToFields(parsed.error));
  const { error } = await ctx.supabase.from("blocked_terms").insert(parsed.data);
  return error ? dbFail(error) : done();
}

export async function deleteBlockedTerm(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const { error } = await ctx.supabase.from("blocked_terms").delete().eq("id", String(formData.get("id")));
  return error ? dbFail(error) : done("deleted");
}

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

const CHUNK = 200;

export async function importCsv(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const ctx = await staff("admin");
  if (!isStaff(ctx)) return ctx;
  const kind = String(formData.get("kind")) as ImportKind;
  const universityId = String(formData.get("university_id"));
  const dryRun = formData.get("dry_run") === "on";
  if (!IMPORT_KINDS.includes(kind)) return fail("invalid", ["kind"]);

  const file = formData.get("file");
  let text = String(formData.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > 2 * 1024 * 1024) return fail("invalid", ["file"]);
    text = await file.text();
  }
  if (!text.trim()) return fail("invalid", ["file"]);

  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  const missing = missingColumns(kind, parsed.meta.fields ?? []);
  if (missing.length) return fail("invalid", missing);
  if (parsed.data.length > IMPORT_MAX_ROWS) return fail("invalid", ["rows"]);

  const { valid, errors } = validateImportRows(kind, parsed.data);
  const summary: ImportSummary = { dryRun, valid: 0, saved: 0, errors };

  const [departments, campuses] = await Promise.all([
    ctx.supabase.from("departments").select("id, slug").eq("university_id", universityId),
    ctx.supabase.from("campuses").select("id, slug").eq("university_id", universityId),
  ]);
  const departmentBySlug = new Map((departments.data ?? []).map((d) => [d.slug, d.id]));
  const campusBySlug = new Map((campuses.data ?? []).map((c) => [c.slug, c.id]));
  const rowError = (line: number, message: string) => errors.push({ line, message });

  type Pending<T> = { line: number; values: T };
  const inserts: Pending<Record<string, unknown>>[] = [];
  const updates: Pending<Record<string, unknown>>[] = [];

  if (kind === "professors") {
    const rows = valid as { line: number; row: ReturnType<typeof validateImportRows<"professors">>["valid"][number]["row"] }[];
    const slugs = rows.map(({ row }) => row.slug ?? slugify(`${row.first_name} ${row.last_name}`));
    const { data: existing } = await ctx.supabase.from("professors").select("id, slug, university_id").in("slug", slugs);
    const bySlug = new Map((existing ?? []).map((p) => [p.slug, p]));
    rows.forEach(({ line, row }, i) => {
      const slug = slugs[i];
      const departmentId = row.department_slug ? departmentBySlug.get(row.department_slug) : null;
      const campusId = row.campus_slug ? campusBySlug.get(row.campus_slug) : null;
      if (departmentId === undefined) return rowError(line, "department_slug: unknown");
      if (campusId === undefined) return rowError(line, "campus_slug: unknown");
      const values = {
        first_name: row.first_name,
        last_name: row.last_name,
        honorific: row.honorific ?? null,
        department_id: departmentId,
        primary_campus_id: campusId,
      };
      const match = bySlug.get(slug);
      if (match) {
        // Only an explicit slug may update an existing person; two different
        // people can share a name.
        if (!row.slug) return rowError(line, `slug: "${slug}" already exists, add a slug column to update it or disambiguate`);
        if (match.university_id !== universityId) return rowError(line, "slug: belongs to another university");
        updates.push({ line, values: { ...values, id: match.id } });
      } else {
        inserts.push({ line, values: { ...values, slug, university_id: universityId, created_by: ctx.userId } });
      }
    });
  }

  if (kind === "courses") {
    const rows = valid as { line: number; row: ReturnType<typeof validateImportRows<"courses">>["valid"][number]["row"] }[];
    const { data: existing } = await ctx.supabase
      .from("courses")
      .select("id, code")
      .eq("university_id", universityId)
      .in(
        "code",
        rows.map(({ row }) => row.code),
      );
    const byCode = new Map((existing ?? []).map((c) => [c.code.toUpperCase(), c.id]));
    for (const { line, row } of rows) {
      const departmentId = row.department_slug ? departmentBySlug.get(row.department_slug) : null;
      if (departmentId === undefined) {
        rowError(line, "department_slug: unknown");
        continue;
      }
      const values = {
        name: row.name,
        name_language: row.name_language,
        department_id: departmentId,
        credits: row.credits ?? null,
        description: row.description ?? null,
      };
      const id = byCode.get(row.code);
      if (id) updates.push({ line, values: { ...values, id } });
      else inserts.push({ line, values: { ...values, code: row.code, slug: slugify(`${row.code} ${row.name}`), university_id: universityId, created_by: ctx.userId } });
    }
  }

  if (kind === "assignments") {
    const rows = valid as { line: number; row: ReturnType<typeof validateImportRows<"assignments">>["valid"][number]["row"] }[];
    const [professors, courses] = await Promise.all([
      ctx.supabase.from("professors").select("id, slug").eq("university_id", universityId).in("slug", rows.map(({ row }) => row.professor_slug)),
      ctx.supabase.from("courses").select("id, code").eq("university_id", universityId).in("code", rows.map(({ row }) => row.course_code)),
    ]);
    const professorBySlug = new Map((professors.data ?? []).map((p) => [p.slug, p.id]));
    const courseByCode = new Map((courses.data ?? []).map((c) => [c.code.toUpperCase(), c.id]));
    for (const { line, row } of rows) {
      const professorId = professorBySlug.get(row.professor_slug);
      const courseId = courseByCode.get(row.course_code);
      const campusId = row.campus_slug ? campusBySlug.get(row.campus_slug) : null;
      if (!professorId) rowError(line, "professor_slug: unknown");
      else if (!courseId) rowError(line, "course_code: unknown");
      else if (campusId === undefined) rowError(line, "campus_slug: unknown");
      else inserts.push({ line, values: { professor_id: professorId, course_id: courseId, campus_id: campusId } });
    }
  }

  summary.valid = inserts.length + updates.length;
  if (dryRun) {
    errors.sort((a, b) => a.line - b.line);
    return { ok: true, message: "saved", at: Date.now(), import: summary };
  }

  const table = kind === "professors" ? "professors" : kind === "courses" ? "courses" : "professor_courses";

  const db = ctx.supabase;
  async function insertRows(batch: Pending<Record<string, unknown>>[]) {
    const query =
      kind === "assignments"
        ? db.from("professor_courses").upsert(batch.map((b) => b.values) as never, { onConflict: "professor_id,course_id", ignoreDuplicates: true })
        : db.from(table).insert(batch.map((b) => b.values) as never);
    return (await query).error;
  }

  for (let i = 0; i < inserts.length; i += CHUNK) {
    const batch = inserts.slice(i, i + CHUNK);
    const error = await insertRows(batch);
    if (!error) {
      summary.saved += batch.length;
      continue;
    }
    // Retry one by one so a single bad row doesn't sink the batch.
    for (const item of batch) {
      const rowErr = await insertRows([item]);
      if (rowErr) rowError(item.line, rowErr.code === "23505" ? "duplicate" : rowErr.message);
      else summary.saved += 1;
    }
  }
  for (const item of updates) {
    const { id, ...values } = item.values as { id: string };
    const { error } = await ctx.supabase.from(table).update(values as never).eq("id", id);
    if (error) rowError(item.line, error.message);
    else summary.saved += 1;
  }

  errors.sort((a, b) => a.line - b.line);
  revalidatePath("/", "layout");
  return { ok: true, message: "saved", at: Date.now(), import: summary };
}
