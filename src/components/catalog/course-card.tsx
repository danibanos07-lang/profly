import Link from "next/link";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { formatRating } from "@/lib/format";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { CourseSummary } from "@/lib/types";

export function CourseCard({ course, t, locale }: { course: CourseSummary; t: Dictionary; locale: Locale }) {
  const department = locale === "en" ? course.department_name_en ?? course.department_name : course.department_name;
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[11px] text-muted-foreground">{course.code}</span>
          <h3 className="mt-0.5 line-clamp-2 font-medium">{course.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{department ?? t.common.unknown}</p>
        </div>
        <ScoreBadge value={course.avg_satisfaction} size="sm" label={t.ratings.course.satisfaction} />
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular">
        <span>{course.review_count === 1 ? t.common.reviewCountOne : format(t.common.reviewsCount, { count: course.review_count })}</span>
        <span>
          {t.ratings.difficulty} {formatRating(course.avg_difficulty)}/5
        </span>
        <span>{format(t.course.professorCount, { count: course.professor_count })}</span>
        {course.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
      </div>
    </Link>
  );
}
