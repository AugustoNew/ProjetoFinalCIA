import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendCancellationEmails,
  sendAppointmentReminderEmail,
  sendNewBookingEmails,
} from "@/server/email/notifications";
import { sendEmailSafely, type EmailMessage } from "@/server/email/provider";

const appointment = {
  clientName: '<Ana & "Bia">',
  clientEmail: "cliente@example.com",
  clientPhone: "+55 11 99999-1234",
  startsAt: new Date("2026-12-10T13:00:00.000Z"),
  endsAt: new Date("2026-12-10T13:30:00.000Z"),
  cancelToken: "a".repeat(43),
  provider: {
    name: "Prestador",
    email: "prestador@example.com",
    timeZone: "America/Sao_Paulo",
  },
  service: {
    name: "Consulta",
    durationMinutes: 30,
    priceCents: 15000,
  },
};

describe("transactional email notifications", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "https://agendaki.example");
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("logs booking confirmation emails with an escaped cancellation link", async () => {
    await sendNewBookingEmails(appointment);

    const messages = vi
      .mocked(console.info)
      .mock.calls.map((call) => call[1] as EmailMessage);
    expect(messages).toHaveLength(2);
    const clientMessage = messages.find(
      (message) => message.to === appointment.clientEmail,
    );
    expect(clientMessage?.subject).toContain("Agendamento solicitado");
    expect(clientMessage?.html).toContain("&lt;Ana &amp; &quot;Bia&quot;&gt;");
    expect(clientMessage?.html).toContain(
      `https://agendaki.example/agendamento/cancelar?token=${appointment.cancelToken}`,
    );
    expect(
      messages.some((message) => message.to === appointment.provider.email),
    ).toBe(true);
  });

  it("logs a reminder to the client", async () => {
    await sendAppointmentReminderEmail(appointment);

    expect(console.info).toHaveBeenCalledWith(
      "[email:development]",
      expect.objectContaining({
        to: appointment.clientEmail,
        subject: expect.stringContaining("Lembrete"),
      }),
    );
  });

  it("notifies both the client and provider about cancellations", async () => {
    await sendCancellationEmails(appointment);

    const messages = vi
      .mocked(console.info)
      .mock.calls.map((call) => call[1] as EmailMessage);
    expect(messages.map((message) => message.to)).toEqual(
      expect.arrayContaining([
        appointment.clientEmail,
        appointment.provider.email,
      ]),
    );
    expect(messages).toHaveLength(2);
  });

  it("logs email provider failures and returns a failed result", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const provider = {
      send: vi.fn().mockRejectedValue(new Error("provider unavailable")),
    };

    await expect(
      sendEmailSafely(
        () => ({ to: "cliente@example.com", subject: "Teste", html: "" }),
        provider,
      ),
    ).resolves.toBe(false);
    expect(error).toHaveBeenCalled();
  });

  it("sends through Resend in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "test-api-key");
    vi.stubEnv("EMAIL_FROM", "Agendaki <agenda@example.com>");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      sendEmailSafely(() => ({
        to: "cliente@example.com",
        subject: "Teste",
        html: "<p>Olá</p>",
      })),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      from: "Agendaki <agenda@example.com>",
      to: "cliente@example.com",
      subject: "Teste",
    });
  });
});
