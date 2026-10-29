import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SetupNotice } from "@/components/common/setup-notice";
import { emptyValues, ReviewForm } from "@/components/reviews/review-form";
import { fetchCombos } from "@/lib/actions/catalog";
import { getCourse, getProfessor } from "@/lib/data/catalog";
import { getReviewFormOptions } from "@/lib/data/review-form";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { param } from "@/lib/params";

export const metadata: Metadata = { title: "Write a review" };

export default async function NewReviewPage({ searchParams }: PageProps<"/reviews/new">) {
  const sp = await searchParams;
  const [{ t }, user, options] = await Promise.all([getI18n(), getSessionUser(), getReviewFormOptions()]);
  if (!user) redirect(`/login?next=${encodeURIComponent("/reviews/new")}`);

  const professorSlug = param(sp, "professor");
  const courseSlug = param(sp, "course");
  const [professorResult, courseResult] = await Promise.all([
    professorSlug ? getProfessor(professorSlug) : null,
    courseSlug ? getCourse(courseSlug) : null,
  ]);
  const professor = professorResult?.status === "found" ? professorResult.professor : null;
  const course = courseResult?.status === "found" ? courseResult.course : null;
  const initialCombos = professor ? await fetchCombos({ professorId: professor.id }) : [];
  const courseProfessors = !professor && course ? await fetchCombos({ courseId: course.id }) : [];

  const values = emptyValues(user.campusId ?? options?.defaultCampusId ?? "", options?.defaultTermId ?? "");
  if (professor) {
    const preselected = course ? initialCombos.find((c) => c.course_id === course.id) : initialCombos.length === 1 ? initialCombos[0] : undefined;
    if (preselected) {
      values.professor_course_id = preselected.id;
      if (preselected.campus_id && options?.campuses.some((c) => c.id === preselected.campus_id)) values.campus_id = preselected.campus_id;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.reviewForm.title}</h1>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        {t.reviewForm.subtitle}
      </p>
      <div className="mt-8 grid gap-4">
        {!options && <SetupNotice t={t} />}
        {!user.emailConfirmed && (
          <Alert variant="warning">
            <AlertDescription>{t.reviewForm.needsConfirmation}</AlertDescription>
          </Alert>
        )}
        {user.isBanned && (
          <Alert variant="destructive">
            <AlertDescription>{t.reviewForm.banned}</AlertDescription>
          </Alert>
        )}
        {options && (
          <ReviewForm
            mode="create"
            campuses={options.campuses}
            terms={options.terms}
            initialValues={values}
            initialProfessor={professor ? { id: professor.id, name: professor.display_name } : null}
            initialCombos={initialCombos}
            courseProfessors={courseProfessors}
          />
        )}
      </div>
    </div>
  );
}
