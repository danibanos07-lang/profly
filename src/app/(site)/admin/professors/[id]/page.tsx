import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { AdminHeader, AdminPanel } from "@/components/admin/admin-ui";
import { ProfessorForm } from "@/components/admin/catalog-forms";
import { LogList } from "@/components/admin/log-list";
import { getAdminProfessor, getModerationLogs, getUniversityLookups } from "@/lib/data/admin";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditProfessorPage({ params }: PageProps<"/admin/professors/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [{ t }, professor, user] = await Promise.all([getI18n(), getAdminProfessor(id), getSessionUser()]);
  if (!professor) notFound();
  const [{ departments, campuses }, logs] = await Promise.all([getUniversityLookups(professor.university_id), getModerationLogs(1, id)]);
  return (
    <>
      <Link href="/admin/professors" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" />
        {t.admin.nav.professors}
      </Link>
      <AdminHeader
        title={professor.display_name ?? `${professor.first_name} ${professor.last_name}`}
        hint={user?.role === "admin" ? undefined : t.admin.common.adminOnly}
        action={
          <Link href={`/professors/${professor.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {t.admin.common.view}
            <ExternalLink className="size-3.5" />
          </Link>
        }
      />
      <div className="grid gap-6">
        <AdminPanel title={t.admin.professors.edit}>
          <ProfessorForm professor={professor} universityId={professor.university_id} departments={departments} campuses={campuses} canEdit={user?.role === "admin"} />
        </AdminPanel>
        <AdminPanel title={t.admin.nav.logs}>
          <LogList rows={logs.rows} />
        </AdminPanel>
      </div>
    </>
  );
}
