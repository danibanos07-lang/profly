import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseCard } from "@/components/catalog/course-card";
import { ProfessorCard } from "@/components/catalog/professor-card";
import { SetupNotice } from "@/components/common/setup-notice";
import { SearchBox } from "@/components/search/search-box";
import { getHomeData } from "@/lib/data/catalog";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/env";

function BrowseSection({ title, href, seeAll, children }: { title: string; href: string; seeAll: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-base font-medium">{title}</h2>
        <Link href={href} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          {seeAll}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

export default async function HomePage() {
  const [{ t, locale }, data] = await Promise.all([getI18n(), getHomeData()]);

  return (
    <>
      <section className="mx-auto max-w-2xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 sm:pb-20">
        <h1 className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-5xl">{t.home.title}</h1>
        <p className="mx-auto mt-4 max-w-lg animate-fade-up text-muted-foreground [animation-delay:60ms]">{t.home.subtitle}</p>
        <div className="mt-8 animate-fade-up text-left [animation-delay:120ms]">
          <SearchBox size="hero" />
        </div>
        {data && (
          <p className="mt-5 animate-fade-up text-xs text-muted-foreground tabular [animation-delay:180ms]">
            {data.counts.professors} {t.home.statsProfessors} · {data.counts.courses} {t.home.statsCourses} · {data.counts.reviews} {t.home.statsReviews}
          </p>
        )}
      </section>

      <div className="mx-auto grid max-w-6xl gap-14 px-4 pb-20 sm:px-6">
        {!isSupabaseConfigured() && <SetupNotice t={t} />}
        {data && (
          <>
            <BrowseSection title={t.home.browseProfessors} href="/search?tab=professors&sort=rating" seeAll={t.common.seeAll}>
              {data.professors.map((professor) => (
                <ProfessorCard key={professor.id} professor={professor} t={t} locale={locale} />
              ))}
            </BrowseSection>
            <BrowseSection title={t.home.browseCourses} href="/search?tab=courses" seeAll={t.common.seeAll}>
              {data.courses.map((course) => (
                <CourseCard key={course.id} course={course} t={t} locale={locale} />
              ))}
            </BrowseSection>
          </>
        )}
      </div>
    </>
  );
}
