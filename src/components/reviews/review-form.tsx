"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Lock, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { StarInput } from "@/components/rating/star-input";
import { useSuggestions } from "@/components/search/use-suggestions";
import { fetchCombos, type ComboOption } from "@/lib/actions/catalog";
import { submitReview, updateReview } from "@/lib/actions/reviews";
import {
  ATTENDANCE_POLICIES,
  COURSE_CATEGORIES,
  HOMEWORK_FREQUENCIES,
  MAX_TAGS,
  PROFESSOR_CATEGORIES,
  REVIEW_ADVICE_MAX,
  REVIEW_BODY_MAX,
  REVIEW_BODY_MIN,
  TAG_GROUPS,
  TEACHING_FORMATS,
  TEAMWORK_LEVELS,
  type CourseCategory,
  type ProfessorCategory,
  type ReviewTag,
} from "@/lib/constants";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/config";
import { containsContactInfo } from "@/lib/moderation";
import type { ReviewInput } from "@/lib/validation";
import { cn } from "@/lib/utils";

type Option = { id: string; label: string };

export type ReviewFormValues = {
  professor_course_id: string;
  campus_id: string;
  term_id: string;
  teaching_format: ReviewInput["teaching_format"] | "";
  would_take_again: boolean | null;
  recommends_course: boolean | null;
  weekly_hours: string;
  exam_count: string;
  exam_difficulty: number | null;
  homework_frequency: string;
  teamwork_level: string;
  attendance_policy: string;
  requires_programming: boolean | null;
  requires_math: boolean | null;
  prior_knowledge_needed: boolean | null;
  tags: ReviewTag[];
  body: string;
  advice: string;
  professor_scores: Record<ProfessorCategory, number | null>;
  course_scores: Record<CourseCategory, number | null>;
};

export function emptyValues(campusId: string, termId: string): ReviewFormValues {
  return {
    professor_course_id: "",
    campus_id: campusId,
    term_id: termId,
    teaching_format: "in_person",
    would_take_again: null,
    recommends_course: null,
    weekly_hours: "",
    exam_count: "",
    exam_difficulty: null,
    homework_frequency: "",
    teamwork_level: "",
    attendance_policy: "",
    requires_programming: null,
    requires_math: null,
    prior_knowledge_needed: null,
    tags: [],
    body: "",
    advice: "",
    professor_scores: Object.fromEntries(PROFESSOR_CATEGORIES.map((k) => [k, null])) as Record<ProfessorCategory, number | null>,
    course_scores: Object.fromEntries(COURSE_CATEGORIES.map((k) => [k, null])) as Record<CourseCategory, number | null>,
  };
}

function Segmented<T extends string | boolean>({
  value,
  onChange,
  options,
  name,
  invalid,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  name: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("inline-flex flex-wrap gap-1 rounded-xl bg-muted p-1", invalid && "ring-2 ring-destructive/40")}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            value === o.value && "bg-card text-foreground shadow-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="mb-5 flex items-center gap-3 font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{step}</span>
        {title}
      </h2>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
      <AlertCircle className="size-3.5" />
      {message}
    </p>
  );
}

