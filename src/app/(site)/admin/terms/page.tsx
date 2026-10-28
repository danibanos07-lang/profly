import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { TermForm } from "@/components/admin/admin-widgets";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminUniversities, getUniversityLookups } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminTermsPage({ searchParams }: PageProps<"/admin/terms">) {
  const params = await searchParams;
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current) return <EmptyState title={t.admin.common.empty} />;
  const canEdit = user?.role === "admin";
  const { terms } = await getUniversityLookups(scope.current.id);
  return (
    <>
      <AdminHeader
        title={t.admin.nav.terms}
        hint={canEdit ? scope.current.name : t.admin.common.adminOnly}
        action={<UniversitySwitcher universities={scope.universities} current={scope.current.slug} />}
      />
      <div className="grid gap-6">
        {canEdit && (
          <AdminPanel title={t.admin.terms.add}>
            <TermForm universityId={scope.current.id} canEdit />
          </AdminPanel>
        )}
        <AdminPanel>
          <div className="grid divide-y">
            {terms.map((term) => (
              <div key={term.id} className="py-4 first:pt-0 last:pb-0">
                <TermForm term={term} universityId={scope.current!.id} canEdit={canEdit} />
              </div>
            ))}
            {terms.length === 0 && <p className="text-sm text-muted-foreground">{t.admin.common.empty}</p>}
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
