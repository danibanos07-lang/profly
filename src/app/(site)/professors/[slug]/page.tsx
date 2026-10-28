import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Building2, Clock, Flag, Gauge, MapPin, PenLine, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InitialsAvatar } from "@/components/catalog/avatar";
import { BookmarkButton } from "@/components/catalog/bookmark-button";
import { ComboTable } from "@/components/catalog/combo-table";
import { TagCloud } from "@/components/catalog/tag-cloud";
import { DemoBadge } from "@/components/common/demo-badge";
import { Distribution } from "@/components/rating/distribution";
import { RatingBar } from "@/components/rating/rating-bar";
import { ScoreBadge } from "@/components/rating/score-badge";
import { Stars } from "@/components/rating/stars";
import { Stat } from "@/components/rating/stat";
import { ReviewList } from "@/components/reviews/review-list";
import { getMyVotes, getProfessor, getReviews, isBookmarked } from "@/lib/data/catalog";
import { getSessionUser } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { pageParam, sortParam, uuidParam } from "@/lib/params";
import { ATTENDANCE_POLICIES, LOW_CONFIDENCE_THRESHOLD, PROFESSOR_CATEGORIES } from "@/lib/constants";
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
  const [{ reviews, total }, saved] = await Promise.all([
    getReviews({ professorId: professor.id, professorCourseId: filteredCombo?.id, sort, page }),
    isBookmarked({ professorId: professor.id }),
  ]);
  const votes = await getMyVotes(reviews.map((r) => r.id));
  const department = locale === "en" ? professor.department_name_en ?? professor.department_name : professor.department_name;
  const lowConfidence = professor.review_count > 0 && professor.review_count < LOW_CONFIDENCE_THRESHOLD;
  const attendance = professor.attendance_counts as Record<string, number>;
  const attendanceTotal = Object.values(attendance).reduce((a, b) => a + Number(b), 0);
  const writeHref = `/reviews/new?professor=${professor.slug}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <InitialsAvatar name={professor.display_name} className="size-16 text-lg sm:size-20 sm:text-xl" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {professor.honorific && <span className="mr-1.5 text-muted-foreground">{professor.honorific}</span>}
                {professor.display_name}
              </h1>
              {professor.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {department && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {department}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {professor.university_short_name}
                {professor.campus_name ? ` · ${professor.campus_name}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BookmarkButton target={{ professorId: professor.id }} initialSaved={saved} signedIn={Boolean(user)} />
          <Button asChild>
            <Link href={writeHref}>
              <PenLine />
              {t.professor.rateThis}
            </Link>
          </Button>
        </div>
      </header>

      {/* Headline stats */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label={t.ratings.overall}>
        <div className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-soft">
          <ScoreBadge value={professor.avg_overall} size="lg" label={t.ratings.overall} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t.ratings.overall}</div>
            <Stars value={professor.avg_overall} className="mt-1" />
            <div className="mt-1 text-xs text-muted-foreground tabular">{format(t.common.basedOn, { count: professor.review_count })}</div>
          </div>
        </div>
        <Stat label={t.ratings.takeAgain} value={formatPercent(professor.would_take_again_pct)} icon={<ThumbsUp className="size-3.5" />} />
        <Stat
          label={t.ratings.difficulty}
          value={
            <>
              {formatRating(professor.avg_difficulty)}
              <span className="text-sm font-normal text-muted-foreground"> /5</span>
            </>
          }
          hint={t.professor.avgDifficultyHint}
          icon={<Gauge className="size-3.5" />}
        />
        <Stat
          label={t.ratings.weeklyHours}
          value={
            <>
              {formatHours(professor.avg_weekly_hours)}
              <span className="text-sm font-normal text-muted-foreground"> {t.common.hoursPerWeek}</span>
            </>
          }
          icon={<Clock className="size-3.5" />}
        />
      </section>
      {lowConfidence && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t.common.lowConfidence}</p>}

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)]">
        {/* Sidebar: breakdowns */}
        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t.professor.categoryBreakdown}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {PROFESSOR_CATEGORIES.map((key) => (
                <RatingBar key={key} label={t.ratings.professor[key]} hint={t.ratings.professorHints[key]} value={professor[avgKey[key]]} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.ratings.distribution}</CardTitle>
            </CardHeader>
            <CardContent>
              <Distribution counts={professor.rating_distribution} title={t.ratings.distribution} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t.professor.attendance}</CardTitle>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-5">
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
            </CardContent>
          </Card>
          <Link
            href={`/corrections?professor=${professor.id}`}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Flag className="size-3.5" />
            {t.professor.reportInaccuracy}
          </Link>
        </aside>

        {/* Main: by-course + reviews */}
        <div className="grid content-start gap-10">
          <section aria-labelledby="by-course">
            <h2 id="by-course" className="text-lg font-semibold">
              {t.professor.byCourse}
            </h2>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">{t.professor.teachesHint}</p>
            <ComboTable rows={courses} mode="courses" t={t} />
          </section>

          <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-24">
            <h2 id="reviews-title" className="mb-3 text-lg font-semibold">
              {t.professor.reviewsTitle}
            </h2>
            {courses.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                <Link
                  href={`/professors/${professor.slug}#reviews`}
                  scroll={false}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium", !filteredCombo && "border-primary bg-accent text-accent-foreground")}
                >
                  {t.common.all}
                </Link>
                {courses.map((c) => (
                  <Link
                    key={c.id}
                    href={`/professors/${professor.slug}?course=${c.course_id}#reviews`}
                    scroll={false}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      filteredCombo?.id === c.id && "border-primary bg-accent text-accent-foreground",
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
        </div>
      </div>
    </div>
  );
}
