import { describe, it, expect } from "vitest";
import { formatNoteDateTime, formatCompactRelativeTime } from "@/lib/utils";

describe("DateTime Formatting Utilities", () => {
  it("formats today timestamp as Today, h:mm A", () => {
    const now = new Date();
    const result = formatNoteDateTime(now.toISOString());
    expect(result).toMatch(/^Today, \d{1,2}:\d{2}\s?(AM|PM)$/i);
  });

  it("formats yesterday timestamp as Yesterday, h:mm A", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatNoteDateTime(yesterday.toISOString());
    expect(result).toMatch(/^Yesterday, \d{1,2}:\d{2}\s?(AM|PM)$/i);
  });

  it("formats older dates with month and day", () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const result = formatNoteDateTime(pastDate.toISOString());
    expect(result).toContain(",");
    expect(result).not.toContain("Today");
    expect(result).not.toContain("Yesterday");
  });

  it("handles null or invalid ISO strings gracefully", () => {
    expect(formatNoteDateTime(null)).toMatch(/^Today,/);
    expect(formatNoteDateTime("invalid-date-string")).toMatch(/^Today,/);
  });

  it("formats compact relative times accurately", () => {
    const now = Date.now();
    expect(formatCompactRelativeTime(new Date(now - 10 * 1000).toISOString())).toBe("Just now");
    expect(formatCompactRelativeTime(new Date(now - 2 * 60 * 1000).toISOString())).toBe("2m ago");
    expect(formatCompactRelativeTime(new Date(now - 3 * 3600 * 1000).toISOString())).toBe("3h ago");
    expect(formatCompactRelativeTime(new Date(now - 24 * 3600 * 1000).toISOString())).toBe("Yesterday");
  });
});
