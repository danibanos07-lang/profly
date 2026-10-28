import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, AdminPager, AdminPanel, AdminSearch } from "@/components/admin/admin-ui";
import { AssignmentAddForm, AssignmentRowActions } from "@/components/admin/admin-widgets";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { EmptyState } from "@/components/common/empty-state";
import { ADMIN_PAGE_SIZE, getAdminUniversities, getCatalogOptions, getUniversityLookups, listAssignments } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { pageParam, param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value);

export default async function AdminAssignmentsPage({ searchParams }: PageProps<"/admin/assignments">) {
  const params = await searchParams;
  const q = param(params, "q")?.trim() ?? "";
  const page = pageParam(params);
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current) return <EmptyState title={t.admin.common.empty} />;
  const canEdit = user?.role === "admin";
  const u = scope.current.slug;
  const [{ rows, count }, options, lookups] = await Promise.all([
    listAssignments(scope.current.id, q, page),
    canEdit ? getCatalogOptions(scope.current.id) : Promise.resolve({ professors: [], courses: [] }),
    getUniversityLookups(scope.current.id),
  ]);

  return (
    <>
      <AdminHeader title={t.admin.nav.assignments} hint={canEdit ? t.admin.assignments.hint : t.admin.common.adminOnly} />
      {canEdit && (
        <AdminPanel title={t.admin.assignments.add} className="mb-6">
          <AssignmentAddForm
            professors={options.professors.map((p) => ({ id: p.id, label: `${p.display_name}${p.is_fictional ? " (demo)" : ""}` }))}
            courses={options.courses.map((c) => ({ id: c.id, label: `${c.code} — ${c.name}` }))}
            campuses={lookups.campuses.map((c) => ({ id: c.id, label: c.name }))}
          />
        </AdminPanel>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminSearch placeholder={t.common.professor} defaultValue={q} hidden={{ u }} />
        <UniversitySwitcher universities={scope.universities} current={u} />
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.professor}</TableHead>
              <TableHead>{t.common.course}</TableHead>
              <TableHead>{t.common.campus}</TableHead>
              <TableHead className="text-right">{t.admin.assignments.reviews}</TableHead>
              <TableHead>{t.admin.common.status}</TableHead>
              {canEdit && <TableHead className="text-right">{t.common.actions}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const professor = one(row.professor);
              const course = one(row.course);
              const reviews = one(row.stats)?.review_count ?? 0;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{professor?.display_name}</TableCell>
                  <TableCell>
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">{course?.code}</span>
                    {course?.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{one(row.campus)?.name ?? t.admin.assignments.anyCampus}</TableCell>
                  <TableCell className="text-right tabular">{reviews}</TableCell>
                  <TableCell>
                    <Badge variant={row.is_active ? "success" : "secondary"}>{row.is_active ? t.admin.common.active : t.admin.common.inactive}</Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell>
                      <AssignmentRowActions id={row.id} active={row.is_active} hasReviews={reviews > 0} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t.admin.common.empty}</p>}
      </div>
      <AdminPager page={page} total={count} pageSize={ADMIN_PAGE_SIZE} hrefFor={(p) => `/admin/assignments?u=${u}&q=${encodeURIComponent(q)}&page=${p}`} />
    </>
  );
}
