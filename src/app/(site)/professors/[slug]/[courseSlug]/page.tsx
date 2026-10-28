import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Columns3, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboTable } from "@/components/catalog/combo-table";
import { DemoBadge } from "@/components/common/demo-badge";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { Stat } from "@/components/rating/stat";
import { ReviewList } from "@/components/reviews/review-list";
import { getCombination, getCourse, getMyVotes, getProfessor, getReviews } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam } from "@/lib/params";
import { LOW_CONFIDENCE_THRESHOLD, PROFESSOR_CATEGORIES } from "@/lib/constants";

export async function generateMetadata({ params }: PageProps<"/professors/[slug]/[courseSlug]">): Promise<Metadata> {
  const { slug, courseSlug } = await params;
  const combo = await getCombination(slug, courseSlug);
  return combo ? { title: `${combo.professor_name} · ${combo.course_name}` } : {};
}

const avgKey = {
  clarity: "avg_clarity",
  attitude: "avg_attitude",
  grading_fairness: "avg_grading_fairness",
  availability: "avg_availability",
  organization: "avg_organization",
  engagement: "avg_engagement",
} as const;

export default async function CombinationPage({ params, searchParams }: PageProps<"/professors/[slug]/[courseSlug]">) {
  const [{ slug, courseSlug }, sp] = await Promise.all([params, searchParams]);
  const [{ t, locale }, combo, professorResult, courseResult, user] = await Promise.all([
    getI18n(),
    getCombination(slug, courseSlug),
    getProfessor(slug),
    getCourse(courseSlug),
    getSessionUser(),
  ]);
  if (!combo || professorResult.status !== "found" || courseResult.status !== "found") notFound();
  const { professor, courses: otherCourses } = professorResult;
  const { course, professors: otherProfessors } = courseResult;

  const sort = sortParam(sp);
  const page = pageParam(sp);
  const { reviews, total } = await getReviews({ professorCourseId: combo.id, sort, page });
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const delta = combo.avg_overall != null && professor.avg_overall != null ? Number(combo.avg_overall) - Number(professor.avg_overall) : null;
  const names = { professor: professor.display_name, course: course.name };
  const writeHref = `/reviews/new?professor=${professor.slug}&course=${course.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="breadcrumb">
        <Link href={`/professors/${professor.slug}`} className="hover:text-foreground">
          {professor.display_name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/courses/${course.slug}`} className="hover:text-foreground">
          {course.code}
        </Link>
      </nav>

      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {professor.display_name}
              <span className="font-display font-normal text-muted-foreground italic"> {locale === "es" ? "en" : "in"} </span>
              {course.name}
            </h1>
            {(professor.is_fictional || course.is_fictional) && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
          </div>
          <p className="mt-2 text-muted-foreground">{format(t.combo.subtitle, names)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/compare?course=${course.slug}&p=${professor.slug}`}>
              <Columns3 />
              {t.professor.compareInCourse}
            </Link>
          </Button>
          <Button asChild>
            <Link href={writeHref}>
              <PenLine />
              {t.nav.writeReview}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
          <ScoreBadge value={combo.avg_overall} size="lg" label={t.ratings.overall} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t.ratings.professorOverall}</div>
            {delta !== null && (
              <div className={`mt-1 flex items-center gap-1 text-sm font-medium tabular ${delta >= 0 ? "text-score-5" : "text-score-1"}`}>
                {delta >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)}
              </div>
            )}
            <div className="text-xs text-muted-foreground">{t.combo.vsOverall} ({formatRating(professor.avg_overall)})</div>
          </div>
        </div>
        <Stat label={t.ratings.difficulty} value={`${formatRating(combo.avg_difficulty)}/5`} hint={format(t.common.basedOn, { count: combo.review_count })} />
        <Stat label={t.ratings.weeklyHours} value={`${formatHours(combo.avg_weekly_hours)} ${t.common.hoursPerWeek}`} hint={`${t.ratings.workload} ${formatRating(combo.avg_workload)}/5`} />
        <Stat label={t.ratings.takeAgain} value={formatPercent(combo.would_take_again_pct)} hint={`${t.ratings.recommend}: ${formatPercent(combo.recommend_pct)}`} />
      </section>
      {combo.review_count > 0 && combo.review_count < LOW_CONFIDENCE_THRESHOLD && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.professor.categoryBreakdown}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {PROFESSOR_CATEGORIES.map((key) => (
                <RatingBar key={key} label={t.ratings.professor[key]} value={combo[avgKey[key]]} />
              ))}
              <RatingBar label={t.ratings.course.satisfaction} value={combo.avg_satisfaction} />
            </CardContent>
          </Card>
          {otherCourses.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{format(t.combo.otherCourses, names)}</h2>
              <ComboTable rows={otherCourses.filter((c) => c.id !== combo.id)} mode="courses" t={t} />
            </div>
          )}
          {otherProfessors.length > 1 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">{format(t.combo.otherProfessors, names)}</h2>
              <ComboTable rows={otherProfessors.filter((c) => c.id !== combo.id)} mode="professors" t={t} />
            </div>
          )}
        </aside>
        <section id="reviews" className="scroll-mt-24">
          <h2 className="mb-3 text-lg font-semibold">{t.professor.reviewsTitle}</h2>
          <ReviewList
            reviews={reviews}
            total={total}
            page={page}
            pageSize={10}
            sort={sort}
            basePath={`/professors/${professor.slug}/${course.slug}`}
            context="combo"
            t={t}
            locale={locale}
            votes={votes}
            signedIn={Boolean(user)}
            writeHref={writeHref}
          />
        </section>
      </div>
    </div>
  );
}
