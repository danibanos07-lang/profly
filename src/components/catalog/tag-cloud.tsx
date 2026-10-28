import { TAG_GROUPS, type TagGroup } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const tone: Record<TagGroup, string> = {
  methods: "bg-secondary text-secondary-foreground",
  strengths: "bg-score-5/10 text-score-5",
  weaknesses: "bg-score-1/10 text-score-1",
};

/** Tag counts from aggregated reviews, split into methods / strengths / weaknesses. */
export function TagCloud({ counts, group, t }: { counts: Json; group: TagGroup; t: Dictionary }) {
  const map = (counts && typeof counts === "object" && !Array.isArray(counts) ? counts : {}) as Record<string, number>;
  const tags = TAG_GROUPS[group]
    .map((tag) => [tag, Number(map[tag] ?? 0)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (!tags.length) return <p className="text-sm text-muted-foreground">{t.professor.noTags}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map(([tag, n]) => (
        <li key={tag} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", tone[group])}>
          {t.tags[tag]}
          <span className="tabular opacity-70">{n}</span>
        </li>
      ))}
    </ul>
  );
}
