import { notFound } from "next/navigation";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { ImportForm } from "@/components/admin/import-form";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { getAdminUniversities } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminImportPage({ searchParams }: PageProps<"/admin/import">) {
  const params = await searchParams;
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current || user?.role !== "admin") notFound();
  return (
    <>
      <AdminHeader
        title={t.admin.nav.import}
        hint={t.admin.import.hint}
        action={<UniversitySwitcher universities={scope.universities} current={scope.current.slug} />}
      />
      <AdminPanel>
        <ImportForm universityId={scope.current.id} />
      </AdminPanel>
    </>
  );
}
