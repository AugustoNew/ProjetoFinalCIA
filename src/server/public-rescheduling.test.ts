import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appointmentFindUnique: vi.fn(),
  executeRaw: vi.fn(),
  getAvailableSlots: vi.fn(),
  isSlotAvailable: vi.fn(),
  transaction: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: { findUnique: mocks.appointmentFindUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/server/scheduling", () => ({
  getAvailableSlots: mocks.getAvailableSlots,
  isSlotAvailable: mocks.isSlotAvailable,
}));

import { GET } from "@/app/api/public/reschedule-availability/route";
import { reschedulePublicAppointment } from "@/server/public-rescheduling";

const cancelToken = "a".repeat(43);
const startsAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
const minimumCancellationNoticeHours = 12;

const transactionClient = {
  $executeRaw: mocks.executeRaw,
  appointment: {
    findUnique: mocks.appointmentFindUnique,
    updateMany: mocks.updateMany,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transaction.mockImplementation(
    async (callback: (client: typeof transactionClient) => Promise<unknown>) =>
      callback(transactionClient),
  );
});

describe("public rescheduling notice", () => {
  it("applies the provider notice when listing replacement slots", async () => {
    mocks.appointmentFindUnique.mockResolvedValue({
      id: "appointment-id",
      providerId: "provider-id",
      serviceId: "service-id",
      startsAt,
      status: "CONFIRMED",
      provider: { minimumCancellationNoticeHours },
    });
    mocks.getAvailableSlots.mockResolvedValue([]);

    const date = startsAt.toISOString().slice(0, 10);
    const response = await GET(
      new Request(
        `http://localhost/api/public/reschedule-availability?token=${cancelToken}&date=${date}`,
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.getAvailableSlots).toHaveBeenCalledWith({
      providerId: "provider-id",
      serviceId: "service-id",
      date,
      minimumNoticeHours: minimumCancellationNoticeHours,
      excludeAppointmentId: "appointment-id",
    });
  });

  it("revalidates the replacement slot with the provider notice", async () => {
    const appointment = {
      id: "appointment-id",
      providerId: "provider-id",
      serviceId: "service-id",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      status: "PENDING",
      cancelToken,
      clientName: "Cliente",
      clientEmail: "cliente@example.com",
      clientPhone: "11999999999",
      provider: {
        name: "Prestador",
        email: "prestador@example.com",
        timeZone: "America/Sao_Paulo",
        minimumCancellationNoticeHours,
      },
      service: {
        name: "Consulta",
        durationMinutes: 60,
        priceCents: 10000,
      },
    };
    mocks.appointmentFindUnique
      .mockResolvedValueOnce({ providerId: "provider-id" })
      .mockResolvedValueOnce(appointment);
    mocks.executeRaw.mockResolvedValue(1);
    mocks.isSlotAvailable.mockResolvedValue(true);
    mocks.updateMany.mockResolvedValue({ count: 1 });

    const replacementStart = new Date(startsAt.getTime() + 24 * 60 * 60 * 1000);
    await reschedulePublicAppointment({
      cancelToken,
      startsAt: replacementStart,
    });

    expect(mocks.isSlotAvailable).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "provider-id",
        serviceId: "service-id",
        startsAt: replacementStart,
        minimumNoticeHours: minimumCancellationNoticeHours,
        excludeAppointmentId: "appointment-id",
      }),
      transactionClient,
    );
  });
});
