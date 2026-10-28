"use client";

import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MAX_COMPARE } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/client";
import { format } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function CompareSelector({
  courses,
  courseSlug,
  professors,
  selected,
}: {
  courses: { slug: string; label: string }[];
  courseSlug?: string;
  professors: { slug: string; name: string; reviews: number }[];
  selected: string[];
}) {
  const { t } = useI18n();
  const router = useRouter();
  const go = (course: string | undefined, picks: string[]) => {
    const params = new URLSearchParams();
    if (course) params.set("course", course);
    if (picks.length) params.set("p", picks.join(","));
    router.push(`/compare${params.size ? `?${params}` : ""}`, { scroll: false });
  };
  const toggle = (slug: string) => {
    if (selected.includes(slug)) go(courseSlug, selected.filter((s) => s !== slug));
    else if (selected.length < MAX_COMPARE) go(courseSlug, [...selected, slug]);
  };
  return (
    <div className="grid gap-5 rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="grid gap-2">
        <Label htmlFor="compare-course">{t.compare.pickCourse}</Label>
        <NativeSelect id="compare-course" value={courseSlug ?? ""} onChange={(e) => go(e.target.value || undefined, [])}>
          <option value="">—</option>
          {courses.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {courseSlug && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{format(t.compare.pickProfessors, { max: MAX_COMPARE })}</legend>
          <div className="flex flex-wrap gap-2">
            {professors.map((p) => {
              const on = selected.includes(p.slug);
              const disabled = !on && selected.length >= MAX_COMPARE;
              return (
                <button
                  key={p.slug}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => toggle(p.slug)}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                  )}
                >
                  {on && <Check className="size-3.5" />}
                  {p.name}
                  <span className={cn("text-xs tabular", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{p.reviews}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
