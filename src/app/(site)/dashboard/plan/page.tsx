import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, GraduationCap } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { AcademicProfileForm, CourseRecords } from "@/components/dashboard/academic-forms";
import { getAcademicOptions, getMyAcademic, getRecordableCourses, type NextSemesterCourse } from "@/lib/data/academic";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { formatRating } from "@/lib/format";
import { getSessionUser } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My next semester" };

function NextCourseCard({ course, t }: { course: NextSemesterCourse; t: Dictionary }) {
  const label = course.is_catch_up
    ? format(t.plan.catchUp, { n: course.planned_semester ?? "" })
    : course.requirement === "required"
      ? t.plan.expected
      : t.plan.elective;
  const blocked = course.missing_prerequisites.length > 0;
  return (
    <Link href={`/courses/${course.slug}`} className="group flex flex-col gap-3 rounded-2xl border bg-card p-5 transition-colors hover:border-foreground/20">
      <div>
        <span className="font-mono text-[11px] text-muted-foreground">{course.code}</span>
        <h3 className="mt-0.5 font-medium">{course.name}</h3>
      </div>
      <ul className="grid gap-1 text-sm text-muted-foreground tabular">
        <li>{label}</li>
        <li>
          {t.ratings.difficulty}: {formatRating(course.avg_difficulty)}/5
        </li>
        <li>
          {t.grades.short}: {course.avg_grade != null ? `${Number(course.avg_grade)}` : "—"}
        </li>
        <li>{format(t.plan.professorsReviewed, { count: course.reviewed_professor_count })}</li>
      </ul>
      <span className={cn("mt-auto text-xs", blocked ? "text-amber-700 dark:text-amber-300" : "text-score-5")}>
        {blocked ? format(t.plan.missing, { list: course.missing_prerequisites.join(", ") }) : t.plan.eligible}
      </span>
    </Link>
  );
}

export default async function PlanPage() {
  const [{ t }, user] = await Promise.all([getI18n(), getSessionUser()]);
  if (!user) return null;
  const [options, mine] = await Promise.all([getAcademicOptions(), getMyAcademic(user.id)]);
  if (!mine) return null;
  const courses = await getRecordableCourses(mine.profile.university_id);
  const profileReady = Boolean(mine.profile.program_id && mine.profile.current_semester);

  return (
    <div className="grid gap-12">
      <section>
        <h2 className="text-lg font-semibold">{t.plan.title}</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-muted-foreground">{t.plan.subtitle}</p>
        {!profileReady ? (
          <EmptyState icon={<GraduationCap />} title={t.plan.profileTitle} description={t.plan.profileBody} />
        ) : !mine.hasOfficialCurriculum ? (
          <EmptyState icon={<CalendarRange />} title={t.plan.unavailableTitle} description={t.plan.unavailableBody} />
        ) : mine.next.length === 0 ? (
          <EmptyState icon={<CalendarRange />} title={t.plan.nothingLeft} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mine.next.map((course) => (
              <NextCourseCard key={course.course_id} course={course} t={t} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t.academic.title}</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t.academic.hint}</p>
        <div className="rounded-2xl border bg-card p-5 sm:p-6">
          <AcademicProfileForm options={options} profile={mine.profile} />
        </div>
      </section>

      {mine.profile.university_id && (
        <section>
          <h2 className="text-lg font-semibold">{t.plan.myCourses}</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">{t.plan.myCoursesHint}</p>
          <CourseRecords records={mine.records} courses={courses} />
        </section>
      )}
    </div>
  );
}
