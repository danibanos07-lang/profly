"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { AdminForm, SubmitButton } from "./admin-form";
import { CheckboxField, Field } from "./admin-ui";
import {
  addAssignment,
  addBlockedTerm,
  deleteAssignment,
  deleteBlockedTerm,
  mergeRecords,
  resolveCorrection,
  reviewSuggestion,
  saveCampus,
  saveDepartment,
  saveTerm,
  saveUniversity,
  setAssignmentActive,
  setUserBan,
  setUserRole,
} from "@/lib/actions/admin";
import { TERM_SEASONS, USER_ROLES, type UserRole } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/client";
import type { Tables } from "@/lib/supabase/database.types";

// Small client forms used across the admin pages. Each one posts to a server
// action that re-checks the caller's role.

type Option = { id: string; label: string };

export function AssignmentAddForm({ professors, courses, campuses }: { professors: Option[]; courses: Option[]; campuses: Option[] }) {
  const { t } = useI18n();
  return (
    <AdminForm action={addAssignment} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_1fr_200px_auto] sm:items-end">
      <Field label={t.common.professor} htmlFor="professor_id">
        <NativeSelect id="professor_id" name="professor_id" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {professors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t.common.course} htmlFor="course_id">
        <NativeSelect id="course_id" name="course_id" required defaultValue="">
          <option value="" disabled>
            —
          </option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label={t.common.campus} htmlFor="campus_id">
        <NativeSelect id="campus_id" name="campus_id" defaultValue="">
          <option value="">{t.admin.assignments.anyCampus}</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SubmitButton size="default">{t.admin.assignments.add}</SubmitButton>
    </AdminForm>
  );
}

export function AssignmentRowActions({ id, active, hasReviews }: { id: string; active: boolean; hasReviews: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex justify-end gap-1">
      <AdminForm action={setAssignmentActive}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={String(!active)} />
        <SubmitButton variant="ghost">{active ? t.admin.common.inactive : t.admin.common.active}</SubmitButton>
      </AdminForm>
      {!hasReviews && (
        <AdminForm action={deleteAssignment} confirm={t.admin.common.confirm}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="ghost" className="text-destructive">
            <Trash2 />
            <span className="sr-only">{t.admin.common.delete}</span>
          </SubmitButton>
        </AdminForm>
      )}
    </div>
  );
}

export function UniversityForm({ university, canEdit }: { university: Tables<"universities">; canEdit: boolean }) {
  const { t } = useI18n();
  const i = t.admin.institutions;
  return (
    <AdminForm action={saveUniversity} className="grid gap-4">
      <input type="hidden" name="id" value={university.id} />
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <Field label={i.name} htmlFor={`u-name-${university.id}`}>
          <Input id={`u-name-${university.id}`} name="name" required defaultValue={university.name} />
        </Field>
        <Field label={i.shortName} htmlFor={`u-short-${university.id}`}>
          <Input id={`u-short-${university.id}`} name="short_name" required defaultValue={university.short_name} />
        </Field>
        <Field label={i.emailDomains} htmlFor={`u-domains-${university.id}`} hint={i.emailDomainsHint}>
          <Input id={`u-domains-${university.id}`} name="email_domains" defaultValue={university.email_domains.join(", ")} placeholder="tec.mx" />
        </Field>
        <Field label={i.website} htmlFor={`u-web-${university.id}`}>
          <Input id={`u-web-${university.id}`} name="website_url" type="url" defaultValue={university.website_url ?? ""} />
        </Field>
        <div className="flex items-center justify-between gap-3 sm:col-span-2">
          <CheckboxField name="is_active" label={t.admin.common.active} defaultChecked={university.is_active} />
          {canEdit && <SubmitButton>{t.admin.common.save}</SubmitButton>}
        </div>
      </fieldset>
    </AdminForm>
  );
}

