import { describe, expect, it } from "vitest";
import { formatRelative } from "./formatRelative";

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0);
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatRelative", () => {
  it("says just now under a minute", () => {
    expect(formatRelative(NOW - 30_000, NOW)).toBe("just now");
  });
  it("counts minutes", () => {
    expect(formatRelative(NOW - 5 * MIN, NOW)).toBe("5 minutes ago");
    expect(formatRelative(NOW - 1 * MIN, NOW)).toBe("1 minute ago");
  });
  it("counts hours", () => {
    expect(formatRelative(NOW - 3 * HOUR, NOW)).toBe("3 hours ago");
  });
  it("says yesterday for one day", () => {
    expect(formatRelative(NOW - 1 * DAY, NOW)).toBe("yesterday");
  });
  it("counts days up to a month", () => {
    expect(formatRelative(NOW - 12 * DAY, NOW)).toBe("12 days ago");
  });
  it("falls back to a date after 30 days", () => {
    const result = formatRelative(NOW - 45 * DAY, NOW);
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});
