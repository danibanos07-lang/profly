import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReviewForm, type ReviewFormValues } from "@/components/reviews/review-form";
import { fetchCombos } from "@/lib/actions/catalog";
import { getReviewFormOptions } from "@/lib/data/review-form";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser, getSupabase } from "@/lib/supabase/server";
import type { ReviewTag } from "@/lib/constants";

export const metadata: Metadata = { title: "Edit review" };

export default async function EditReviewPage({ params }: PageProps<"/reviews/[id]/edit">) {
  const { id } = await params;
  const [{ t }, user, supabase, options] = await Promise.all([getI18n(), getSessionUser(), getSupabase(), getReviewFormOptions()]);
  if (!user) redirect(`/login?next=/reviews/${id}/edit`);
  if (!supabase || !options || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // RLS guarantees only the author can read the raw review row.
  const { data: review } = await supabase
    .from("reviews")
    .select(
      "*, professor_review_scores(*), course_review_scores(*), professor:professors(id, display_name), course:courses(code, name), term:academic_terms(id, label)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!review) notFound();
  // Only the author can read their own grade row.
  const { data: grade } = await supabase.from("reported_grades").select("grade").eq("review_id", review.id).maybeSingle();

  const ps = review.professor_review_scores;
  const cs = review.course_review_scores;
  const professor = review.professor as { id: string; display_name: string } | null;
  const course = review.course as { code: string; name: string } | null;
  const term = review.term as { id: string; label: string } | null;
  const combos = professor ? await fetchCombos({ professorId: professor.id }) : [];

  const values: ReviewFormValues = {
    professor_course_id: review.professor_course_id,
    campus_id: review.campus_id,
    term_id: review.term_id,
    teaching_format: review.teaching_format,
    would_take_again: review.would_take_again,
    recommends_course: review.recommends_course,
    weekly_hours: String(review.weekly_hours),
    exam_count: review.exam_count?.toString() ?? "",
    exam_difficulty: review.exam_difficulty,
    homework_frequency: review.homework_frequency ?? "",
    teamwork_level: review.teamwork_level ?? "",
    attendance_policy: review.attendance_policy ?? "",
    requires_programming: review.requires_programming,
    requires_math: review.requires_math,
    prior_knowledge_needed: review.prior_knowledge_needed,
    tags: review.tags as ReviewTag[],
    body: review.body,
    advice: review.advice ?? "",
    final_grade: grade?.grade != null ? String(Number(grade.grade)) : "",
    professor_scores: {
      clarity: ps?.clarity ?? null,
      attitude: ps?.attitude ?? null,
      grading_fairness: ps?.grading_fairness ?? null,
      availability: ps?.availability ?? null,
      organization: ps?.organization ?? null,
      engagement: ps?.engagement ?? null,
    },
    course_scores: {
      difficulty: cs?.difficulty ?? null,
      workload: cs?.workload ?? null,
      content_clarity: cs?.content_clarity ?? null,
      usefulness: cs?.usefulness ?? null,
      organization: cs?.organization ?? null,
      satisfaction: cs?.satisfaction ?? null,
    },
  };
  const terms = term && !options.terms.some((x) => x.id === term.id) ? [...options.terms, term] : options.terms;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.reviewForm.editTitle}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.reviewForm.subtitle}</p>
      <div className="mt-8 grid gap-4">
        {review.status !== "published" && (
          <Alert variant="warning">
            <AlertDescription>
              {t.dashboard.status}: {t.enums.review_status[review.status]}
            </AlertDescription>
          </Alert>
        )}
        <ReviewForm
          mode="edit"
          reviewId={review.id}
          campuses={options.campuses}
          terms={terms}
          initialValues={values}
          initialCombos={combos}
          gradeScale={options.gradeScale}
          lockedLabel={`${professor?.display_name ?? ""} · ${course?.code ?? ""} ${course?.name ?? ""} · ${term?.label ?? ""}`}
        />
      </div>
    </div>
  );
}
