import { describe, expect, it } from "vitest";
import { formatHours, formatPercent, formatRating, initials, scoreTone, slugify } from "./format";
import { format } from "./i18n/config";

describe("format helpers", () => {
  it("formats ratings, percents and hours with a dash for missing data", () => {
    expect(formatRating(4.256)).toBe("4.3");
    expect(formatRating(null)).toBe("—");
    expect(formatPercent(66.6)).toBe("67%");
    expect(formatHours(4)).toBe("4");
    expect(formatHours(4.25)).toBe("4.3");
  });

  it("maps scores to tones, optionally inverted for difficulty", () => {
    expect(scoreTone(4.8)).toBe(5);
    expect(scoreTone(1.2)).toBe(1);
    expect(scoreTone(4.8, true)).toBe(1);
    expect(scoreTone(null)).toBeNull();
  });

  it("builds initials and slugs", () => {
    expect(initials("Mariana Ficticia")).toBe("MF");
    expect(slugify("  Álgebra Lineal: Teoría & Práctica ")).toBe("algebra-lineal-teoria-practica");
  });

  it("fills placeholders", () => {
    expect(format("{count} reseñas de {name}", { count: 3, name: "Ana" })).toBe("3 reseñas de Ana");
    expect(format("{missing}", {})).toBe("{missing}");
  });
});
