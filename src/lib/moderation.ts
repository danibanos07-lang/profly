/**
 * Client/server-side content checks. They mirror the database trigger
 * `reviews_content_guard` so users get immediate feedback; the database
 * remains the source of truth.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const URL = /(https?:\/\/|www\.)/i;
const PHONE = /\+?[0-9]{8,}/;

export function containsContactInfo(text: string | null | undefined) {
  if (!text) return false;
  return EMAIL.test(text) || URL.test(text) || PHONE.test(text.replace(/[\s().-]/g, ""));
}

/** Strips control characters and HTML tags and collapses blank lines. */
export function cleanUserText(text: string | null | undefined) {
  if (!text) return "";
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type DbErrorKey =
  | "duplicateReview"
  | "personalInfo"
  | "prohibitedLanguage"
  | "tooShort"
  | "rateLimited"
  | "forbidden"
  | "unauthorized"
  | "termNotOpen"
  | "notReviewable"
  | "invalidInput"
  | "generic";

/** Maps a PostgREST/Postgres error to a user-facing dictionary key. */
export function mapDbError(error: { code?: string; message?: string } | null | undefined): DbErrorKey {
  if (!error) return "generic";
  const message = error.message ?? "";
  if (error.code === "23505") return "duplicateReview";
  if (error.code === "P0429" || message.includes("rate_limited")) return "rateLimited";
  if (message.includes("review_contains_personal_info")) return "personalInfo";
  if (message.includes("review_contains_prohibited_language")) return "prohibitedLanguage";
  if (message.includes("review_body_too_short")) return "tooShort";
  if (message.includes("term_not_open_for_reviews") || message.includes("invalid_term")) return "termNotOpen";
  if (message.includes("profile_not_reviewable") || message.includes("invalid_professor_course")) return "notReviewable";
  if (error.code === "28000" || message.includes("not_authenticated")) return "unauthorized";
  if (error.code === "42501" || message.includes("row-level security") || message.includes("forbidden")) return "forbidden";
  if (error.code === "23514" || error.code === "22P02" || error.code === "22023") return "invalidInput";
  return "generic";
}
