import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Flag, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookmarkButton } from "@/components/catalog/bookmark-button";
import { ComboTable } from "@/components/catalog/combo-table";
import { TagCloud } from "@/components/catalog/tag-cloud";
import { DemoBadge } from "@/components/common/demo-badge";
import { Disclosure } from "@/components/common/disclosure";
import { EmptyState } from "@/components/common/empty-state";
import { Distribution } from "@/components/rating/distribution";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { Stars } from "@/components/rating/stars";
import { ReviewList } from "@/components/reviews/review-list";
import { getComboGrades, getMyVotes, getProfessor, getReviews, isBookmarked } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam, uuidParam } from "@/lib/params";
import { ATTENDANCE_POLICIES, GRADE_MIN_SAMPLE, LOW_CONFIDENCE_THRESHOLD, PROFESSOR_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/professors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProfessor(slug);
  if (result.status !== "found") return {};
  const { professor } = result;
  return {
    title: professor.display_name,
    description: `${professor.display_name} · ${professor.department_name ?? ""} · ${professor.review_count} reviews`,
  };
}

const avgKey = {
  clarity: "avg_clarity",
  attitude: "avg_attitude",
  grading_fairness: "avg_grading_fairness",
  availability: "avg_availability",
  organization: "avg_organization",
  engagement: "avg_engagement",
} as const;

