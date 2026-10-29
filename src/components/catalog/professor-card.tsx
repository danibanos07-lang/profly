import Link from "next/link";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { coursesTaught, type ProfessorSummary } from "@/lib/types";

/** Name, overall rating and courses taught: the three things a student looks for first. */
export function ProfessorCard({ professor, t, locale }: { professor: ProfessorSummary; t: Dictionary; locale: Locale }) {
  const department = locale === "en" ? professor.department_name_en ?? professor.department_name : professor.department_name;
  const courses = coursesTaught(professor);
  const shown = courses.slice(0, 3);
  return (
    <Link
      href={`/professors/${professor.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{professor.display_name}</h3>
          <p className="truncate text-sm text-muted-foreground">{department ?? t.common.unknown}</p>
        </div>
        <ScoreBadge value={professor.avg_overall} size="sm" label={t.ratings.overall} />
      </div>
      {shown.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t.professor.coursesTaught}>
          {shown.map((c) => (
            <li key={c.slug} className="max-w-full truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
              {c.name}
            </li>
          ))}
          {courses.length > shown.length && <li className="px-1 py-0.5 text-xs text-muted-foreground">+{courses.length - shown.length}</li>}
        </ul>
      )}
      <div className="mt-auto flex items-center gap-3 text-xs text-muted-foreground tabular">
        <span>{professor.review_count === 1 ? t.common.reviewCountOne : format(t.common.reviewsCount, { count: professor.review_count })}</span>
        {professor.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
      </div>
    </Link>
  );
}
