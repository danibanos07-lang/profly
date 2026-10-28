import type { Metadata } from "next";
import { Columns3, Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { CompareSelector } from "@/components/compare/compare-selector";
import { bestIndex, ComparisonTable } from "@/components/compare/comparison-table";
import { SaveComparison } from "@/components/compare/save-comparison";
import { getCourse, getCourseProfessors, getUniversityContext, listCourses } from "@/lib/data/catalog";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { getSessionUser } from "@/lib/supabase/server";
import { param } from "@/lib/params";
import { LOW_CONFIDENCE_THRESHOLD, MAX_COMPARE } from "@/lib/constants";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const [{ t }, context, user] = await Promise.all([getI18n(), getUniversityContext(), getSessionUser()]);
  const courses = await listCourses(context?.university.id);
  const courseSlug = param(sp, "course");
  const courseResult = courseSlug ? await getCourse(courseSlug) : null;
  const course = courseResult?.status === "found" ? courseResult.course : null;
  const professors = course ? await getCourseProfessors(course.id) : [];
  const requested = (param(sp, "p") ?? "").split(",").filter(Boolean);
  const selected = requested.filter((slug) => professors.some((p) => p.professor_slug === slug)).slice(0, MAX_COMPARE);
  const rows = selected.map((slug) => professors.find((p) => p.professor_slug === slug)!);

  const overallBest = bestIndex(rows.map((r) => (r.avg_overall == null ? null : Number(r.avg_overall))));
  const easiest = bestIndex(rows.map((r) => (r.avg_difficulty == null ? null : Number(r.avg_difficulty))), true);
  const lowData = rows.some((r) => r.review_count < LOW_CONFIDENCE_THRESHOLD);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t.compare.title}</h1>
      <p className="mt-2 text-muted-foreground">{t.compare.subtitle}</p>
      <div className="mt-8 grid gap-6">
        <CompareSelector
          courses={courses.map((c) => ({ slug: c.slug, label: `${c.code} · ${c.name}` }))}
          courseSlug={course?.slug}
          professors={professors.map((p) => ({ slug: p.professor_slug, name: p.professor_name, reviews: p.review_count }))}
          selected={selected}
        />
        {!course ? (
          <EmptyState icon={<Columns3 />} title={t.compare.empty} />
        ) : rows.length < 2 ? (
          <EmptyState icon={<Columns3 />} title={t.compare.needTwo} />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                <span className="mr-2 font-mono text-sm text-muted-foreground">{course.code}</span>
                {course.name}
              </h2>
              <SaveComparison
                courseId={course.id}
                professorIds={rows.map((r) => r.professor_id)}
                name={`${course.code} · ${rows.map((r) => r.professor_name).join(" vs ")}`.slice(0, 80)}
                signedIn={Boolean(user)}
              />
            </div>
            <ComparisonTable rows={rows} t={t} />
            <div className="flex items-start gap-3 rounded-2xl border bg-accent/40 p-5 text-sm">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-500" />
              <div className="grid gap-1">
                <p className="font-medium">{t.compare.verdictTitle}</p>
                {overallBest >= 0 && <p>{format(t.compare.verdictBest, { name: rows[overallBest].professor_name })}</p>}
                {easiest >= 0 && <p>{format(t.compare.verdictEasiest, { name: rows[easiest].professor_name })}</p>}
                {lowData && <p className="text-amber-700 dark:text-amber-300">{t.compare.verdictLowData}</p>}
                <p className="text-xs text-muted-foreground">{t.reviews.opinionDisclaimer}</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
