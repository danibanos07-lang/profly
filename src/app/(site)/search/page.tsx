import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CourseCard } from "@/components/catalog/course-card";
import { ProfessorCard } from "@/components/catalog/professor-card";
import { EmptyState } from "@/components/common/empty-state";
import { SetupNotice } from "@/components/common/setup-notice";
import { SearchBox } from "@/components/search/search-box";
import { getUniversityContext, searchCourses, searchProfessors } from "@/lib/data/catalog";
import { getI18n } from "@/lib/i18n/server";
import { format } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/env";
import { numberParam, pageParam, param, uuidParam } from "@/lib/params";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Search" };

const professorSorts = ["relevance", "rating", "reviews", "difficulty", "take_again", "name"] as const;
const courseSorts = ["relevance", "rating", "reviews", "difficulty", "workload", "name"] as const;

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const [{ t, locale }, context] = await Promise.all([getI18n(), getUniversityContext()]);
  const tab = param(sp, "tab") === "courses" ? "courses" : "professors";
  const query = (param(sp, "q") ?? "").slice(0, 80);
  const page = pageParam(sp);
  const campusId = uuidParam(sp, "campus");
  const departmentId = uuidParam(sp, "department");
  const sort = param(sp, "sort") ?? "relevance";
  const filters = {
    minRating: numberParam(sp, "minRating"),
    maxDifficulty: numberParam(sp, "maxDifficulty"),
    maxWeeklyHours: numberParam(sp, "maxHours"),
    minReviews: numberParam(sp, "minReviews"),
    minPct: numberParam(sp, "minPct"),
  };
  const universityId = context?.university.id;

  const [professors, courses] = await Promise.all([
    tab === "professors"
      ? searchProfessors(
          {
            query,
            campusId,
            departmentId,
            minRating: filters.minRating,
            maxDifficulty: filters.maxDifficulty,
            maxWeeklyHours: filters.maxWeeklyHours,
            minReviews: filters.minReviews,
            minTakeAgain: filters.minPct,
            sort,
            page,
          },
          universityId,
        )
      : null,
    tab === "courses"
      ? searchCourses(
          {
            query,
            campusId,
            departmentId,
            maxDifficulty: filters.maxDifficulty,
            maxWeeklyHours: filters.maxWeeklyHours,
            minReviews: filters.minReviews,
            minRecommend: filters.minPct,
            sort,
            page,
          },
          universityId,
        )
      : null,
  ]);

  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) if (typeof value === "string" && key !== "page" && key !== "tab") base.set(key, value);
  const tabHref = (next: string) => {
    const p = new URLSearchParams(base);
    p.set("tab", next);
    p.delete("sort");
    return `/search?${p.toString()}`;
  };
  const pageHref = (n: number) => {
    const p = new URLSearchParams(base);
    p.set("tab", tab);
    if (n > 1) p.set("page", String(n));
    return `/search?${p.toString()}`;
  };
  const hasMore = (tab === "professors" ? professors?.hasMore : courses?.hasMore) ?? false;
  const items = tab === "professors" ? professors?.items ?? [] : courses?.items ?? [];
  const sorts = tab === "professors" ? professorSorts : courseSorts;
  const activeFilters = Object.values(filters).filter((v) => v !== undefined).length + (campusId ? 1 : 0) + (departmentId ? 1 : 0);

  const filterForm = (
    <form method="get" action="/search" className="grid gap-4">
      <input type="hidden" name="tab" value={tab} />
      {query && <input type="hidden" name="q" value={query} />}
      <div className="grid gap-2">
        <Label htmlFor="f-sort">{t.search.sortBy}</Label>
        <NativeSelect id="f-sort" name="sort" defaultValue={sort}>
          {sorts.map((s) => (
            <option key={s} value={s}>
              {t.search.sort[s]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {context && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="f-campus">{t.common.campus}</Label>
            <NativeSelect id="f-campus" name="campus" defaultValue={campusId ?? ""}>
              <option value="">{t.common.all}</option>
              {context.campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.is_active ? ` (${t.common.comingSoon})` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="f-dept">{t.common.department}</Label>
            <NativeSelect id="f-dept" name="department" defaultValue={departmentId ?? ""}>
              <option value="">{t.common.all}</option>
              {context.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === "en" ? d.name_en ?? d.name : d.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </>
      )}
      {tab === "professors" && (
        <div className="grid gap-2">
          <Label htmlFor="f-minRating">{t.search.minRating}</Label>
          <NativeSelect id="f-minRating" name="minRating" defaultValue={filters.minRating?.toString() ?? ""}>
            <option value="">{t.common.any}</option>
            {[4.5, 4, 3.5, 3].map((v) => (
              <option key={v} value={v}>
                {v}+
              </option>
            ))}
          </NativeSelect>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="f-maxDifficulty">{t.search.maxDifficulty}</Label>
        <NativeSelect id="f-maxDifficulty" name="maxDifficulty" defaultValue={filters.maxDifficulty?.toString() ?? ""}>
          <option value="">{t.common.any}</option>
          {[2, 2.5, 3, 3.5, 4].map((v) => (
            <option key={v} value={v}>
              ≤ {v}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f-maxHours">{t.search.maxWorkload}</Label>
        <Input id="f-maxHours" name="maxHours" type="number" min={0} max={60} inputMode="numeric" defaultValue={filters.maxWeeklyHours ?? ""} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f-minReviews">{t.search.minReviews}</Label>
        <NativeSelect id="f-minReviews" name="minReviews" defaultValue={filters.minReviews?.toString() ?? ""}>
          <option value="">{t.common.any}</option>
          {[1, 3, 5, 10, 25].map((v) => (
            <option key={v} value={v}>
              {v}+
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="f-minPct">{tab === "professors" ? t.search.minTakeAgain : t.search.minRecommend}</Label>
        <NativeSelect id="f-minPct" name="minPct" defaultValue={filters.minPct?.toString() ?? ""}>
          <option value="">{t.common.any}</option>
          {[50, 70, 80, 90].map((v) => (
            <option key={v} value={v}>
              {v}%+
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {t.common.apply}
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/search?tab=${tab}${query ? `&q=${encodeURIComponent(query)}` : ""}`}>{t.common.reset}</Link>
        </Button>
      </div>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {query ? format(t.search.resultsFor, { query }) : tab === "professors" ? t.search.allProfessors : t.search.allCourses}
      </h1>
      <div className="mt-5 max-w-2xl">
        <SearchBox defaultValue={query} key={query} />
      </div>
      {!isSupabaseConfigured() && (
        <div className="mt-6">
          <SetupNotice t={t} />
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-xl bg-muted p-1" aria-label={t.search.title}>
          {(["professors", "courses"] as const).map((key) => (
            <Link
              key={key}
              href={tabHref(key)}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                tab === key && "bg-card text-foreground shadow-soft",
              )}
            >
              {key === "professors" ? t.search.tabProfessors : t.search.tabCourses}
            </Link>
          ))}
        </nav>
        <details className="w-full rounded-xl border bg-card p-4 shadow-soft lg:hidden">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="size-4" />
            {t.search.filters}
            {activeFilters > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilters}</span>}
          </summary>
          <div className="mt-4">{filterForm}</div>
        </details>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4" />
              {t.search.filters}
            </h2>
            {filterForm}
          </div>
        </aside>
        <section aria-live="polite">
          {items.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title={t.search.noResults}
              description={t.search.noResultsHint}
              action={
                <Button asChild variant="outline">
                  <Link href="/suggest">{t.search.suggestMissing}</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {tab === "professors"
                ? professors?.items.map((p) => <ProfessorCard key={p.id} professor={p} t={t} locale={locale} />)
                : courses?.items.map((c) => <CourseCard key={c.id} course={c} t={t} locale={locale} />)}
            </div>
          )}
          {(page > 1 || hasMore) && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="pagination">
              {page > 1 && (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page - 1)}>{t.common.previous}</Link>
                </Button>
              )}
              <span className="px-2 text-sm text-muted-foreground tabular">{page}</span>
              {hasMore && (
                <Button asChild variant="outline" size="sm">
                  <Link href={pageHref(page + 1)}>{t.common.next}</Link>
                </Button>
              )}
            </nav>
          )}
          {items.length > 0 && (
            <p className="mt-8 text-center text-sm">
              <Link href="/suggest" className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {t.search.suggestMissing}
              </Link>
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
