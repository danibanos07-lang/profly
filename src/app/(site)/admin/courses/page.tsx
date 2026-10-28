import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminHeader, AdminPager, AdminSearch } from "@/components/admin/admin-ui";
import { UniversitySwitcher } from "@/components/admin/university-switcher";
import { EmptyState } from "@/components/common/empty-state";
import { ADMIN_PAGE_SIZE, getAdminUniversities, listAdminCourses } from "@/lib/data/admin";
import { formatRating } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { pageParam, param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value);

export default async function AdminCoursesPage({ searchParams }: PageProps<"/admin/courses">) {
  const params = await searchParams;
  const q = param(params, "q")?.trim() ?? "";
  const page = pageParam(params);
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current) return <EmptyState title={t.admin.common.empty} />;
  const { rows, count } = await listAdminCourses(scope.current.id, q, page);
  const u = scope.current.slug;

  return (
    <>
      <AdminHeader
        title={t.admin.nav.courses}
        hint={user?.role === "admin" ? undefined : t.admin.common.adminOnly}
        action={
          user?.role === "admin" && (
            <Button asChild>
              <Link href={`/admin/courses/new?u=${u}`}>
                <Plus />
                {t.admin.courses.new}
              </Link>
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <AdminSearch placeholder={t.admin.common.searchPlaceholder} defaultValue={q} hidden={{ u }} />
        <UniversitySwitcher universities={scope.universities} current={u} />
        <span className="text-sm text-muted-foreground">{format(t.admin.common.showing, { count })}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.common.course}</TableHead>
              <TableHead>{t.common.department}</TableHead>
              <TableHead className="text-right">{t.common.reviews}</TableHead>
              <TableHead className="text-right">{t.ratings.difficulty}</TableHead>
              <TableHead>{t.admin.common.status}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const stats = one(row.stats);
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link href={`/admin/courses/${row.id}`} className="font-medium hover:text-primary hover:underline">
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">{row.code}</span>
                      {row.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{one(row.department)?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular">{stats?.review_count ?? 0}</TableCell>
                  <TableCell className="text-right tabular">{formatRating(stats?.avg_difficulty)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.merged_into_id ? (
                        <Badge variant="secondary">{t.admin.professors.merged}</Badge>
                      ) : (
                        <Badge variant={row.is_active ? "success" : "secondary"}>{row.is_active ? t.admin.common.active : t.admin.common.inactive}</Badge>
                      )}
                      {row.is_fictional && <Badge variant="demo">{t.common.demo}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">{t.admin.common.empty}</p>}
      </div>
      <AdminPager page={page} total={count} pageSize={ADMIN_PAGE_SIZE} hrefFor={(p) => `/admin/courses?u=${u}&q=${encodeURIComponent(q)}&page=${p}`} />
    </>
  );
}
