import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => {
  const provider = {
    id: "provider-1",
    name: "Dra. Teste",
    slug: "dra-teste",
    timeZone: "America/Sao_Paulo",
  };
  const services = [
    { id: "service-1", durationMinutes: 30, providerId: provider.id },
  ];
  const availability = [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }];
  const appointments: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    cancelToken: string;
  }> = [];
  let providerLock: Promise<void> = Promise.resolve();

  function createTransactionClient() {
    let releaseLock = () => {};
    return {
      client: {
        $executeRaw: async (_query: TemplateStringsArray, slug: string) => {
          const previous = providerLock;
          providerLock = new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
          await previous;
          return slug === provider.slug ? 1 : 0;
        },
        user: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) =>
            (where.slug === provider.slug || where.id === provider.id) &&
            where.role === "PROVIDER"
              ? provider
              : null,
        },
        service: {
          findFirst: async ({ where }: { where: Record<string, unknown> }) =>
            services.find(
              (service) =>
                where.id === service.id &&
                where.providerId === service.providerId &&
                where.active === true,
            ) ?? services[0],
        },
        availability: {
          findMany: async () => availability,
        },
        appointment: {
          findMany: async () => appointments,
          create: async ({
            data,
          }: {
            data: Omit<(typeof appointments)[number], "id">;
          }) => {
            const appointment = {
              ...data,
              id: `appointment-${appointments.length + 1}`,
            };
            appointments.push(appointment);
            return appointment;
          },
        },
        timeOff: {
          findMany: async () => [],
        },
      },
      release() {
        releaseLock();
      },
    };
  }

  const prisma = {
    $transaction: async <T>(
      callback: (
        transaction: ReturnType<typeof createTransactionClient>["client"],
      ) => Promise<T>,
    ) => {
      const { client, release } = createTransactionClient();
      try {
        return await callback(client);
      } finally {
        release();
      }
    },
  };

  return {
    appointments,
    prisma,
    reset() {
      appointments.length = 0;
      providerLock = Promise.resolve();
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: memory.prisma }));

import {
  createPublicBooking,
  PublicBookingError,
} from "@/server/public-booking";

const bookingInput = {
  slug: "dra-teste",
  serviceId: "service-1",
  startsAt: new Date("2030-01-07T12:00:00.000Z"),
  clientName: "Cliente de Teste",
  clientEmail: "cliente@example.com",
  clientPhone: "+55 11 99999-1234",
};

describe("createPublicBooking concurrency", () => {
  beforeEach(() => memory.reset());

  it("allows only one simultaneous reservation for the same provider slot", async () => {
    const results = await Promise.allSettled([
      createPublicBooking(bookingInput),
      createPublicBooking(bookingInput),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(PublicBookingError);
      expect(rejected.reason.code).toBe("SLOT_UNAVAILABLE");
    }
    expect(memory.appointments).toHaveLength(1);
    expect(memory.appointments[0].cancelToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
