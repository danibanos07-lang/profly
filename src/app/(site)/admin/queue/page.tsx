import { AdminHeader, AdminPager, AdminTabs } from "@/components/admin/admin-ui";
import { EmptyState } from "@/components/common/empty-state";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { ADMIN_PAGE_SIZE, getReviewsByStatus, reviewOverall, type AdminReview } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { pageParam } from "@/lib/params";

const STATUSES = ["under_review", "hidden", "removed", "published"] as const satisfies AdminReview["status"][];

export default async function AdminQueuePage({ searchParams }: PageProps<"/admin/queue">) {
  const params = await searchParams;
  const status = STATUSES.find((s) => s === params.status) ?? "under_review";
  const page = pageParam(params);
  const [{ t }, { rows, count }] = await Promise.all([getI18n(), getReviewsByStatus(status, page)]);

  return (
    <>
      <AdminHeader title={t.admin.nav.queue} hint={t.admin.queue.hint} />
      <AdminTabs
        current={status}
        tabs={STATUSES.map((s) => ({ value: s, label: t.enums.review_status[s], href: `/admin/queue?status=${s}` }))}
      />
      {rows.length === 0 ? (
        <EmptyState title={t.admin.common.empty} />
      ) : (
        <div className="grid gap-4">
          {rows.map((review) => (
            <ReviewModeration key={review.id} review={review} overall={reviewOverall(review)} />
          ))}
        </div>
      )}
      <AdminPager page={page} total={count} pageSize={ADMIN_PAGE_SIZE} hrefFor={(p) => `/admin/queue?status=${status}&page=${p}`} />
    </>
  );
}
