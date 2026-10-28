import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { RefreshStatsButton } from "@/components/admin/refresh-stats";
import { getAdminOverview } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function AdminOverviewPage() {
  const [{ t, locale }, overview, user] = await Promise.all([getI18n(), getAdminOverview(), getSessionUser()]);
  if (!overview) return <AdminHeader title={t.admin.nav.overview} hint={t.admin.common.forbidden} />;
  const o = t.admin.overview;

  const attention = [
    { label: o.openReports, value: overview.open_reports, href: "/admin/reports" },
    { label: o.queuedReviews, value: overview.queued_reviews, href: "/admin/queue" },
    { label: o.pendingSuggestions, value: overview.pending_suggestions, href: "/admin/suggestions" },
    { label: o.openCorrections, value: overview.open_corrections, href: "/admin/corrections" },
  ];
  const totals = [
    [o.publishedReviews, overview.published_reviews],
    [o.reviewsLast7, overview.reviews_last_7_days],
    [o.accounts, overview.accounts],
    [o.withUniEmail, overview.accounts_with_university_email],
    [o.professors, overview.professors],
    [o.courses, overview.courses],
  ] as const;
  const max = Math.max(1, ...overview.reviews_per_day.map((d) => d.count));

  return (
    <>
      <AdminHeader title={t.admin.nav.overview} hint={t.admin.subtitle} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {attention.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-card p-5 shadow-soft transition-colors hover:border-primary/40"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className={`mt-2 text-3xl font-semibold tabular ${item.value > 0 ? "text-primary" : ""}`}>{item.value}</p>
          </Link>
        ))}
      </div>

      <AdminPanel title={o.chartTitle} className="mt-6">
        <div className="flex h-40 items-end gap-1" role="img" aria-label={o.chartTitle}>
          {overview.reviews_per_day.map((d) => (
            <div
              key={d.day}
              title={`${formatDate(d.day, locale)}: ${d.count}`}
              className="flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
              style={{ height: `${Math.max(2, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground tabular">
          <span>{overview.reviews_per_day[0] && formatDate(overview.reviews_per_day[0].day, locale)}</span>
          <span>{overview.reviews_per_day.at(-1) && formatDate(overview.reviews_per_day.at(-1)!.day, locale)}</span>
        </div>
      </AdminPanel>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {totals.map(([label, value]) => (
          <div key={label} className="rounded-2xl border bg-card px-5 py-4 shadow-soft">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular">{value}</dd>
          </div>
        ))}
      </dl>

      {user?.role === "admin" && (
        <AdminPanel className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{o.refreshStats}</p>
                <p className="text-xs text-muted-foreground">{o.refreshHint}</p>
              </div>
            </div>
            <RefreshStatsButton />
          </div>
        </AdminPanel>
      )}
    </>
  );
}
