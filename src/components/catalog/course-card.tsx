import Link from "next/link";
import { Clock, Gauge, ThumbsUp } from "lucide-react";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { formatHours, formatPercent, formatRating } from "@/lib/format";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CourseSummary } from "@/lib/types";

export function CourseCard({ course, t, locale }: { course: CourseSummary; t: Dictionary; locale: Locale }) {
  const department = locale === "en" ? course.department_name_en ?? course.department_name : course.department_name;
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-medium text-secondary-foreground">
            {course.code}
          </span>
          <h3 className="mt-1.5 line-clamp-2 font-semibold group-hover:text-primary">{course.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{department ?? t.common.unknown}</p>
        </div>
        <ScoreBadge value={course.avg_satisfaction} size="sm" label={t.ratings.course.satisfaction} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="tabular">
          {course.review_count === 1 ? t.common.reviewCountOne : format(t.common.reviewsCount, { count: course.review_count })}
        </span>
        <span className="flex items-center gap-1 tabular" title={t.ratings.difficulty}>
          <Gauge className="size-3.5" />
          {formatRating(course.avg_difficulty)}
        </span>
        <span className="flex items-center gap-1 tabular" title={t.ratings.weeklyHours}>
          <Clock className="size-3.5" />
          {formatHours(course.avg_weekly_hours)} {t.common.hoursPerWeek}
        </span>
        <span className="flex items-center gap-1 tabular" title={t.ratings.recommend}>
          <ThumbsUp className="size-3.5" />
          {formatPercent(course.recommend_pct)}
        </span>
        {course.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
      </div>
    </Link>
  );
}
