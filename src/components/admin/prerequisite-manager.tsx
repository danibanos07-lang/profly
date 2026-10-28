"use client";

import { BadgeCheck, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { AdminForm, SubmitButton } from "./admin-form";
import { CheckboxField, Field } from "./admin-ui";
import { addPrerequisite, deletePrerequisite, setPrerequisiteVerified } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/client";

type Prerequisite = {
  id: string;
  description: string | null;
  is_verified: boolean;
  source_url: string | null;
  prerequisite: { code: string; name: string } | null;
};

export function PrerequisiteManager({
  courseId,
  prerequisites,
  courses,
  canEdit,
}: {
  courseId: string;
  prerequisites: Prerequisite[];
  courses: { id: string; code: string; name: string }[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const c = t.admin.courses;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{c.prereqHint}</p>
      {prerequisites.length > 0 ? (
        <ul className="grid gap-2">
          {prerequisites.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3 text-sm">
              <div className="min-w-0 flex-1">
                {p.prerequisite ? (
                  <span>
                    <span className="font-mono text-xs text-muted-foreground">{p.prerequisite.code}</span> {p.prerequisite.name}
                  </span>
                ) : (
                  <span>{p.description}</span>
                )}
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noreferrer noopener" className="ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {c.sourceUrl}
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <Badge variant={p.is_verified ? "success" : "warning"}>
                {p.is_verified && <BadgeCheck className="size-3" />}
                {p.is_verified ? c.verified : c.unverified}
              </Badge>
              {canEdit && (
                <>
                  <AdminForm action={setPrerequisiteVerified}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="verified" value={String(!p.is_verified)} />
                    <SubmitButton variant="ghost">{p.is_verified ? c.unverified : c.verified}</SubmitButton>
                  </AdminForm>
                  <AdminForm action={deletePrerequisite} confirm={t.admin.common.confirm}>
                    <input type="hidden" name="id" value={p.id} />
                    <SubmitButton variant="ghost" className="text-destructive">
                      <Trash2 />
                      <span className="sr-only">{t.admin.common.delete}</span>
                    </SubmitButton>
                  </AdminForm>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t.admin.common.empty}</p>
      )}

      {canEdit && (
        <AdminForm action={addPrerequisite} resetOnSuccess className="grid gap-4 rounded-xl border border-dashed p-4 sm:grid-cols-2">
          <input type="hidden" name="course_id" value={courseId} />
          <Field label={c.prereqCourse} htmlFor="prerequisite_course_id">
            <NativeSelect id="prerequisite_course_id" name="prerequisite_course_id" defaultValue="">
              <option value="">{t.admin.common.none}</option>
              {courses
                .filter((course) => course.id !== courseId)
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} — {course.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field label={c.prereqDescription} htmlFor="prereq_description">
            <Input id="prereq_description" name="description" maxLength={500} />
          </Field>
          <Field label={c.sourceUrl} htmlFor="source_url" className="sm:col-span-2">
            <Input id="source_url" name="source_url" type="url" placeholder="https://" />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2">
            <CheckboxField name="is_verified" label={c.verified} />
            <SubmitButton>{c.addPrereq}</SubmitButton>
          </div>
        </AdminForm>
      )}
    </div>
  );
}