function ProfessorPicker({ onPick }: { onPick: (p: { id: string; name: string }) => void }) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { items, loading } = useSuggestions(query);
  const professors = items.filter((i) => i.kind === "professor");
  const listId = useId();
  return (
    <div className="relative">
      <Input
        role="combobox"
        aria-expanded={open && professors.length > 0}
        aria-controls={listId}
        placeholder={t.reviewForm.professorPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {loading && <Loader2 className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" />}
      {open && query.trim().length >= 2 && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border bg-popover p-1 shadow-lift">
          {professors.length === 0 && !loading && <li className="px-3 py-4 text-center text-sm text-muted-foreground">{t.search.noResults}</li>}
          {professors.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick({ id: p.id, name: p.title });
                setQuery("");
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
            >
              <UserRound className="size-4 text-muted-foreground" />
              <span className="flex-1">
                <span className="block font-medium">{p.title}</span>
                {p.subtitle && <span className="block text-xs text-muted-foreground">{p.subtitle}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReviewForm({
  mode,
  reviewId,
  campuses,
  terms,
  initialValues,
  initialProfessor,
  initialCombos = [],
  courseProfessors = [],
  lockedLabel,
}: {
  mode: "create" | "edit";
  reviewId?: string;
  campuses: Option[];
  terms: Option[];
  initialValues: ReviewFormValues;
  initialProfessor?: { id: string; name: string } | null;
  /** Courses of the preselected professor. */
  initialCombos?: ComboOption[];
  /** When a course is preselected without a professor: who teaches it. */
  courseProfessors?: ComboOption[];
  /** Edit mode: "Professor · Course · Term" (cannot change). */
  lockedLabel?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState<ReviewFormValues>(initialValues);
  const [professor, setProfessor] = useState(initialProfessor ?? null);
  const [combos, setCombos] = useState<ComboOption[]>(initialCombos);
  const [loadingCombos, startLoadingCombos] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(mode === "edit");
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  function pickProfessor(p: { id: string; name: string }) {
    setProfessor(p);
    set("professor_course_id", "");
    startLoadingCombos(async () => {
      const result = await fetchCombos({ professorId: p.id });
      setCombos(result);
      if (result.length === 1) set("professor_course_id", result[0].id);
    });
  }

  // Default the campus to the assignment's campus when picking a course.
  useEffect(() => {
    const combo = combos.find((c) => c.id === values.professor_course_id);
    if (combo?.campus_id && campuses.some((c) => c.id === combo.campus_id)) setValues((v) => ({ ...v, campus_id: combo.campus_id! }));
  }, [values.professor_course_id, combos, campuses]);

  const errorText = (key?: string) => {
    if (!key) return undefined;
    const map: Record<string, string> = {
      tooShort: format(t.reviewForm.bodyHelp, { min: REVIEW_BODY_MIN }),
      personalInfo: t.errors.personalInfo,
      tooLong: t.errors.invalidInput,
    };
    return map[key] ?? t.errors.invalidInput;
  };

  const bodyHasContact = useMemo(() => containsContactInfo(values.body) || containsContactInfo(values.advice), [values.body, values.advice]);

  function validateLocally() {
    const e: Record<string, string> = {};
    if (!values.professor_course_id) e.professor_course_id = "required";
    if (!values.term_id) e.term_id = "required";
    if (!values.campus_id) e.campus_id = "required";
    for (const k of PROFESSOR_CATEGORIES) if (!values.professor_scores[k]) e[`professor_scores.${k}`] = "required";
    for (const k of COURSE_CATEGORIES) if (!values.course_scores[k]) e[`course_scores.${k}`] = "required";
    if (values.would_take_again === null) e.would_take_again = "required";
    if (values.recommends_course === null) e.recommends_course = "required";
    if (values.weekly_hours === "") e.weekly_hours = "required";
    if (values.body.trim().length < REVIEW_BODY_MIN) e.body = "tooShort";
    if (bodyHasContact) e.body = "personalInfo";
    return e;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const local = validateLocally();
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError(Object.keys(local).some((k) => k.includes("scores")) ? t.reviewForm.rateAll : t.errors.invalidInput);
      return;
    }
    const input: ReviewInput = {
      professor_course_id: values.professor_course_id,
      campus_id: values.campus_id,
      term_id: values.term_id,
      teaching_format: values.teaching_format as ReviewInput["teaching_format"],
      would_take_again: values.would_take_again!,
      recommends_course: values.recommends_course!,
      weekly_hours: Number(values.weekly_hours),
      exam_count: values.exam_count === "" ? null : Number(values.exam_count),
      exam_difficulty: values.exam_difficulty,
      homework_frequency: (values.homework_frequency || null) as ReviewInput["homework_frequency"],
      teamwork_level: (values.teamwork_level || null) as ReviewInput["teamwork_level"],
      attendance_policy: (values.attendance_policy || null) as ReviewInput["attendance_policy"],
      requires_programming: values.requires_programming,
      requires_math: values.requires_math,
      prior_knowledge_needed: values.prior_knowledge_needed,
      tags: values.tags,
      body: values.body,
      advice: values.advice,
      professor_scores: values.professor_scores as Record<ProfessorCategory, number>,
      course_scores: values.course_scores as Record<CourseCategory, number>,
      accepts_guidelines: true,
    };
    startTransition(async () => {
      const result = mode === "edit" && reviewId ? await updateReview(reviewId, input) : await submitReview(input);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        const key = result.error;
        const msg =
          key === "needsConfirmation"
            ? t.reviewForm.needsConfirmation
            : key === "banned"
              ? t.reviewForm.banned
              : (t.errors as Record<string, string>)[key] ?? t.errors.generic;
        setFormError(msg);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const queued = result.data.queued;
      toast.success(mode === "edit" ? t.reviewForm.updated : queued ? t.reviewForm.successQueued : t.reviewForm.success);
      const combo = combos.find((c) => c.id === values.professor_course_id);
      router.push(combo && !queued ? `/professors/${combo.professor_slug}/${combo.course_slug}` : "/dashboard");
      router.refresh();
    });
  }

  const yesNo = [
    { value: true, label: t.common.yes },
    { value: false, label: t.common.no },
  ];
  const selectedTags = new Set(values.tags);
  const toggleTag = (tag: ReviewTag) =>
    set("tags", selectedTags.has(tag) ? values.tags.filter((x) => x !== tag) : values.tags.length >= MAX_TAGS ? values.tags : [...values.tags, tag]);

  return (
    <form onSubmit={onSubmit} className="grid gap-6" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Section step={1} title={t.reviewForm.stepClass}>
        {mode === "edit" ? (
          <div className="flex items-center gap-2 rounded-xl bg-subtle px-4 py-3 text-sm">
            <Lock className="size-4 text-muted-foreground" />
            {lockedLabel}
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label>{t.reviewForm.professor}</Label>
              {professor ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border bg-subtle px-4 py-2.5">
                  <span className="flex items-center gap-2 font-medium">
                    <UserRound className="size-4 text-muted-foreground" />
                    {professor.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t.common.edit}
                    onClick={() => {
                      setProfessor(null);
                      setCombos([]);
                      set("professor_course_id", "");
                    }}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <>
                  {courseProfessors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {courseProfessors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setProfessor({ id: c.professor_id, name: c.professor_name });
                            startLoadingCombos(async () => {
                              setCombos(await fetchCombos({ professorId: c.professor_id }));
                              set("professor_course_id", c.id);
                            });
                          }}
                          className="cursor-pointer rounded-full border bg-card px-3 py-1.5 text-sm shadow-soft hover:border-primary/40 hover:text-primary"
                        >
                          {c.professor_name}
                        </button>
                      ))}
                    </div>
                  )}
                  <ProfessorPicker onPick={pickProfessor} />
                </>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rf-course">{t.reviewForm.course}</Label>
              <NativeSelect
                id="rf-course"
                value={values.professor_course_id}
                disabled={!professor || loadingCombos}
                aria-invalid={Boolean(errors.professor_course_id)}
                onChange={(e) => set("professor_course_id", e.target.value)}
              >
                <option value="">{professor ? t.reviewForm.coursePlaceholder : t.reviewForm.selectProfessorFirst}</option>
                {combos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} · {c.course_name}
                  </option>
                ))}
              </NativeSelect>
              {professor && !loadingCombos && combos.length === 0 && <p className="text-xs text-muted-foreground">{t.reviewForm.noCourses}</p>}
              <Link href="/suggest" className="text-xs text-primary hover:underline">
                {t.reviewForm.missing}
              </Link>
            </div>
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="rf-term">{t.reviewForm.term}</Label>
            <NativeSelect
              id="rf-term"
              value={values.term_id}
              disabled={mode === "edit"}
              aria-invalid={Boolean(errors.term_id)}
              onChange={(e) => set("term_id", e.target.value)}
            >
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rf-campus">{t.reviewForm.campus}</Label>
            <NativeSelect id="rf-campus" value={values.campus_id} onChange={(e) => set("campus_id", e.target.value)}>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t.reviewForm.format}</Label>
          <Segmented
            name={t.reviewForm.format}
            value={values.teaching_format || null}
            onChange={(v) => set("teaching_format", v)}
            options={TEACHING_FORMATS.map((f) => ({ value: f, label: t.enums.teaching_format[f] }))}
          />
        </div>
      </Section>

      <Section step={2} title={t.reviewForm.professorRatings}>
        <div className="grid gap-4">
          {PROFESSOR_CATEGORIES.map((key) => (
            <div key={key} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div>
                <div className="text-sm font-medium">{t.ratings.professor[key]}</div>
                <div className="text-xs text-muted-foreground">{t.ratings.professorHints[key]}</div>
              </div>
              <StarInput
                name={`ps-${key}`}
                ariaLabel={t.ratings.professor[key]}
                value={values.professor_scores[key]}
                labels={t.ratings.scale}
                invalid={Boolean(errors[`professor_scores.${key}`])}
                onChange={(n) => set("professor_scores", { ...values.professor_scores, [key]: n })}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <Label>{t.reviewForm.takeAgain}</Label>
          <Segmented
            name={t.reviewForm.takeAgain}
            value={values.would_take_again}
            invalid={Boolean(errors.would_take_again)}
            onChange={(v) => set("would_take_again", v)}
            options={yesNo}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rf-attendance">{t.reviewForm.attendance}</Label>
          <NativeSelect id="rf-attendance" value={values.attendance_policy} onChange={(e) => set("attendance_policy", e.target.value)}>
            <option value="">{t.common.optional}</option>
            {ATTENDANCE_POLICIES.map((p) => (
              <option key={p} value={p}>
                {t.enums.attendance_policy[p]}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Section>

      <Section step={3} title={t.reviewForm.courseRatings}>
        <div className="grid gap-4">
          {COURSE_CATEGORIES.map((key) => (
            <div key={key} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
              <div>
                <div className="text-sm font-medium">{t.ratings.course[key]}</div>
                <div className="text-xs text-muted-foreground">{t.ratings.courseHints[key]}</div>
              </div>
              <StarInput
                name={`cs-${key}`}
                ariaLabel={t.ratings.course[key]}
                value={values.course_scores[key]}
                labels={key === "difficulty" || key === "workload" ? t.ratings.difficultyScale : t.ratings.scale}
                invalid={Boolean(errors[`course_scores.${key}`])}
                onChange={(n) => set("course_scores", { ...values.course_scores, [key]: n })}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          <Label>{t.reviewForm.recommend}</Label>
          <Segmented
            name={t.reviewForm.recommend}
            value={values.recommends_course}
            invalid={Boolean(errors.recommends_course)}
            onChange={(v) => set("recommends_course", v)}
            options={yesNo}
          />
        </div>
      </Section>

      <Section step={4} title={t.reviewForm.stepDetails}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="rf-hours">{t.reviewForm.weeklyHours}</Label>
            <Input
              id="rf-hours"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={values.weekly_hours}
              aria-invalid={Boolean(errors.weekly_hours)}
              onChange={(e) => set("weekly_hours", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rf-exams">{t.reviewForm.examCount}</Label>
            <Input id="rf-exams" type="number" inputMode="numeric" min={0} max={20} value={values.exam_count} onChange={(e) => set("exam_count", e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rf-homework">{t.reviewForm.homework}</Label>
            <NativeSelect id="rf-homework" value={values.homework_frequency} onChange={(e) => set("homework_frequency", e.target.value)}>
              <option value="">{t.common.optional}</option>
              {HOMEWORK_FREQUENCIES.map((h) => (
                <option key={h} value={h}>
                  {t.enums.homework_frequency[h]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rf-teamwork">{t.reviewForm.teamwork}</Label>
            <NativeSelect id="rf-teamwork" value={values.teamwork_level} onChange={(e) => set("teamwork_level", e.target.value)}>
              <option value="">{t.common.optional}</option>
              {TEAMWORK_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {t.enums.teamwork_level[l]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="grid gap-2">
          <Label>{t.reviewForm.examDifficulty}</Label>
          <StarInput name="exam-difficulty" ariaLabel={t.reviewForm.examDifficulty} value={values.exam_difficulty} labels={t.ratings.difficultyScale} onChange={(n) => set("exam_difficulty", n)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["requires_programming", t.reviewForm.programming],
              ["requires_math", t.reviewForm.math],
              ["prior_knowledge_needed", t.reviewForm.priorKnowledge],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="grid content-start gap-2">
              <Label>{label}</Label>
              <Segmented name={label} value={values[key]} onChange={(v) => set(key, v)} options={yesNo} />
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          <Label>{format(t.reviewForm.tags, { max: MAX_TAGS })}</Label>
          {(Object.keys(TAG_GROUPS) as (keyof typeof TAG_GROUPS)[]).map((group) => (
            <div key={group}>
              <div className="mb-1.5 text-xs text-muted-foreground">{t.tags.groups[group]}</div>
              <div className="flex flex-wrap gap-1.5">
                {TAG_GROUPS[group].map((tag) => {
                  const on = selectedTags.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                      )}
                    >
                      {on && <Check className="size-3" />}
                      {t.tags[tag]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section step={5} title={t.reviewForm.stepWrite}>
        <div className="grid gap-2">
          <Label htmlFor="rf-body">{t.reviewForm.body}</Label>
          <Textarea
            id="rf-body"
            rows={7}
            maxLength={REVIEW_BODY_MAX}
            placeholder={t.reviewForm.bodyPlaceholder}
            value={values.body}
            aria-invalid={Boolean(errors.body) || bodyHasContact}
            aria-describedby="rf-body-help"
            onChange={(e) => set("body", e.target.value)}
          />
          <div id="rf-body-help" className="flex justify-between gap-4 text-xs text-muted-foreground">
            <span>{format(t.reviewForm.bodyHelp, { min: REVIEW_BODY_MIN })}</span>
            <span className={cn("shrink-0 tabular", values.body.trim().length < REVIEW_BODY_MIN && "text-amber-600")}>
              {format(t.reviewForm.characters, { count: values.body.length, max: REVIEW_BODY_MAX })}
            </span>
          </div>
          {bodyHasContact ? <FieldError message={t.errors.personalInfo} /> : <FieldError message={errorText(errors.body)} />}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rf-advice">
            {t.reviews.advice} <span className="font-normal text-muted-foreground">({t.common.optional})</span>
          </Label>
          <Textarea
            id="rf-advice"
            rows={3}
            maxLength={REVIEW_ADVICE_MAX}
            placeholder={t.reviewForm.advicePlaceholder}
            value={values.advice}
            onChange={(e) => set("advice", e.target.value)}
          />
          <FieldError message={errorText(errors.advice)} />
        </div>
        {mode === "create" && (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" />
            <span>
              {t.reviewForm.guidelinesAgree}{" "}
              <Link href="/guidelines" target="_blank" className="text-primary underline">
                {t.reviewForm.guidelinesLink}
              </Link>
              .
            </span>
          </label>
        )}
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" disabled={pending || !accepted} className="shadow-lift">
          {pending && <Loader2 className="animate-spin" />}
          {pending ? t.reviewForm.submitting : mode === "edit" ? t.reviewForm.saveChanges : t.reviewForm.submit}
        </Button>
      </div>
    </form>
  );
}
