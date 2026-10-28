import Link from "next/link";
import { ArrowRight, Columns3, MapPin, PenLine, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/catalog/course-card";
import { ProfessorCard } from "@/components/catalog/professor-card";
import { SectionHeading } from "@/components/common/section-heading";
import { SetupNotice } from "@/components/common/setup-notice";
import { EmptyState } from "@/components/common/empty-state";
import { ReviewCard } from "@/components/reviews/review-card";
import { SearchBox } from "@/components/search/search-box";
import { getHomeData, getUniversityContext } from "@/lib/data/catalog";
import { getI18n } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function HomePage() {
  const [{ t, locale }, data, context, user] = await Promise.all([
    getI18n(),
    getHomeData(),
    getUniversityContext(),
    getSessionUser(),
  ]);
  const stepIcons = [Search, Columns3, PenLine];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-50 mask-fade-b" aria-hidden />
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/20 via-fuchsia-400/15 to-amber-300/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
          <span className="inline-flex animate-fade-up items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            {t.home.eyebrow}
          </span>
          <h1 className="mt-6 animate-fade-up text-4xl font-semibold tracking-tight [animation-delay:60ms] sm:text-6xl">
            {t.home.titleA}
            <br />
            <span className="font-display text-[1.12em] font-normal text-primary italic">{t.home.titleB}</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-up text-base text-muted-foreground [animation-delay:120ms] sm:text-lg">
            {t.home.subtitle}
          </p>
          <div className="mx-auto mt-8 max-w-2xl animate-fade-up text-left [animation-delay:180ms]">
            <SearchBox size="hero" />
          </div>

          {context && (
            <div className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-2 [animation-delay:240ms]">
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" />
                {context.university.name}
              </span>
              {context.campuses.map((campus) =>
                campus.is_active ? (
                  <Link
                    key={campus.id}
                    href={`/search?campus=${campus.id}`}
                    className="rounded-full border bg-card px-3 py-1 text-xs font-medium shadow-soft transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {campus.name}
                  </Link>
                ) : (
                  <span
                    key={campus.id}
                    className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground"
                    title={t.common.comingSoon}
                  >
                    {campus.name} · {t.common.comingSoon}
                  </span>
                ),
              )}
            </div>
          )}

          {data && (
            <dl className="mx-auto mt-10 grid max-w-md animate-fade-up grid-cols-3 gap-4 [animation-delay:300ms]">
              {[
                [data.counts.professors, t.home.statsProfessors],
                [data.counts.courses, t.home.statsCourses],
                [data.counts.reviews, t.home.statsReviews],
              ].map(([value, label]) => (
                <div key={String(label)}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="text-2xl font-semibold tabular">{value}</dd>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-16 px-4 py-14 sm:px-6">
        {!isSupabaseConfigured() && <SetupNotice t={t} />}

        {data && (
          <>
            <section aria-labelledby="trending">
              <SectionHeading
                title={t.home.trending}
                hint={t.home.trendingHint}
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/search?tab=professors&sort=rating">
                      {t.common.seeAll} <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              {data.trending.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {data.trending.map((professor) => (
                    <ProfessorCard key={professor.id} professor={professor} t={t} locale={locale} />
                  ))}
                </div>
              ) : (
                <EmptyState title={t.home.emptyTrending} />
              )}
            </section>

            <section aria-labelledby="courses">
              <SectionHeading
                title={t.home.mostReviewed}
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/search?tab=courses">
                      {t.common.seeAll} <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.courses.map((course) => (
                  <CourseCard key={course.id} course={course} t={t} locale={locale} />
                ))}
              </div>
            </section>

            {data.recent.length > 0 && (
              <section aria-labelledby="recent">
                <SectionHeading title={t.home.recent} />
                <div className="grid gap-4 lg:grid-cols-2">
                  {data.recent.map((review) => (
                    <ReviewCard key={review.id} review={review} t={t} locale={locale} context="feed" signedIn={Boolean(user)} compact />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section aria-labelledby="how" className="grid gap-6">
          <h2 id="how" className="text-center text-2xl font-semibold sm:text-3xl">
            {t.home.howTitle}
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {t.home.how.map((step, i) => {
              const Icon = stepIcons[i] ?? Search;
              return (
                <li key={step.title} className="rounded-2xl border bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </li>
              );
            })}
          </ol>
          <div className="flex items-start gap-3 rounded-2xl border border-dashed bg-subtle p-5 text-sm">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">{t.home.trustTitle}</p>
              <p className="mt-1 text-muted-foreground">{t.home.trustBody}</p>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_55%)]" aria-hidden />
          <h2 className="relative font-display text-3xl italic sm:text-4xl">{t.home.ctaTitle}</h2>
          <p className="relative mx-auto mt-2 max-w-md text-primary-foreground/80">{t.home.ctaBody}</p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/reviews/new">
                <PenLine />
                {t.home.ctaButton}
              </Link>
            </Button>
            {!user && (
              <Button asChild size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                <Link href="/signup">{t.nav.signup}</Link>
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
