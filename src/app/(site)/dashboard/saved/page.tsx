import { Bookmark } from "lucide-react";
import { CourseCard } from "@/components/catalog/course-card";
import { ProfessorCard } from "@/components/catalog/professor-card";
import { EmptyState } from "@/components/common/empty-state";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import type { CourseSummary, ProfessorSummary } from "@/lib/types";

export default async function SavedPage() {
  const [{ t, locale }, user, supabase] = await Promise.all([getI18n(), getSessionUser(), getSupabase()]);
  if (!user || !supabase) return null;
  const { data: bookmarks } = await supabase.from("bookmarks").select("professor_id, course_id").eq("user_id", user.id).order("created_at", { ascending: false });
  const professorIds = (bookmarks ?? []).map((b) => b.professor_id).filter((id): id is string => Boolean(id));
  const courseIds = (bookmarks ?? []).map((b) => b.course_id).filter((id): id is string => Boolean(id));
  const [{ data: professors }, { data: courses }] = await Promise.all([
    professorIds.length ? supabase.from("professor_directory").select("*").in("id", professorIds) : Promise.resolve({ data: [] }),
    courseIds.length ? supabase.from("course_directory").select("*").in("id", courseIds) : Promise.resolve({ data: [] }),
  ]);
  if (!professorIds.length && !courseIds.length) return <EmptyState icon={<Bookmark />} title={t.dashboard.noSaved} />;
  return (
    <div className="grid gap-10">
      {professors && professors.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t.dashboard.savedProfessors}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(professors as ProfessorSummary[]).map((p) => (
              <ProfessorCard key={p.id} professor={p} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}
      {courses && courses.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t.dashboard.savedCourses}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(courses as CourseSummary[]).map((c) => (
              <CourseCard key={c.id} course={c} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
