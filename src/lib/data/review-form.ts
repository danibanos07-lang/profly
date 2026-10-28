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
  return { context, terms, campuses, defaultCampusId: defaultCampus?.id ?? "", defaultTermId: terms[0]?.id ?? "" };
}
