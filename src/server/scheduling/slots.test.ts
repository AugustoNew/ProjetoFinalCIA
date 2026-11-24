import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "./slots";

const date = "2026-11-23";
const now = new Date("2026-11-01T12:00:00.000Z");
const baseInput = {
  date,
  timeZone: "America/Sao_Paulo",
  serviceDurationMinutes: 60,
  availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
  appointments: [],
  timeOffs: [],
  now,
};

function localTime(dateTime: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: baseInput.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(dateTime);
}

describe("generateAvailableSlots", () => {
  it("returns no slots when the provider has no availability that day", () => {
    expect(generateAvailableSlots({ ...baseInput, availability: [] })).toEqual(
      [],
    );
  });

  it("removes a slot when an appointment overlaps only part of it", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      appointments: [
        {
          startsAt: new Date("2026-11-23T12:30:00.000Z"),
          endsAt: new Date("2026-11-23T13:00:00.000Z"),
          status: "CONFIRMED",
        },
      ],
    });

    expect(slots.map(localTime)).not.toContain("09:00");
    expect(slots.map(localTime)).toContain("10:00");
  });

  it("does not block a slot for a cancelled appointment", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      appointments: [
        {
          startsAt: new Date("2026-11-23T12:30:00.000Z"),
          endsAt: new Date("2026-11-23T13:00:00.000Z"),
          status: "CANCELLED",
        },
      ],
    });

    expect(slots.map(localTime)).toContain("09:00");
  });

  it("requires the full service duration to fit inside availability", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      serviceDurationMinutes: 180,
    });

    expect(slots.map(localTime)).toEqual(["09:00"]);
  });

  it("uses the configured interval between slot starts", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      slotIntervalMinutes: 30,
    });

    expect(slots.map(localTime)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);
  });

  it("removes slots that overlap a time off", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      timeOffs: [
        {
          startsAt: new Date("2026-11-23T13:00:00.000Z"),
          endsAt: new Date("2026-11-23T13:30:00.000Z"),
        },
      ],
    });

    expect(slots.map(localTime)).not.toContain("10:00");
    expect(slots.map(localTime)).toContain("10:30");
  });

  it("omits past slots and slots inside the minimum notice window", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      now: new Date("2026-11-23T13:00:00.000Z"),
      availability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "13:00" }],
    });

    expect(slots.map(localTime)).toEqual(["12:00"]);
  });

  it("allows slots adjacent to an existing appointment without overlap", () => {
    const slots = generateAvailableSlots({
      ...baseInput,
      appointments: [
        {
          startsAt: new Date("2026-11-23T13:00:00.000Z"),
          endsAt: new Date("2026-11-23T14:00:00.000Z"),
          status: "PENDING",
        },
      ],
    });

    expect(slots.map(localTime)).toContain("09:00");
    expect(slots.map(localTime)).toContain("11:00");
  });

  it("does not generate slots in nonexistent local times during DST changes", () => {
    const slots = generateAvailableSlots({
      date: "2026-03-08",
      timeZone: "America/New_York",
      serviceDurationMinutes: 30,
      availability: [{ dayOfWeek: 0, startTime: "01:00", endTime: "04:00" }],
      appointments: [],
      timeOffs: [],
      now: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(slots.map((slot) => formatInNewYork(slot))).not.toContain("02:00");
  });
});

function formatInNewYork(dateTime: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(dateTime);
}
