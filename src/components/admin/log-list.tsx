import { getI18n } from "@/lib/i18n/server";
import { formatRelative } from "@/lib/format";
import type { Json } from "@/lib/supabase/database.types";

type LogRow = {
  id: number;
  action: string;
  target_type: string;
  target_id: string | null;
  reason: string | null;
  metadata: Json;
  created_at: string;
  actor: { display_name: string | null } | { display_name: string | null }[] | null;
  actor_id: string | null;
};

function summarize(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const changed = (metadata as Record<string, Json>).changed;
  if (Array.isArray(changed)) return changed.join(", ");
  const entries = Object.entries(metadata).filter(([, v]) => v !== null && typeof v !== "object");
  return entries.length ? entries.map(([k, v]) => `${k}: ${String(v)}`).join(" · ") : null;
}

export async function LogList({ rows }: { rows: LogRow[] }) {
  const { t, locale } = await getI18n();
  if (!rows.length) return <p className="text-sm text-muted-foreground">{t.admin.common.empty}</p>;
  return (
    <ol className="grid gap-0 text-sm">
      {rows.map((row) => {
        const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
        const detail = summarize(row.metadata);
        return (
          <li key={row.id} className="grid gap-0.5 border-b py-2.5 last:border-0 sm:grid-cols-[150px_1fr]">
            <time dateTime={row.created_at} className="text-xs text-muted-foreground tabular">
              {formatRelative(row.created_at, locale)}
            </time>
            <div className="min-w-0">
              <span className="font-mono text-xs">{row.action}</span>
              <span className="text-muted-foreground">
                {" "}
                · {row.target_type}
                {row.target_id ? ` ${row.target_id.slice(0, 8)}` : ""} · {actor?.display_name ?? (row.actor_id ? row.actor_id.slice(0, 8) : t.admin.logs.system)}
              </span>
              {row.reason && <p className="text-muted-foreground">“{row.reason}”</p>}
              {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
