"use client";

import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { AdminForm, SubmitButton } from "./admin-form";
import { CheckboxField, Field } from "./admin-ui";
import { saveCourse, saveProfessor } from "@/lib/actions/admin";
import { useI18n } from "@/lib/i18n/client";
import type { Tables } from "@/lib/supabase/database.types";

type Option = { id: string; name: string };

export function ProfessorForm({
  professor,
  universityId,
  departments,
  campuses,
  canEdit,
}: {
  professor?: Tables<"professors">;
  universityId: string;
  departments: Option[];
  campuses: Option[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const p = t.admin.professors;
  return (
    <AdminForm
      action={saveProfessor}
      className="grid gap-5"
      onResult={(state) => {
        if (state.ok && !professor) router.push("/admin/professors");
      }}
    >
      {!professor && (
        <Alert variant="info">
          <AlertDescription>{p.realDataNotice}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" name="id" value={professor?.id ?? ""} />
      <input type="hidden" name="university_id" value={professor?.university_id ?? universityId} />
      <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
        <Field label={p.firstName} htmlFor="first_name">
          <Input id="first_name" name="first_name" required maxLength={80} defaultValue={professor?.first_name} />
        </Field>
        <Field label={p.lastName} htmlFor="last_name">
          <Input id="last_name" name="last_name" required maxLength={120} defaultValue={professor?.last_name} />
        </Field>
        <Field label={p.honorific} htmlFor="honorific">
          <Input id="honorific" name="honorific" maxLength={20} placeholder="Dr., Mtra.…" defaultValue={professor?.honorific ?? ""} />
        </Field>
        <Field label={p.slug} htmlFor="slug" hint={p.slugHint}>
          <Input id="slug" name="slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={professor?.slug ?? ""} />
        </Field>
        <Field label={p.department} htmlFor="department_id">
          <NativeSelect id="department_id" name="department_id" defaultValue={professor?.department_id ?? ""}>
            <option value="">{t.admin.common.none}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={p.campus} htmlFor="primary_campus_id">
          <NativeSelect id="primary_campus_id" name="primary_campus_id" defaultValue={professor?.primary_campus_id ?? ""}>
            <option value="">{t.admin.common.none}</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:col-span-2">
          <CheckboxField name="is_active" label={p.isActive} defaultChecked={professor?.is_active ?? true} />
          <CheckboxField name="is_fictional" label={p.isFictional} defaultChecked={professor?.is_fictional ?? false} />
        </div>
      </fieldset>
      {canEdit && (
        <div>
          <SubmitButton size="default">{professor ? t.admin.common.save : t.admin.common.create}</SubmitButton>
        </div>
      )}
    </AdminForm>
  );
}

export function CourseForm({
  course,
  universityId,
  departments,
  canEdit,
}: {
  course?: Tables<"courses">;
  universityId: string;
  departments: Option[];
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const c = t.admin.courses;
  return (
    <AdminForm
      action={saveCourse}
      className="grid gap-5"
      onResult={(state) => {
        if (state.ok && !course) router.push("/admin/courses");
      }}
    >
      <input type="hidden" name="id" value={course?.id ?? ""} />
      <input type="hidden" name="university_id" value={course?.university_id ?? universityId} />
      <fieldset disabled={!canEdit} className="grid gap-5 sm:grid-cols-2">
        <Field label={c.code} htmlFor="code">
          <Input id="code" name="code" required maxLength={24} className="font-mono uppercase" defaultValue={course?.code} />
        </Field>
        <Field label={t.admin.professors.slug} htmlFor="slug" hint={t.admin.professors.slugHint}>
          <Input id="slug" name="slug" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={course?.slug ?? ""} />
        </Field>
        <Field label={c.name} htmlFor="name" className="sm:col-span-2">
          <Input id="name" name="name" required maxLength={200} defaultValue={course?.name} />
        </Field>
        <Field label={c.nameLanguage} htmlFor="name_language">
          <NativeSelect id="name_language" name="name_language" defaultValue={course?.name_language ?? "es"}>
            <option value="es">{c.languages.es}</option>
            <option value="en">{c.languages.en}</option>
          </NativeSelect>
        </Field>
        <Field label={t.admin.professors.department} htmlFor="department_id">
          <NativeSelect id="department_id" name="department_id" defaultValue={course?.department_id ?? ""}>
            <option value="">{t.admin.common.none}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={c.credits} htmlFor="credits">
          <Input id="credits" name="credits" type="number" min={0} max={40} step={0.5} defaultValue={course?.credits ?? ""} />
        </Field>
        <Field label={c.description} htmlFor="description" className="sm:col-span-2">
          <Textarea id="description" name="description" rows={3} maxLength={4000} defaultValue={course?.description ?? ""} />
        </Field>
        <Field label={c.recommendedKnowledge} htmlFor="recommended_knowledge" hint={c.recommendedHint} className="sm:col-span-2">
          <Textarea id="recommended_knowledge" name="recommended_knowledge" rows={3} maxLength={2000} defaultValue={course?.recommended_knowledge ?? ""} />
        </Field>
        <div className="grid gap-3 sm:col-span-2">
          <CheckboxField name="is_active" label={t.admin.professors.isActive} defaultChecked={course?.is_active ?? true} />
          <CheckboxField name="is_fictional" label={t.admin.professors.isFictional} defaultChecked={course?.is_fictional ?? false} />
        </div>
      </fieldset>
      {canEdit && (
        <div>
          <SubmitButton size="default">{course ? t.admin.common.save : t.admin.common.create}</SubmitButton>
        </div>
      )}
    </AdminForm>
  );
}
