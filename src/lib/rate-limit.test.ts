import { describe, expect, it } from "vitest";
import { hitRateLimit } from "./rate-limit";

describe("hitRateLimit", () => {
  it("allows up to the limit within the window and then blocks", () => {
    const key = `test-${Math.random()}`;
    const now = 1_000_000;
    expect(hitRateLimit(key, 2, 1000, now)).toBe(false);
    expect(hitRateLimit(key, 2, 1000, now + 10)).toBe(false);
    expect(hitRateLimit(key, 2, 1000, now + 20)).toBe(true);
    // The window slides.
    expect(hitRateLimit(key, 2, 1000, now + 1500)).toBe(false);
  });
});
