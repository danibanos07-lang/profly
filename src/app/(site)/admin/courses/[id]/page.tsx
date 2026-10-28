import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { CourseForm } from "@/components/admin/catalog-forms";
import { LogList } from "@/components/admin/log-list";
import { PrerequisiteManager } from "@/components/admin/prerequisite-manager";
import { getAdminCourse, getCatalogOptions, getModerationLogs, getUniversityLookups } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;
const one = <T,>(value: T | T[] | null) => (Array.isArray(value) ? value[0] : value);

export default async function EditCoursePage({ params }: PageProps<"/admin/courses/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [{ t }, data, user] = await Promise.all([getI18n(), getAdminCourse(id), getSessionUser()]);
  if (!data) notFound();
  const { course, prerequisites, assignments } = data;
  const canEdit = user?.role === "admin";
  const [{ departments }, options, logs] = await Promise.all([
    getUniversityLookups(course.university_id),
    getCatalogOptions(course.university_id),
    getModerationLogs(1, id),
  ]);

  return (
    <>
      <Link href="/admin/courses" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t.admin.nav.courses}
      </Link>
      <AdminHeader
        title={`${course.code} · ${course.name}`}
        hint={canEdit ? undefined : t.admin.common.adminOnly}
        action={
          <Link href={`/courses/${course.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {t.admin.common.view}
            <ExternalLink className="size-3.5" />
          </Link>
        }
      />
      <div className="grid gap-6">
        <AdminPanel title={t.admin.courses.edit}>
          <CourseForm course={course} universityId={course.university_id} departments={departments} canEdit={canEdit} />
        </AdminPanel>
        <AdminPanel title={t.admin.courses.prerequisites}>
          <PrerequisiteManager
            courseId={course.id}
            canEdit={canEdit}
            courses={options.courses}
            prerequisites={prerequisites.map((p) => ({ ...p, prerequisite: one(p.prerequisite) }))}
          />
        </AdminPanel>
        <AdminPanel
          title={t.admin.courses.teachers}
          action={
            <Link href="/admin/assignments" className="text-sm text-primary hover:underline">
              {t.admin.nav.assignments}
            </Link>
          }
        >
          {assignments.length ? (
            <ul className="flex flex-wrap gap-2">
              {assignments.map((a) => {
                const professor = one(a.professor);
                return (
                  <li key={a.id}>
                    <Badge variant={a.is_active ? "soft" : "secondary"}>{professor?.display_name}</Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{t.admin.common.empty}</p>
          )}
        </AdminPanel>
        <AdminPanel title={t.admin.nav.logs}>
          <LogList rows={logs.rows} />
        </AdminPanel>
      </div>
    </>
  );
}
