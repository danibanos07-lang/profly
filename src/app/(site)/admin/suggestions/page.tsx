import { Badge } from "@/components/ui/badge";
import { AdminHeader, AdminTabs } from "@/components/admin/admin-ui";
import { SuggestionActions } from "@/components/admin/admin-widgets";
import { EmptyState } from "@/components/common/empty-state";
import { getSuggestions } from "@/lib/data/admin";
import { formatRelative } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

const STATUSES = ["pending", "approved", "rejected"] as const;

export default async function AdminSuggestionsPage({ searchParams }: PageProps<"/admin/suggestions">) {
  const { status: raw } = await searchParams;
  const status = STATUSES.find((s) => s === raw) ?? "pending";
  const [{ t, locale }, rows] = await Promise.all([getI18n(), getSuggestions(status)]);
  const labels: Record<string, string> = {
    first_name: t.suggest.firstName,
    last_name: t.suggest.lastName,
    department: t.suggest.department,
    course_code: t.suggest.courseCode,
    course_name: t.suggest.courseName,
    professor_name: t.suggest.professorName,
    details: t.suggest.details,
  };
  return (
    <>
      <AdminHeader title={t.admin.nav.suggestions} hint={t.admin.suggestions.hint} />
      <AdminTabs current={status} tabs={STATUSES.map((s) => ({ value: s, label: t.admin.suggestions.status[s], href: `/admin/suggestions?status=${s}` }))} />
      {rows.length === 0 ? (
        <EmptyState title={t.admin.common.empty} />
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.id} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="soft">{t.suggest.kinds[row.kind]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {row.author?.display_name ?? "—"} · {formatRelative(row.created_at, locale)}
                </span>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[180px_1fr]">
                {Object.entries(row.payload).map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">{labels[key] ?? key}</dt>
                    <dd className="break-words whitespace-pre-line">{String(value ?? "—")}</dd>
                  </div>
                ))}
              </dl>
              {row.reviewer_note && <p className="mt-3 text-xs text-muted-foreground">{row.reviewer_note}</p>}
              {row.status === "pending" && (
                <div className="mt-4 border-t pt-4">
                  <SuggestionActions id={row.id} />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
