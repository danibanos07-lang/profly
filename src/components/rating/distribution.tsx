import { Star } from "lucide-react";

/** 5→1 histogram of review counts. */
export function Distribution({
  counts,
  labels,
  title,
}: {
  counts: number[];
  labels?: string[];
  title: string;
}) {
  const total = counts.reduce((sum, n) => sum + n, 0);
  const max = Math.max(...counts, 1);
  return (
    <figure className="grid gap-2" aria-label={title}>
      <figcaption className="sr-only">{title}</figcaption>
      {[5, 4, 3, 2, 1].map((bucket) => {
        const n = counts[bucket - 1] ?? 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        return (
          <div key={bucket} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground tabular">
              {labels ? labels[bucket - 1] : bucket}
              {!labels && <Star className="size-3 text-star" fill="currentColor" strokeWidth={0} />}
            </span>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/80" style={{ width: `${(n / max) * 100}%` }} />
            </div>
            <span className="text-right text-xs text-muted-foreground tabular">{pct}%</span>
          </div>
        );
      })}
    </figure>
  );
}
