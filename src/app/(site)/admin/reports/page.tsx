import { AdminHeader, AdminTabs } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/common/empty-state";
import { ReportList } from "@/components/admin/report-list";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { getReports, reviewOverall } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";

const STATUSES = ["open", "dismissed", "actioned"] as const;

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const { status: raw } = await searchParams;
  const status = STATUSES.find((s) => s === raw) ?? "open";
  const [{ t }, reports] = await Promise.all([getI18n(), getReports(status)]);

  // Several people may report the same review: show it once with all reports.
  const groups = new Map<string, { review: NonNullable<(typeof reports)[number]["review"]>; reports: typeof reports }>();
  for (const report of reports) {
    if (!report.review) continue;
    const group = groups.get(report.review.id) ?? { review: report.review, reports: [] };
    group.reports.push(report);
    groups.set(report.review.id, group);
  }

  return (
    <>
      <AdminHeader title={t.admin.nav.reports} hint={t.admin.reports.hint} />
      <AdminTabs
        current={status}
        tabs={STATUSES.map((s) => ({ value: s, label: t.admin.reports.status[s], href: `/admin/reports?status=${s}` }))}
      />
      {groups.size === 0 ? (
        <EmptyState title={t.admin.common.empty} />
      ) : (
        <div className="grid gap-4">
          {[...groups.values()].map(({ review, reports: items }) => (
            <ReviewModeration key={review.id} review={review} overall={reviewOverall(review)}>
              <ReportList
                reports={items.map((r) => ({
                  id: r.id,
                  reason: r.reason,
                  details: r.details,
                  status: r.status,
                  created_at: r.created_at,
                  resolution_note: r.resolution_note,
                  reporter: r.reporter?.display_name ?? null,
                }))}
              />
            </ReviewModeration>
          ))}
        </div>
      )}
    </>
  );
}
