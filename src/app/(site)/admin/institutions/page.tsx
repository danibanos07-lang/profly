import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { CampusForm, DepartmentForm, UniversityForm } from "@/components/admin/admin-widgets";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { EmptyState } from "@/components/common/empty-state";
import { getAdminUniversities, getUniversityLookups } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function AdminInstitutionsPage({ searchParams }: PageProps<"/admin/institutions">) {
  const params = await searchParams;
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current) return <EmptyState title={t.admin.common.empty} />;
  const canEdit = user?.role === "admin";
  const university = scope.current;
  const { campuses, departments } = await getUniversityLookups(university.id);
  const i = t.admin.institutions;

  return (
    <>
      <AdminHeader
        title={t.admin.nav.institutions}
        hint={canEdit ? undefined : t.admin.common.adminOnly}
        action={<UniversitySwitcher universities={scope.universities} current={university.slug} />}
      />
      <div className="grid gap-6">
        <AdminPanel title={university.name}>
          <UniversityForm key={university.id} university={university} canEdit={canEdit} />
        </AdminPanel>
        <AdminPanel title={i.campuses}>
          <div className="grid gap-3">
            {campuses.map((campus) => (
              <CampusForm key={campus.id} campus={campus} universityId={university.id} canEdit={canEdit} />
            ))}
            {canEdit && <CampusForm universityId={university.id} canEdit />}
          </div>
        </AdminPanel>
        <AdminPanel title={i.departments}>
          <div className="grid gap-4">
            {departments.map((department) => (
              <DepartmentForm key={department.id} department={department} universityId={university.id} canEdit={canEdit} />
            ))}
            {canEdit && (
              <div className="border-t pt-4">
                <DepartmentForm universityId={university.id} canEdit />
              </div>
            )}
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
