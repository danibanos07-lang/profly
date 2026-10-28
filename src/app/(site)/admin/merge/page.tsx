import { notFound } from "next/navigation";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { MergeForm } from "@/components/admin/admin-widgets";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { getAdminUniversities, getCatalogOptions } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminMergePage({ searchParams }: PageProps<"/admin/merge">) {
  const params = await searchParams;
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current || user?.role !== "admin") notFound();
  const options = await getCatalogOptions(scope.current.id);
  return (
    <>
      <AdminHeader
        title={t.admin.nav.merge}
        hint={t.admin.merge.hint}
        action={<UniversitySwitcher universities={scope.universities} current={scope.current.slug} />}
      />
      <div className="grid gap-6">
        <AdminPanel title={t.admin.merge.professors}>
          <MergeForm kind="professor" options={options.professors.map((p) => ({ id: p.id, label: `${p.display_name} · ${p.slug}` }))} />
        </AdminPanel>
        <AdminPanel title={t.admin.merge.courses}>
          <MergeForm kind="course" options={options.courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))} />
        </AdminPanel>
      </div>
    </>
  );
}
