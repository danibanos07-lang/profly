import Link from "next/link";
import { Gauge, ThumbsUp } from "lucide-react";
import { DemoBadge } from "@/components/common/demo-badge";
import { ScoreBadge } from "@/components/rating/score-badge";
import { InitialsAvatar } from "./avatar";
import { formatPercent, formatRating } from "@/lib/format";
import { format, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { ProfessorSummary } from "@/lib/types";

export function ProfessorCard({ professor, t, locale }: { professor: ProfessorSummary; t: Dictionary; locale: Locale }) {
  const department = locale === "en" ? professor.department_name_en ?? professor.department_name : professor.department_name;
  return (
    <Link
      href={`/professors/${professor.slug}`}
      className="group relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lift focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start gap-3">
        <InitialsAvatar name={professor.display_name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold group-hover:text-primary">{professor.display_name}</h3>
          <p className="truncate text-sm text-muted-foreground">{department ?? t.common.unknown}</p>
        </div>
        <ScoreBadge value={professor.avg_overall} size="sm" label={t.ratings.overall} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="tabular">
          {professor.review_count === 1 ? t.common.reviewCountOne : format(t.common.reviewsCount, { count: professor.review_count })}
        </span>
        <span className="flex items-center gap-1 tabular" title={t.ratings.takeAgain}>
          <ThumbsUp className="size-3.5" />
          {formatPercent(professor.would_take_again_pct)}
        </span>
        <span className="flex items-center gap-1 tabular" title={t.ratings.difficulty}>
          <Gauge className="size-3.5" />
          {formatRating(professor.avg_difficulty)}
        </span>
        {professor.campus_name && <span>{professor.campus_name}</span>}
        {professor.is_fictional && <DemoBadge label={t.common.demo} tooltip={t.common.demoTooltip} />}
      </div>
    </Link>
  );
}
