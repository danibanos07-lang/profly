import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BadgeCheck, Code2, Columns3, Flag, Info, Lightbulb, PenLine, Sigma } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/catalog/bookmark-button";
import { ComboTable } from "@/components/catalog/combo-table";
import { DemoBadge } from "@/components/common/demo-badge";
import { Disclosure } from "@/components/common/disclosure";
import { EmptyState } from "@/components/common/empty-state";
import { Distribution } from "@/components/rating/distribution";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { GradeStat } from "@/components/rating/grade-stat";
import { ReviewList } from "@/components/reviews/review-list";
import { getComboGrades, getCourse, getCourseGrades, getMyVotes, getReviews, isBookmarked } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam } from "@/lib/params";
import { COURSE_CATEGORIES, GRADE_MIN_SAMPLE, HOMEWORK_FREQUENCIES, LOW_CONFIDENCE_THRESHOLD, TEAMWORK_LEVELS } from "@/lib/constants";

export async function generateMetadata({ params }: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCourse(slug);
  if (result.status !== "found") return {};
  return { title: `${result.course.code} ${result.course.name}`, description: result.course.description ?? undefined };
}

const avgKey = {
  difficulty: "avg_difficulty",
  workload: "avg_workload",
  content_clarity: "avg_content_clarity",
  usefulness: "avg_usefulness",
  organization: "avg_organization",
  satisfaction: "avg_satisfaction",
} as const;

