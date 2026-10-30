import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Columns3, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboTable } from "@/components/catalog/combo-table";
import { DemoBadge } from "@/components/common/demo-badge";
import { Disclosure } from "@/components/common/disclosure";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { GradeStat } from "@/components/rating/grade-stat";
import { ReviewList } from "@/components/reviews/review-list";
import { getCombination, getComboGrades, getCourse, getMyVotes, getProfessor, getReviews } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam } from "@/lib/params";
import { GRADE_MIN_SAMPLE, LOW_CONFIDENCE_THRESHOLD, PROFESSOR_CATEGORIES } from "@/lib/constants";

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
  const [{ reviews, total }, courseGrades, professorGrades] = await Promise.all([
    getReviews({ professorCourseId: combo.id, sort, page }),
    getComboGrades("course", course.id),
    getComboGrades("professor", professor.id),
  ]);
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const delta = combo.avg_overall != null && professor.avg_overall != null ? Number(combo.avg_overall) - Number(professor.avg_overall) : null;
  const names = { professor: professor.display_name, course: course.name };
  const writeHref = `/reviews/new?professor=${professor.slug}&course=${course.slug}`;

  const tile = "rounded-2xl border bg-card p-4";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <nav className="mb-4 text-sm text-muted-foreground" aria-label="breadcrumb">
        <Link href={`/professors/${professor.slug}`} className="hover:text-foreground">
          {professor.display_name}
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/courses/${course.slug}`} className="hover:text-foreground">
          {course.code}
        </Link>
      </nav>

      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {professor.display_name}
              <span className="font-normal text-muted-foreground"> — </span>
              {course.name}
            </h1>
            {(professor.is_fictional || course.is_fictional) && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{format(t.combo.subtitle, names)}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
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

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className={`${tile} col-span-2 flex items-center gap-4 lg:col-span-1`}>
          <ScoreBadge value={combo.avg_overall} size="md" label={t.ratings.overall} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t.combo.teachingRating}</div>
            {delta !== null && (
              <div className={`mt-0.5 flex items-center gap-1 text-xs font-medium tabular ${delta >= 0 ? "text-score-5" : "text-score-1"}`}>
                {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                {delta >= 0 ? "+" : ""}
                {delta.toFixed(1)} {t.combo.vsOverall}
              </div>
            )}
          </div>
        </div>
        <div className={tile}>
          <div className="text-xs font-medium text-muted-foreground">{t.ratings.difficulty}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular">
            {formatRating(combo.avg_difficulty)}
            <span className="text-sm font-normal text-muted-foreground">/5</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {formatHours(combo.avg_weekly_hours)} {t.common.hoursPerWeek}
          </div>
        </div>
        <div className={tile}>
          <div className="text-xs font-medium text-muted-foreground">{t.combo.studentReviews}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular">{combo.review_count}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {t.ratings.takeAgain} {formatPercent(combo.would_take_again_pct)}
          </div>
        </div>
        <GradeStat summary={courseGrades[combo.id]} t={t} className="col-span-2 lg:col-span-1" />
      </section>
      {combo.review_count > 0 && combo.review_count < LOW_CONFIDENCE_THRESHOLD && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {t.grades.disclaimer} {format(t.grades.minimum, { min: GRADE_MIN_SAMPLE })}
      </p>

      <section id="reviews" className="mt-12 scroll-mt-24">
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

      <div className="mt-12 grid gap-3">
        {otherProfessors.length > 1 && (
          <Disclosure title={format(t.combo.otherProfessors, names)} defaultOpen>
            <ComboTable rows={otherProfessors.filter((c) => c.id !== combo.id)} mode="professors" t={t} grades={courseGrades} />
          </Disclosure>
        )}
        <Disclosure title={t.professor.categoryBreakdown}>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-10">
            {PROFESSOR_CATEGORIES.map((key) => (
              <RatingBar key={key} label={t.ratings.professor[key]} value={combo[avgKey[key]]} />
            ))}
            <RatingBar label={t.ratings.course.satisfaction} value={combo.avg_satisfaction} />
          </div>
        </Disclosure>
        {otherCourses.length > 1 && (
          <Disclosure title={format(t.combo.otherCourses, names)}>
            <ComboTable rows={otherCourses.filter((c) => c.id !== combo.id)} mode="courses" t={t} grades={professorGrades} />
          </Disclosure>
        )}
      </div>
    </div>
  );
}
