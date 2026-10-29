import { describe, expect, it } from "vitest";
import { cleanUserText, containsContactInfo, mapDbError } from "./moderation";

describe("containsContactInfo", () => {
  it.each([
    "escríbeme a alumno@tec.mx",
    "mira https://example.com",
    "www.example.com tiene todo",
    "mi cel es 55 1234 5678",
    "llama al +52 (55) 1234-5678",
  ])("flags %s", (text) => expect(containsContactInfo(text)).toBe(true));

  it.each(["Explica muy bien los temas de la semana 3", "Tuvimos 3 exámenes y 10 tareas", "", null])("allows %s", (text) =>
    expect(containsContactInfo(text)).toBe(false),
  );
});

describe("cleanUserText", () => {
  it("strips tags, control characters and extra blank lines", () => {
    expect(cleanUserText("  <b>Hola</b>\u0007\n\n\n\nmundo<script>x</script>  ")).toBe("Hola\n\nmundox");
  });
  it("returns an empty string for nullish input", () => {
    expect(cleanUserText(undefined)).toBe("");
  });
});

describe("mapDbError", () => {
  it.each([
    [{ code: "23505" }, "duplicateReview"],
    [{ code: "P0429", message: "rate_limited" }, "rateLimited"],
    [{ code: "P0001", message: "review_contains_personal_info" }, "personalInfo"],
    [{ code: "P0001", message: "review_contains_prohibited_language" }, "prohibitedLanguage"],
    [{ code: "42501", message: "new row violates row-level security policy" }, "forbidden"],
    [{ code: "23514" }, "invalidInput"],
    [{ code: "XX000", message: "boom" }, "generic"],
    [null, "generic"],
  ] as const)("maps %j to %s", (error, key) => expect(mapDbError(error)).toBe(key));
});
