import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BadgeCheck, Building2, Clock, Code2, Columns3, Flag, Gauge, Info, Lightbulb, PenLine, Sigma, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookmarkButton } from "@/components/catalog/bookmark-button";
import { ComboTable } from "@/components/catalog/combo-table";
import { DemoBadge } from "@/components/common/demo-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Distribution } from "@/components/rating/distribution";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { Stat } from "@/components/rating/stat";
import { ReviewList } from "@/components/reviews/review-list";
import { getCourse, getMyVotes, getReviews, isBookmarked } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam } from "@/lib/params";
import { COURSE_CATEGORIES, HOMEWORK_FREQUENCIES, LOW_CONFIDENCE_THRESHOLD, TEAMWORK_LEVELS } from "@/lib/constants";

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
  const [{ reviews, total }, saved] = await Promise.all([
    getReviews({ courseId: course.id, sort, page }),
    isBookmarked({ courseId: course.id }),
  ]);
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const department = locale === "en" ? course.department_name_en ?? course.department_name : course.department_name;
  const official = prerequisites.filter((p) => p.is_verified);
  const reported = prerequisites.filter((p) => !p.is_verified);
  const writeHref = `/reviews/new?course=${course.slug}`;
  const languageName = course.name_language === "en" ? (locale === "es" ? "inglés" : "English") : locale === "es" ? "español" : "Spanish";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium">{course.code}</span>
            {course.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
          </div>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl" lang={course.name_language ?? undefined}>
            {course.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {department && (
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4" />
                {department}
              </span>
            )}
            <span>{course.university_short_name}</span>
            {course.credits != null && (
              <span>
                {t.course.credits}: {course.credits}
              </span>
            )}
            {course.name_language !== locale && (
              <span className="flex items-center gap-1">
                <Info className="size-3.5" />
                {format(t.course.originalLanguage, { language: languageName })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BookmarkButton target={{ courseId: course.id }} initialSaved={saved} signedIn={Boolean(user)} />
          {professors.length > 1 && (
            <Button asChild variant="outline">
              <Link href={`/compare?course=${course.slug}`}>
                <Columns3 />
                {t.course.compareProfessors}
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={writeHref}>
              <PenLine />
              {t.course.rateThis}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
          <ScoreBadge value={course.avg_satisfaction} size="lg" label={t.ratings.course.satisfaction} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t.ratings.course.satisfaction}</div>
            <div className="mt-1 text-xs text-muted-foreground tabular">{format(t.common.basedOn, { count: course.review_count })}</div>
          </div>
        </div>
        <Stat label={t.ratings.difficulty} value={`${formatRating(course.avg_difficulty)}/5`} icon={<Gauge className="size-3.5" />} />
        <Stat label={t.ratings.weeklyHours} value={`${formatHours(course.avg_weekly_hours)} ${t.common.hoursPerWeek}`} hint={`${t.ratings.workload} ${formatRating(course.avg_workload)}/5`} icon={<Clock className="size-3.5" />} />
        <Stat label={t.ratings.recommend} value={formatPercent(course.recommend_pct)} hint={`${t.ratings.usefulness} ${formatRating(course.avg_usefulness)}/5`} icon={<ThumbsUp className="size-3.5" />} />
      </section>
      {course.review_count > 0 && course.review_count < LOW_CONFIDENCE_THRESHOLD && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
        <aside className="grid content-start gap-6">
          {course.description && (
            <Card>
              <CardHeader>
                <CardTitle>{t.course.description}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t.course.officialPrereqs}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {official.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.course.noOfficialPrereqs}</p>
              ) : (
                <ul className="grid gap-2">
                  {official.map((p) => (
                    <li key={p.id} className="flex items-start gap-2 text-sm">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-score-5" aria-label={t.course.verified} />
                      <span>
                        {p.prerequisite ? (
                          <Link href={`/courses/${p.prerequisite.slug}`} className="font-medium hover:text-primary">
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                {t.course.studentPrep}
              </CardTitle>
              <CardDescription>{t.course.studentPrepHint}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.course.studentReports}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 text-sm">
              {COURSE_CATEGORIES.map((key) => (
                <RatingBar
                  key={key}
                  label={t.ratings.course[key]}
                  hint={t.ratings.courseHints[key]}
                  value={course[avgKey[key]]}
                  neutral={key === "difficulty" || key === "workload"}
                />
              ))}
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t.ratings.difficulty}</div>
                <Distribution counts={course.difficulty_distribution} labels={t.ratings.difficultyScale} title={t.ratings.difficulty} />
              </div>
              <dl className="grid grid-cols-2 gap-3">
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
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t.course.homework}</div>
                <Histogram counts={course.homework_counts as Record<string, number>} keys={HOMEWORK_FREQUENCIES} labels={t.enums.homework_frequency} />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium text-muted-foreground">{t.course.teamwork}</div>
                <Histogram counts={course.teamwork_counts as Record<string, number>} keys={TEAMWORK_LEVELS} labels={t.enums.teamwork_level} />
              </div>
            </CardContent>
          </Card>
          <Link href={`/corrections?course=${course.id}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <Flag className="size-3.5" />
            {t.footer.corrections}
          </Link>
        </aside>

        <div className="grid content-start gap-10">
          <section>
            <h2 className="text-lg font-semibold">{t.course.taughtBy}</h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{t.course.taughtByHint}</p>
            {professors.length ? <ComboTable rows={professors} mode="professors" t={t} /> : <EmptyState title={t.common.unknown} />}
          </section>
          <section id="reviews" className="scroll-mt-24">
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
        </div>
      </div>
    </div>
  );
}
