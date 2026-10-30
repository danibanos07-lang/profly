"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addCourseRecord, removeCourseRecord, updateAcademicProfile } from "@/lib/actions/academic";
import type { AcademicOptions, AcademicProfile, CourseRecord } from "@/lib/data/academic";
import { useI18n } from "@/lib/i18n/client";

const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1);

/** Short, progressive form: every field is optional and can be filled in later. */
export function AcademicProfileForm({ options, profile }: { options: AcademicOptions; profile: AcademicProfile }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [v, setV] = useState({
    university_id: profile.university_id ?? (options.universities.length === 1 ? options.universities[0].id : ""),
    campus_id: profile.campus_id ?? "",
    program_id: profile.program_id ?? "",
    curriculum_id: profile.curriculum_id ?? "",
    current_semester: profile.current_semester ? String(profile.current_semester) : "",
    start_year: profile.start_year ? String(profile.start_year) : "",
  });
  const campuses = useMemo(() => options.campuses.filter((c) => c.university_id === v.university_id), [options.campuses, v.university_id]);
  const programs = useMemo(() => options.programs.filter((p) => p.university_id === v.university_id), [options.programs, v.university_id]);
  const curricula = useMemo(() => options.curricula.filter((c) => c.program_id === v.program_id), [options.curricula, v.program_id]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateAcademicProfile({
        university_id: v.university_id || null,
        campus_id: v.campus_id || null,
        program_id: v.program_id || null,
        curriculum_id: v.curriculum_id || null,
        current_semester: v.current_semester ? Number(v.current_semester) : null,
        start_year: v.start_year ? Number(v.start_year) : null,
      });
      if (result.ok) {
        toast.success(t.academic.saved);
        router.refresh();
      } else toast.error(t.errors.generic);
    });
  }

  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="a-university">{t.academic.university}</Label>
          <NativeSelect
            id="a-university"
            value={v.university_id}
            onChange={(e) => setV({ ...v, university_id: e.target.value, campus_id: "", program_id: "", curriculum_id: "" })}
          >
            <option value="">—</option>
            {options.universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="a-campus">{t.academic.campus}</Label>
          <NativeSelect id="a-campus" value={v.campus_id} disabled={!v.university_id} onChange={(e) => setV({ ...v, campus_id: e.target.value })}>
            <option value="">{v.university_id ? "—" : t.academic.pickUniversityFirst}</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="a-program">{t.academic.program}</Label>
          <NativeSelect
            id="a-program"
            value={v.program_id}
            disabled={!v.university_id || programs.length === 0}
            onChange={(e) => setV({ ...v, program_id: e.target.value, curriculum_id: "" })}
          >
            <option value="">{!v.university_id ? t.academic.pickUniversityFirst : programs.length === 0 ? t.academic.noPrograms : "—"}</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {locale === "en" ? p.name_en ?? p.name : p.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="a-semester">{t.academic.semester}</Label>
          <NativeSelect id="a-semester" value={v.current_semester} onChange={(e) => setV({ ...v, current_semester: e.target.value })}>
            <option value="">—</option>
            {SEMESTERS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
        </div>
        {curricula.length > 1 && (
          <div className="grid gap-2">
            <Label htmlFor="a-curriculum">{t.academic.curriculum}</Label>
            <NativeSelect id="a-curriculum" value={v.curriculum_id} onChange={(e) => setV({ ...v, curriculum_id: e.target.value })}>
              <option value="">—</option>
              {curricula.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.version_label}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">{t.academic.curriculumHint}</p>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="a-start">
            {t.academic.startYear} <span className="font-normal text-muted-foreground">({t.common.optional})</span>
          </Label>
          <Input
            id="a-start"
            type="number"
            inputMode="numeric"
            min={1990}
            max={2100}
            value={v.start_year}
            onChange={(e) => setV({ ...v, start_year: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t.academic.save}
        </Button>
      </div>
    </form>
  );
}

const STATUSES = ["completed", "in_progress", "failed", "withdrawn"] as const;

export function CourseRecords({ records, courses }: { records: CourseRecord[]; courses: { id: string; code: string; name: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("completed");
  const taken = new Set(records.map((r) => r.course?.id));

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!courseId) return;
    startTransition(async () => {
      const result = await addCourseRecord({ course_id: courseId, status });
      if (!result.ok) return void toast.error(t.errors.generic);
      setCourseId("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeCourseRecord(id);
      if (!result.ok) return void toast.error(t.errors.generic);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <NativeSelect aria-label={t.plan.pickCourse} value={courseId} onChange={(e) => setCourseId(e.target.value)} className="sm:flex-1">
          <option value="">{t.plan.pickCourse}</option>
          {courses
            .filter((c) => !taken.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
        </NativeSelect>
        <NativeSelect aria-label={t.dashboard.status} value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-40">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.plan.statuses[s]}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline" disabled={pending || !courseId}>
          {t.plan.addCourse}
        </Button>
      </form>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.plan.noRecords}</p>
      ) : (
        <ul className="divide-y rounded-2xl border bg-card">
          {records.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">{r.course?.code}</span>
                {r.course?.name}
              </span>
              <span className="text-xs text-muted-foreground">{t.plan.statuses[r.status]}</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={t.plan.remove} disabled={pending} onClick={() => remove(r.id)}>
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
