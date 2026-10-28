import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { CourseForm } from "@/components/admin/catalog-forms";
import { getAdminUniversities, getUniversityLookups } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { param } from "@/lib/params";
import { getSessionUser } from "@/lib/supabase/server";

export default async function NewCoursePage({ searchParams }: PageProps<"/admin/courses/new">) {
  const params = await searchParams;
  const [{ t }, scope, user] = await Promise.all([getI18n(), getAdminUniversities(param(params, "u")), getSessionUser()]);
  if (!scope?.current || user?.role !== "admin") notFound();
  const { departments } = await getUniversityLookups(scope.current.id);
  return (
    <>
      <Link href="/admin/courses" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t.admin.nav.courses}
      </Link>
      <AdminHeader title={t.admin.courses.new} hint={scope.current.name} />
      <AdminPanel>
        <CourseForm universityId={scope.current.id} departments={departments} canEdit />
      </AdminPanel>
    </>
  );
}