export function CampusForm({ campus, universityId, canEdit }: { campus?: Tables<"campuses">; universityId: string; canEdit: boolean }) {
  const { t } = useI18n();
  const i = t.admin.institutions;
  const key = campus?.id ?? "new";
  return (
    <AdminForm action={saveCampus} resetOnSuccess={!campus} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="id" value={campus?.id ?? ""} />
      <input type="hidden" name="university_id" value={universityId} />
      <fieldset disabled={!canEdit} className="contents">
        <Field label={i.name} htmlFor={`c-name-${key}`}>
          <Input id={`c-name-${key}`} name="name" required defaultValue={campus?.name} />
        </Field>
        <Field label={i.slug} htmlFor={`c-slug-${key}`}>
          <Input id={`c-slug-${key}`} name="slug" defaultValue={campus?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
        </Field>
        <Field label={i.city} htmlFor={`c-city-${key}`}>
          <Input id={`c-city-${key}`} name="city" defaultValue={campus?.city ?? ""} />
        </Field>
        <Field label={i.state} htmlFor={`c-state-${key}`}>
          <Input id={`c-state-${key}`} name="state" defaultValue={campus?.state ?? ""} />
        </Field>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
          <CheckboxField name="is_active" label={t.admin.common.active} defaultChecked={campus?.is_active ?? false} />
          <CheckboxField name="is_default" label={i.isDefault} defaultChecked={campus?.is_default ?? false} />
          {canEdit && <SubmitButton className="ml-auto">{campus ? t.admin.common.save : i.addCampus}</SubmitButton>}
        </div>
      </fieldset>
    </AdminForm>
  );
}

export function DepartmentForm({ department, universityId, canEdit }: { department?: Tables<"departments">; universityId: string; canEdit: boolean }) {
  const { t } = useI18n();
  const i = t.admin.institutions;
  const key = department?.id ?? "new";
  return (
    <AdminForm action={saveDepartment} resetOnSuccess={!department} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="id" value={department?.id ?? ""} />
      <input type="hidden" name="university_id" value={universityId} />
      <input type="hidden" name="slug" value={department?.slug ?? ""} />
      <fieldset disabled={!canEdit} className="contents">
        <Field label={i.name} htmlFor={`d-name-${key}`}>
          <Input id={`d-name-${key}`} name="name" required defaultValue={department?.name} />
        </Field>
        <Field label={i.nameEn} htmlFor={`d-en-${key}`}>
          <Input id={`d-en-${key}`} name="name_en" defaultValue={department?.name_en ?? ""} />
        </Field>
        {canEdit ? <SubmitButton size="default">{department ? t.admin.common.save : i.addDepartment}</SubmitButton> : <span />}
      </fieldset>
    </AdminForm>
  );
}

export function TermForm({ term, universityId, canEdit }: { term?: Tables<"academic_terms">; universityId: string; canEdit: boolean }) {
  const { t } = useI18n();
  const tt = t.admin.terms;
  const key = term?.id ?? "new";
  return (
    <AdminForm action={saveTerm} resetOnSuccess={!term} className="grid gap-3 sm:grid-cols-[90px_1fr_1fr_1fr_1fr] sm:items-end">
      <input type="hidden" name="id" value={term?.id ?? ""} />
      <input type="hidden" name="university_id" value={universityId} />
      <fieldset disabled={!canEdit} className="contents">
        <Field label={tt.year} htmlFor={`t-year-${key}`}>
          <Input id={`t-year-${key}`} name="year" type="number" min={2000} max={2100} required defaultValue={term?.year ?? new Date().getFullYear()} />
        </Field>
        <Field label={tt.season} htmlFor={`t-season-${key}`}>
          <NativeSelect id={`t-season-${key}`} name="season" defaultValue={term?.season ?? "fall"}>
            {TERM_SEASONS.map((s) => (
              <option key={s} value={s}>
                {t.enums.term_season[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={tt.label} htmlFor={`t-label-${key}`}>
          <Input id={`t-label-${key}`} name="label" required maxLength={60} defaultValue={term?.label} placeholder="Ago–Dic 2026" />
        </Field>
        <Field label={tt.startsOn} htmlFor={`t-start-${key}`}>
          <Input id={`t-start-${key}`} name="starts_on" type="date" defaultValue={term?.starts_on ?? ""} />
        </Field>
        <Field label={tt.endsOn} htmlFor={`t-end-${key}`}>
          <Input id={`t-end-${key}`} name="ends_on" type="date" defaultValue={term?.ends_on ?? ""} />
        </Field>
        <div className="flex items-center gap-4 sm:col-span-5">
          <CheckboxField name="is_open_for_reviews" label={tt.openForReviews} defaultChecked={term?.is_open_for_reviews ?? true} />
          {canEdit && <SubmitButton className="ml-auto">{term ? t.admin.common.save : tt.add}</SubmitButton>}
        </div>
      </fieldset>
    </AdminForm>
  );
}

export function BlockedTermForm() {
  const { t } = useI18n();
  const v = t.admin.vocabulary;
  return (
    <AdminForm action={addBlockedTerm} resetOnSuccess className="grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
      <Field label={v.term} htmlFor="term">
        <Input id="term" name="term" required minLength={2} maxLength={80} />
      </Field>
      <Field label={v.severity} htmlFor="severity">
        <NativeSelect id="severity" name="severity" defaultValue="flag">
          <option value="flag">{v.severities.flag}</option>
          <option value="block">{v.severities.block}</option>
        </NativeSelect>
      </Field>
      <SubmitButton size="default">{v.add}</SubmitButton>
    </AdminForm>
  );
}

export function DeleteBlockedTerm({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <AdminForm action={deleteBlockedTerm} confirm={t.admin.common.confirm}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost" className="text-destructive">
        <Trash2 />
        <span className="sr-only">{t.admin.common.delete}</span>
      </SubmitButton>
    </AdminForm>
  );
}

export function MergeForm({ kind, options }: { kind: "professor" | "course"; options: Option[] }) {
  const { t } = useI18n();
  const m = t.admin.merge;
  return (
    <AdminForm action={mergeRecords} resetOnSuccess confirm={t.admin.common.confirm} className="grid gap-4">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={m.source} htmlFor={`${kind}-source`}>
          <NativeSelect id={`${kind}-source`} name="source" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={m.target} htmlFor={`${kind}-target`}>
          <NativeSelect id={`${kind}-target`} name="target" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t.admin.common.reason} htmlFor={`${kind}-reason`} className="min-w-60 flex-1">
          <Input id={`${kind}-reason`} name="reason" maxLength={500} placeholder={t.admin.common.reasonPlaceholder} />
        </Field>
        <SubmitButton size="default" variant="destructive">
          {m.run}
        </SubmitButton>
      </div>
    </AdminForm>
  );
}

export function SuggestionActions({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <AdminForm action={reviewSuggestion} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input name="reason" placeholder={t.admin.common.note} aria-label={t.admin.common.note} className="h-8 min-w-40 flex-1 text-sm" maxLength={500} />
      <SubmitButton name="status" value="approved">
        {t.admin.suggestions.approve}
      </SubmitButton>
      <SubmitButton name="status" value="rejected" variant="outline">
        {t.admin.suggestions.reject}
      </SubmitButton>
    </AdminForm>
  );
}

export function CorrectionActions({ id }: { id: string }) {
  const { t } = useI18n();
  return (
    <AdminForm action={resolveCorrection} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Input name="reason" placeholder={t.admin.common.note} aria-label={t.admin.common.note} className="h-8 min-w-40 flex-1 text-sm" maxLength={500} />
      <SubmitButton name="status" value="resolved">
        {t.admin.corrections.resolve}
      </SubmitButton>
      <SubmitButton name="status" value="rejected" variant="outline">
        {t.admin.corrections.reject}
      </SubmitButton>
    </AdminForm>
  );
}

export function UserActions({ userId, role, banned, canSetRole, isSelf }: { userId: string; role: UserRole; banned: boolean; canSetRole: boolean; isSelf: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canSetRole && !isSelf && (
        <AdminForm action={setUserRole} confirm={t.admin.common.confirm} className="flex items-center gap-1">
          <input type="hidden" name="user_id" value={userId} />
          <NativeSelect name="role" defaultValue={role} aria-label={t.admin.users.setRole} className="w-36">
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {t.enums.user_role[r]}
              </option>
            ))}
          </NativeSelect>
          <SubmitButton variant="outline">{t.admin.common.save}</SubmitButton>
        </AdminForm>
      )}
      {!isSelf && (
        <AdminForm action={setUserBan} confirm={banned ? undefined : `${t.admin.users.banHint} ${t.admin.common.confirm}`}>
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="banned" value={String(!banned)} />
          <SubmitButton variant={banned ? "outline" : "destructive"}>{banned ? t.admin.users.unban : t.admin.users.ban}</SubmitButton>
        </AdminForm>
      )}
    </div>
  );
}