export default async function ProfessorPage({ params, searchParams }: PageProps<"/professors/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const [{ t, locale }, result, user] = await Promise.all([getI18n(), getProfessor(slug), getSessionUser()]);
  if (result.status === "merged") permanentRedirect(`/professors/${result.slug}`);
  if (result.status === "missing") notFound();
  const { professor, courses } = result;

  const sort = sortParam(sp);
  const page = pageParam(sp);
  const courseFilter = uuidParam(sp, "course");
  const filteredCombo = courseFilter ? courses.find((c) => c.course_id === courseFilter) : undefined;
  const [{ reviews, total }, saved, grades] = await Promise.all([
    getReviews({ professorId: professor.id, professorCourseId: filteredCombo?.id, sort, page }),
    isBookmarked({ professorId: professor.id }),
    getComboGrades("professor", professor.id),
  ]);
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const department = locale === "en" ? professor.department_name_en ?? professor.department_name : professor.department_name;
  const lowConfidence = professor.review_count > 0 && professor.review_count < LOW_CONFIDENCE_THRESHOLD;
  const attendance = professor.attendance_counts as Record<string, number>;
  const attendanceTotal = Object.values(attendance).reduce((a, b) => a + Number(b), 0);
  const writeHref = `/reviews/new?professor=${professor.slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Essentials: who, how good, what they teach */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              {professor.honorific && <span className="mr-1.5 font-normal text-muted-foreground">{professor.honorific}</span>}
              {professor.display_name}
            </h1>
            {professor.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {[department, professor.university_short_name, professor.campus_name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <BookmarkButton target={{ professorId: professor.id }} initialSaved={saved} signedIn={Boolean(user)} />
          <Button asChild>
            <Link href={writeHref}>
              <PenLine />
              {t.professor.rateThis}
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-5" aria-label={t.ratings.overall}>
        <div className="flex items-center gap-4">
          <ScoreBadge value={professor.avg_overall} size="lg" label={t.ratings.overall} />
          <div>
            <div className="text-sm font-medium">{t.ratings.overall}</div>
            <Stars value={professor.avg_overall} className="mt-1" />
            <div className="mt-1 text-xs text-muted-foreground tabular">{format(t.common.basedOn, { count: professor.review_count })}</div>
          </div>
        </div>
        <dl className="flex gap-8 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t.ratings.takeAgain}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular">{formatPercent(professor.would_take_again_pct)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t.ratings.difficulty}</dt>
            <dd className="mt-0.5 text-xl font-semibold tabular">
              {formatRating(professor.avg_difficulty)}
              <span className="text-sm font-normal text-muted-foreground">/5</span>
            </dd>
          </div>
        </dl>
      </section>
      {lowConfidence && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>}

      <section aria-labelledby="by-course" className="mt-12">
        <h2 id="by-course" className="text-lg font-semibold">
          {t.professor.coursesTaught}
        </h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t.professor.teachesHint}</p>
        {courses.length ? <ComboTable rows={courses} mode="courses" t={t} grades={grades} /> : <EmptyState title={t.common.unknown} />}
        <p className="mt-3 text-xs text-muted-foreground">
          {t.grades.disclaimer} {format(t.grades.minimum, { min: GRADE_MIN_SAMPLE })}
        </p>
      </section>

      <section id="reviews" aria-labelledby="reviews-title" className="mt-12 scroll-mt-24">
        <h2 id="reviews-title" className="mb-3 text-lg font-semibold">
          {t.professor.reviewsTitle}
        </h2>
        {courses.length > 1 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            <Link
              href={`/professors/${professor.slug}#reviews`}
              scroll={false}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-subtle", !filteredCombo && "border-foreground/30 bg-secondary")}
            >
              {t.common.all}
            </Link>
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/professors/${professor.slug}?course=${c.course_id}#reviews`}
                scroll={false}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-subtle",
                  filteredCombo?.id === c.id && "border-foreground/30 bg-secondary",
                )}
              >
                {c.course_name}
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                  {c.review_count}
                </Badge>
              </Link>
            ))}
          </div>
        )}
        <ReviewList
          reviews={reviews}
          total={total}
          page={page}
          pageSize={10}
          sort={sort}
          basePath={`/professors/${professor.slug}`}
          extraParams={{ course: filteredCombo?.course_id }}
          context="professor"
          t={t}
          locale={locale}
          votes={votes}
          signedIn={Boolean(user)}
          writeHref={writeHref}
        />
      </section>

      {/* Progressive disclosure: breakdowns for students who want more */}
      <div className="mt-12 grid gap-3">
        <Disclosure title={t.professor.categoryBreakdown}>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-10">
            {PROFESSOR_CATEGORIES.map((key) => (
              <RatingBar key={key} label={t.ratings.professor[key]} hint={t.ratings.professorHints[key]} value={professor[avgKey[key]]} />
            ))}
          </div>
          <div className="mt-6 max-w-md">
            <h3 className="mb-2 text-sm font-medium">{t.ratings.distribution}</h3>
            <Distribution counts={professor.rating_distribution} title={t.ratings.distribution} />
          </div>
        </Disclosure>
        <Disclosure title={t.professor.moreDetails}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium">{t.professor.attendance}</h3>
              {attendanceTotal === 0 ? (
                <p className="text-sm text-muted-foreground">{t.professor.attendanceUnknown}</p>
              ) : (
                <ul className="grid gap-2 text-sm">
                  {ATTENDANCE_POLICIES.map((policy) => {
                    const n = Number(attendance[policy] ?? 0);
                    return (
                      <li key={policy} className="flex items-center justify-between gap-3">
                        <span>{t.enums.attendance_policy[policy]}</span>
                        <span className="text-muted-foreground tabular">{Math.round((n / attendanceTotal) * 100)}%</span>
                      </li>
                    );
                  })}
                  <li className="pt-1 text-xs text-muted-foreground">{format(t.professor.reportsFromStudents, { count: attendanceTotal })}</li>
                </ul>
              )}
            </div>
            <div className="grid content-start gap-5">
              <div>
                <h3 className="mb-2 text-sm font-medium">{t.professor.methods}</h3>
                <TagCloud counts={professor.tag_counts} group="methods" t={t} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">{t.professor.strengths}</h3>
                <TagCloud counts={professor.tag_counts} group="strengths" t={t} />
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">{t.professor.weaknesses}</h3>
                <TagCloud counts={professor.tag_counts} group="weaknesses" t={t} />
              </div>
            </div>
          </div>
        </Disclosure>
        <Link href={`/corrections?professor=${professor.id}`} className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <Flag className="size-3.5" />
          {t.professor.reportInaccuracy}
        </Link>
      </div>
    </div>
  );
}
