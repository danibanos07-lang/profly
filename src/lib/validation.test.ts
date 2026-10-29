import { describe, expect, it } from "vitest";
import { academicProfileSchema, reviewSchema, signupSchema } from "./validation";

const valid = {
  professor_course_id: "11111111-1111-4111-8111-111111111111",
  campus_id: "22222222-2222-4222-8222-222222222222",
  term_id: "33333333-3333-4333-8333-333333333333",
  teaching_format: "in_person",
  would_take_again: true,
  recommends_course: false,
  weekly_hours: "6",
  tags: ["clear_explanations", "clear_explanations", "fair_grading"],
  body: "Explica con calma y deja ejercicios que preparan bien para los exámenes parciales.",
  advice: "",
  professor_scores: { clarity: 5, attitude: 4, grading_fairness: 4, availability: 3, organization: 5, engagement: 4 },
  course_scores: { difficulty: 3, workload: 3, content_clarity: 4, usefulness: 5, organization: 4, satisfaction: 4 },
  accepts_guidelines: true,
};

describe("reviewSchema", () => {
  it("accepts a complete review and normalizes it", () => {
    const result = reviewSchema.parse(valid);
    expect(result.weekly_hours).toBe(6);
    expect(result.tags).toEqual(["clear_explanations", "fair_grading"]);
    expect(result.exam_count).toBeNull();
  });

  it("rejects a body that is too short", () => {
    const result = reviewSchema.safeParse({ ...valid, body: "Muy bien" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("tooShort");
  });

  it("rejects contact information in the body", () => {
    const result = reviewSchema.safeParse({ ...valid, body: `${valid.body} Escríbeme a alguien@example.com` });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((i) => i.message === "personalInfo")).toBe(true);
  });

  it("rejects unknown tags and out-of-range scores", () => {
    expect(reviewSchema.safeParse({ ...valid, tags: ["mean_person"] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, professor_scores: { ...valid.professor_scores, clarity: 6 } }).success).toBe(false);
  });

  it("requires accepting the guidelines", () => {
    expect(reviewSchema.safeParse({ ...valid, accepts_guidelines: false }).success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("rejects weak passwords", () => {
    const result = signupSchema.safeParse({ email: "a@tec.mx", password: "short", accepts_terms: "on" });
    expect(result.success).toBe(false);
  });
});

describe("final grade", () => {
  it("is optional and defaults to null", () => {
    expect(reviewSchema.parse(valid).final_grade).toBeNull();
  });

  it("accepts a number and rejects negatives", () => {
    expect(reviewSchema.parse({ ...valid, final_grade: 85 }).final_grade).toBe(85);
    expect(reviewSchema.safeParse({ ...valid, final_grade: -1 }).success).toBe(false);
  });
});

describe("academicProfileSchema", () => {
  it("accepts a partial profile", () => {
    const result = academicProfileSchema.parse({ university_id: "11111111-1111-4111-8111-111111111111", current_semester: 2 });
    expect(result).toMatchObject({ current_semester: 2, program_id: null, start_year: null });
  });

  it("rejects an impossible semester", () => {
    expect(academicProfileSchema.safeParse({ current_semester: 0 }).success).toBe(false);
  });
});
