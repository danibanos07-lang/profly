import { describe, expect, it } from "vitest";
import { courseFormSchema, mergeSchema, missingColumns, prerequisiteFormSchema, professorFormSchema, universityFormSchema, validateImportRows } from "./admin-validation";

const UNI = "00000000-0000-4000-a000-000000000001";

describe("professorFormSchema", () => {
  it("generates an accent-free slug and reads checkboxes", () => {
    const result = professorFormSchema.parse({ university_id: UNI, first_name: "José", last_name: "Núñez Peña", is_active: "on" });
    expect(result.slug).toBe("jose-nunez-pena");
    expect(result.is_active).toBe(true);
    expect(result.is_fictional).toBe(false);
    expect(result.department_id).toBeNull();
  });
});

describe("courseFormSchema", () => {
  it("uppercases the code and builds the slug from code and name", () => {
    const result = courseFormSchema.parse({ university_id: UNI, code: "tc1028", name: "Pensamiento computacional", credits: "" });
    expect(result.code).toBe("TC1028");
    expect(result.slug).toBe("tc1028-pensamiento-computacional");
    expect(result.credits).toBeNull();
  });
});

describe("prerequisiteFormSchema", () => {
  const base = { course_id: UNI, prerequisite_course_id: "11111111-1111-4111-8111-111111111111" };
  it("requires an official source to mark a prerequisite as verified", () => {
    expect(prerequisiteFormSchema.safeParse({ ...base, is_verified: "on" }).success).toBe(false);
    expect(prerequisiteFormSchema.safeParse({ ...base, is_verified: "on", source_url: "https://example.edu/plan" }).success).toBe(true);
  });
  it("rejects a course as its own prerequisite", () => {
    expect(prerequisiteFormSchema.safeParse({ course_id: UNI, prerequisite_course_id: UNI }).success).toBe(false);
  });
});

describe("universityFormSchema", () => {
  it("normalizes email domains", () => {
    const result = universityFormSchema.parse({ id: UNI, name: "Universidad", short_name: "UNI", email_domains: "@Tec.mx, exatec.tec.mx" });
    expect(result.email_domains).toEqual(["tec.mx", "exatec.tec.mx"]);
  });
  it("rejects invalid domains", () => {
    expect(universityFormSchema.safeParse({ id: UNI, name: "Universidad", short_name: "UNI", email_domains: "not a domain!" }).success).toBe(false);
  });
});

describe("mergeSchema", () => {
  it("refuses to merge a record into itself", () => {
    const result = mergeSchema.safeParse({ kind: "professor", source: UNI, target: UNI });
    expect(result.success).toBe(false);
  });
});

describe("CSV import validation", () => {
  it("reports missing required columns", () => {
    expect(missingColumns("courses", ["Code", "credits"])).toEqual(["name"]);
    expect(missingColumns("assignments", ["professor_slug", "course_code"])).toEqual([]);
  });

  it("splits valid rows from invalid ones with line numbers", () => {
    const { valid, errors } = validateImportRows("courses", [
      { code: "ma1001", name: "Cálculo", credits: "8" },
      { code: "!!", name: "X" },
      { code: "FI1002", name: "Física", name_language: "EN" },
    ]);
    expect(valid.map((v) => [v.line, v.row.code])).toEqual([
      [2, "MA1001"],
      [4, "FI1002"],
    ]);
    expect(valid[0].row.credits).toBe(8);
    expect(valid[1].row.name_language).toBe("en");
    expect(errors).toHaveLength(1);
    expect(errors[0].line).toBe(3);
  });
});
