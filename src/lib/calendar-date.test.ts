import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  formatCalendarDate,
  getCalendarMonthRange,
  getCalendarWeekStart,
  getLocalCalendarDate,
  getUtcCalendarEnvelope,
  isCalendarDate,
} from "@/lib/calendar-date";

describe("calendar date helpers", () => {
  it("accepts only real calendar dates", () => {
    expect(isCalendarDate("2024-02-29")).toBe(true);
    expect(isCalendarDate("2023-02-29")).toBe(false);
    expect(isCalendarDate("2024-2-09")).toBe(false);
  });

  it("uses Monday as the start of the week", () => {
    expect(getCalendarWeekStart("2024-02-14")).toBe("2024-02-12");
    expect(getCalendarWeekStart("2024-02-18")).toBe("2024-02-12");
  });

  it("handles month boundaries and leap years", () => {
    expect(getCalendarMonthRange("2024-02-29")).toEqual({
      start: "2024-02-01",
      end: "2024-03-01",
    });
    expect(addCalendarDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("creates a broad UTC query envelope and filters in the provider timezone", () => {
    const envelope = getUtcCalendarEnvelope("2024-06-10", "2024-06-11");
    expect(envelope.startsAt.toISOString()).toBe("2024-06-08T12:00:00.000Z");
    expect(envelope.endsAt.toISOString()).toBe("2024-06-12T12:00:00.000Z");
    expect(
      getLocalCalendarDate(
        new Date("2024-06-11T02:00:00.000Z"),
        "America/Sao_Paulo",
      ),
    ).toBe("2024-06-10");
    expect(formatCalendarDate("2024-06-10", { weekday: true })).toContain(
      "segunda-feira",
    );
  });
});
