import { describe, expect, it } from "vitest";
import { meetsCancellationNotice } from "@/lib/cancellation-policy";

const appointmentStartsAt = new Date("2026-12-10T12:00:00.000Z");

describe("meetsCancellationNotice", () => {
  it("allows cancellation exactly at the configured notice deadline", () => {
    expect(
      meetsCancellationNotice(
        appointmentStartsAt,
        12,
        new Date("2026-12-10T00:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("rejects cancellation inside the configured notice window", () => {
    expect(
      meetsCancellationNotice(
        appointmentStartsAt,
        12,
        new Date("2026-12-10T00:01:00.000Z"),
      ),
    ).toBe(false);
  });

  it("does not allow cancellation at or after the appointment start", () => {
    expect(
      meetsCancellationNotice(
        appointmentStartsAt,
        0,
        new Date("2026-12-10T12:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      meetsCancellationNotice(
        appointmentStartsAt,
        0,
        new Date("2026-12-10T12:01:00.000Z"),
      ),
    ).toBe(false);
  });

  it("rejects invalid notice values and dates", () => {
    expect(
      meetsCancellationNotice(
        appointmentStartsAt,
        -1,
        new Date("2026-12-09T00:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      meetsCancellationNotice(
        new Date("invalid"),
        12,
        new Date("2026-12-09T00:00:00.000Z"),
      ),
    ).toBe(false);
  });
});