function Histogram({ counts, keys, labels }: { counts: Record<string, number>; keys: readonly string[]; labels: Record<string, string> }) {
  const total = keys.reduce((sum, k) => sum + Number(counts[k] ?? 0), 0);
  if (!total) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className="grid gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {keys.map((k, i) => (
          <div
            key={k}
            className="h-full"
            style={{ width: `${(Number(counts[k] ?? 0) / total) * 100}%`, background: `color-mix(in oklch, var(--primary) ${100 - i * 22}%, transparent)` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {keys.map((k) =>
          counts[k] ? (
            <span key={k}>
              {labels[k]} <span className="tabular">{Math.round((Number(counts[k]) / total) * 100)}%</span>
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export default async function CoursePage({ params, searchParams }: PageProps<"/courses/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [{ t, locale }, result, user] = await Promise.all([getI18n(), getCourse(slug), getSessionUser()]);
  if (result.status === "merged") permanentRedirect(`/courses/${result.slug}`);
  if (result.status === "missing") notFound();
  const { course, professors, prerequisites } = result;
  const sort = sortParam(sp);
  const page = pageParam(sp);
  const [{ reviews, total }, saved, courseGrades, grades] = await Promise.all([
    getReviews({ courseId: course.id, sort, page }),
    isBookmarked({ courseId: course.id }),
    getCourseGrades(course.id),
    getComboGrades("course", course.id),
  ]);
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const department = locale === "en" ? course.department_name_en ?? course.department_name : course.department_name;
  const official = prerequisites.filter((p) => p.is_verified);
  const reported = prerequisites.filter((p) => !p.is_verified);
  const writeHref = `/reviews/new?course=${course.slug}`;
  const languageName = course.name_language === "en" ? (locale === "es" ? "inglés" : "English") : locale === "es" ? "español" : "Spanish";

  const tile = "rounded-2xl border bg-card p-4";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{course.code}</span>
            {course.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight" lang={course.name_language ?? undefined}>
            {course.name}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {[department, course.university_short_name, course.credits != null ? `${t.course.credits}: ${course.credits}` : null].filter(Boolean).join(" · ")}
            {course.name_language !== locale && (
              <span className="inline-flex items-center gap-1">
                · <Info className="size-3.5" />
                {format(t.course.originalLanguage, { language: languageName })}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <BookmarkButton target={{ courseId: course.id }} initialSaved={saved} signedIn={Boolean(user)} />
          <Button asChild>
            <Link href={writeHref}>
              <PenLine />
              {t.course.rateThis}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${tile} col-span-2 flex items-center gap-4 lg:col-span-1`}>
          <ScoreBadge value={course.avg_satisfaction} size="md" label={t.ratings.course.satisfaction} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t.ratings.course.satisfaction}</div>
            <div className="mt-0.5 text-xs text-muted-foreground tabular">{format(t.common.basedOn, { count: course.review_count })}</div>
          </div>
        </div>
        <div className={tile}>
          <div className="text-xs font-medium text-muted-foreground">{t.ratings.difficulty}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular">
            {formatRating(course.avg_difficulty)}
            <span className="text-sm font-normal text-muted-foreground">/5</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t.ratings.workload} {formatRating(course.avg_workload)}/5
          </div>
        </div>
        <div className={tile}>
          <div className="text-xs font-medium text-muted-foreground">{t.ratings.weeklyHours}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular">
            {formatHours(course.avg_weekly_hours)}
            <span className="text-sm font-normal text-muted-foreground"> {t.common.hoursPerWeek}</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t.ratings.recommend} {formatPercent(course.recommend_pct)}
          </div>
        </div>
        <GradeStat summary={courseGrades} t={t} className="col-span-2 lg:col-span-1" />
      </section>
      {course.review_count > 0 && course.review_count < LOW_CONFIDENCE_THRESHOLD && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>
      )}

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t.course.taughtBy}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.course.taughtByHint}</p>
          </div>
          {professors.length > 1 && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/compare?course=${course.slug}`}>
                <Columns3 />
                {t.course.compareProfessors}
              </Link>
            </Button>
          )}
        </div>
        <div className="mt-4">
          {professors.length ? <ComboTable rows={professors} mode="professors" t={t} grades={grades} /> : <EmptyState title={t.common.unknown} />}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t.grades.disclaimer} {format(t.grades.minimum, { min: GRADE_MIN_SAMPLE })}
        </p>
      </section>

      <section id="reviews" className="mt-12 scroll-mt-24">
        <h2 className="mb-3 text-lg font-semibold">{t.course.reviewsTitle}</h2>
        <ReviewList
          reviews={reviews}
          total={total}
          page={page}
          pageSize={10}
          sort={sort}
          basePath={`/courses/${course.slug}`}
          context="course"
          t={t}
          locale={locale}
          votes={votes}
          signedIn={Boolean(user)}
          writeHref={writeHref}
        />
      </section>

      <div className="mt-12 grid gap-3">
        <Disclosure title={t.course.aboutCourse}>
          <div className="grid gap-6">
            {course.description && <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>}
            <div>
              <h3 className="mb-2 text-sm font-medium">{t.course.officialPrereqs}</h3>
              {official.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.course.noOfficialPrereqs}</p>
              ) : (
                <ul className="grid gap-2">
                  {official.map((p) => (
                    <li key={p.id} className="flex items-start gap-2 text-sm">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-score-5" aria-label={t.course.verified} />
                      <span>
                        {p.prerequisite ? (
                          <Link href={`/courses/${p.prerequisite.slug}`} className="font-medium hover:underline">
                            <span className="font-mono text-xs text-muted-foreground">{p.prerequisite.code}</span> {p.prerequisite.name}
                          </Link>
                        ) : (
                          p.description
                        )}
                        {p.source_url && (
                          <a href={p.source_url} target="_blank" rel="noopener noreferrer nofollow" className="ml-1 text-xs text-primary underline">
                            ↗
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                  <li className="text-xs text-muted-foreground">{t.course.verifiedHint}</li>
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="size-4 text-amber-500" />
                {t.course.studentPrep}
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">{t.course.studentPrepHint}</p>
              <div className="grid gap-2 text-sm">
                {course.prior_knowledge_pct != null && (
                  <p>
                    <span className="font-semibold tabular">{formatPercent(course.prior_knowledge_pct)}</span>{" "}
                    <span className="text-muted-foreground">{t.course.priorKnowledgePct}</span>
                  </p>
                )}
                {course.recommended_knowledge && <p className="text-muted-foreground">{course.recommended_knowledge}</p>}
                {reported.map((p) => (
                  <div key={p.id} className="flex items-start gap-2">
                    <Badge variant="warning">{t.course.reportedNotVerified}</Badge>
                    <span className="text-muted-foreground">{p.prerequisite ? `${p.prerequisite.code} ${p.prerequisite.name}` : p.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Disclosure>
        <Disclosure title={t.course.studentReports}>
          <div className="grid gap-6 text-sm">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-10">
              {COURSE_CATEGORIES.map((key) => (
                <RatingBar
                  key={key}
                  label={t.ratings.course[key]}
                  hint={t.ratings.courseHints[key]}
                  value={course[avgKey[key]]}
                  neutral={key === "difficulty" || key === "workload"}
                />
              ))}
            </div>
            <div className="max-w-md">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{t.ratings.difficulty}</div>
              <Distribution counts={course.difficulty_distribution} labels={t.ratings.difficultyScale} title={t.ratings.difficulty} />
            </div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-muted-foreground">{t.course.exams}</dt>
                <dd className="font-semibold tabular">{formatHours(course.avg_exam_count)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t.course.examDifficulty}</dt>
                <dd className="font-semibold tabular">{formatRating(course.avg_exam_difficulty)}/5</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Code2 className="size-3" />
                  {t.course.programming}
                </dt>
                <dd className="font-semibold tabular">{formatPercent(course.programming_pct)}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sigma className="size-3" />
                  {t.course.math}
                </dt>
                <dd className="font-semibold tabular">{formatPercent(course.math_pct)}</dd>
              </div>
            </dl>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t.course.homework}</div>
                <Histogram counts={course.homework_counts as Record<string, number>} keys={HOMEWORK_FREQUENCIES} labels={t.enums.homework_frequency} />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t.course.teamwork}</div>
                <Histogram counts={course.teamwork_counts as Record<string, number>} keys={TEAMWORK_LEVELS} labels={t.enums.teamwork_level} />
              </div>
            </div>
          </div>
        </Disclosure>
        <Link href={`/corrections?course=${course.id}`} className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="size-3.5" />
          {t.footer.corrections}
        </Link>
      </div>
    </div>
  );
}
