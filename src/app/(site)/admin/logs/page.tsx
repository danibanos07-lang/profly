import { AdminHeader, AdminPager, AdminPanel } from "@/components/admin/admin-ui";
import { LogList } from "@/components/admin/log-list";
import { ADMIN_PAGE_SIZE, getModerationLogs } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { pageParam } from "@/lib/params";

export default async function AdminLogsPage({ searchParams }: PageProps<"/admin/logs">) {
  const page = pageParam(await searchParams);
  const [{ t }, { rows, count }] = await Promise.all([getI18n(), getModerationLogs(page)]);
  return (
    <>
      <AdminHeader title={t.admin.nav.logs} hint={t.admin.logs.hint} />
      <AdminPanel>
        <LogList rows={rows} />
      </AdminPanel>
      <AdminPager page={page} total={count} pageSize={ADMIN_PAGE_SIZE * 2} hrefFor={(p) => `/admin/logs?page=${p}`} />
    </>
  );
}
