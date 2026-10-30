import "server-only";
import { getUniversityContext } from "@/lib/data/catalog";

/** Campuses and terms a review can be filed under (terms that already started). */
export async function getReviewFormOptions() {
  const context = await getUniversityContext();
  if (!context) return null;
  const today = new Date().toISOString().slice(0, 10);
  const terms = context.terms
    .filter((term) => term.is_open_for_reviews && (!term.starts_on || term.starts_on <= today))
    .map((term) => ({ id: term.id, label: term.label }));
  const campuses = context.campuses.filter((c) => c.is_active).map((c) => ({ id: c.id, label: c.name }));
  const defaultCampus = context.campuses.find((c) => c.is_default && c.is_active) ?? context.campuses.find((c) => c.is_active);
  // Older databases lack the grade scale columns; fall back to 0-100.
  const u = context.university as Partial<typeof context.university>;
  const gradeScale = { min: Number(u.grade_scale_min ?? 0), max: Number(u.grade_scale_max ?? 100), step: Number(u.grade_scale_step ?? 1) };
  return { context, terms, campuses, gradeScale, defaultCampusId: defaultCampus?.id ?? "", defaultTermId: terms[0]?.id ?? "" };
}
