import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: {
      findMany: mocks.findMany,
      updateMany: mocks.updateMany,
    },
  },
}));

vi.mock("@/server/email/notifications", () => ({
  sendAppointmentReminderEmail: vi.fn(),
}));

import { GET } from "@/app/api/cron/appointment-reminders/route";

const secret = "s".repeat(40);

describe("appointment reminder cron route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", secret);
    mocks.findMany.mockReset().mockResolvedValue([]);
    mocks.updateMany.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without the configured bearer secret", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/appointment-reminders"),
    );

    expect(response.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("runs the reminder query when the bearer secret is valid", async () => {
    const response = await GET(
      new Request("http://localhost/api/cron/appointment-reminders", {
        headers: { Authorization: `Bearer ${secret}` },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      processed: 0,
      sent: 0,
      failed: 0,
    });
    expect(mocks.findMany).toHaveBeenCalledOnce();
  });
});
