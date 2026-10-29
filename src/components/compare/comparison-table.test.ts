import { describe, expect, it } from "vitest";
import { bestIndex } from "./comparison-table";

describe("bestIndex", () => {
  it("picks the highest value by default", () => expect(bestIndex([3.2, 4.5, 4.1])).toBe(1));
  it("picks the lowest value when lower is better", () => expect(bestIndex([3.2, 4.5, 2.9], true)).toBe(2));
  it("ignores missing values", () => expect(bestIndex([null, 2, null])).toBe(1));
  it("returns -1 for ties or no data", () => {
    expect(bestIndex([4, 4, 3])).toBe(-1);
    expect(bestIndex([null, null])).toBe(-1);
  });
});
