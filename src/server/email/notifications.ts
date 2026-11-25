import { formatDateTime } from "@/lib/time-zone";
import { sendEmailSafely } from "@/server/email/provider";

export type AppointmentEmailData = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  startsAt: Date;
  endsAt: Date;
  cancelToken: string;
  provider: {
    name: string;
    email: string;
    timeZone: string;
  };
  service: {
    name: string;
    durationMinutes: number;
    priceCents: number;
  };
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

function getApplicationUrl(path: string) {
  const configuredUrl = process.env.APP_URL ?? process.env.AUTH_URL;
  if (!configuredUrl) {
    throw new Error("APP_URL is required to build transactional email links.");
  }

  const baseUrl = new URL(configuredUrl);
  const url = new URL(path, baseUrl);
  return url.toString();
}

function renderEmail(
  title: string,
  paragraphs: string[],
  action?: { href: string; label: string },
) {
  const content = paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const actionMarkup = action
    ? `<p><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:12px 18px;background:#115e59;color:#fff;text-decoration:none;border-radius:8px">${escapeHtml(action.label)}</a></p>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f4f4f5;padding:24px;font-family:Arial,sans-serif;color:#18181b">
    <main style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px">
      <h1 style="font-size:22px">${escapeHtml(title)}</h1>
      ${content}
      ${actionMarkup}
      <p style="font-size:12px;color:#71717a">Agendaki</p>
    </main>
  </body>
</html>`;
}

function appointmentSummary(appointment: AppointmentEmailData) {
  const start = formatDateTime(
    appointment.startsAt,
    appointment.provider.timeZone,
  );
  const end = formatDateTime(appointment.endsAt, appointment.provider.timeZone);
  const price = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(appointment.service.priceCents / 100);

  return { start, end, price };
}

function getCancellationUrl(cancelToken: string) {
  return getApplicationUrl(`/agendamento/${encodeURIComponent(cancelToken)}`);
}

export async function sendNewBookingEmails(appointment: AppointmentEmailData) {
  await Promise.all([
    sendEmailSafely(() => {
      const summary = appointmentSummary(appointment);
      return {
        to: appointment.clientEmail,
        subject: `Agendamento solicitado com ${appointment.provider.name}`,
        html: renderEmail(
          "Recebemos seu agendamento",
          [
            `Olá, ${appointment.clientName}! Sua solicitação para ${appointment.service.name} foi recebida por ${appointment.provider.name}.`,
            `Data e horário: ${summary.start} até ${summary.end} (${appointment.provider.timeZone}).`,
            `Duração: ${appointment.service.durationMinutes} minutos. Valor: ${summary.price}.`,
          ],
          {
            href: getCancellationUrl(appointment.cancelToken),
            label: "Cancelar agendamento",
          },
        ),
      };
    }),
    sendEmailSafely(() => {
      const summary = appointmentSummary(appointment);
      return {
        to: appointment.provider.email,
        subject: `Novo agendamento: ${appointment.service.name}`,
        html: renderEmail("Você recebeu um novo agendamento", [
          `Cliente: ${appointment.clientName}.`,
          `Contato: ${appointment.clientEmail} · ${appointment.clientPhone}.`,
          `Serviço: ${appointment.service.name}.`,
          `Data e horário: ${summary.start} até ${summary.end} (${appointment.provider.timeZone}).`,
        ]),
      };
    }),
  ]);
}

export async function sendCancellationEmails(
  appointment: AppointmentEmailData,
) {
  await Promise.all([
    sendEmailSafely(() => {
      const summary = appointmentSummary(appointment);
      const details = `Serviço: ${appointment.service.name}. Data e horário: ${summary.start} até ${summary.end} (${appointment.provider.timeZone}).`;
      return {
        to: appointment.clientEmail,
        subject: "Agendamento cancelado",
        html: renderEmail("Seu agendamento foi cancelado", [
          `Olá, ${appointment.clientName}. ${details}`,
          `Prestador: ${appointment.provider.name}.`,
        ]),
      };
    }),
    sendEmailSafely(() => {
      const summary = appointmentSummary(appointment);
      const details = `Serviço: ${appointment.service.name}. Data e horário: ${summary.start} até ${summary.end} (${appointment.provider.timeZone}).`;
      return {
        to: appointment.provider.email,
        subject: `Agendamento cancelado: ${appointment.service.name}`,
        html: renderEmail("Um agendamento foi cancelado", [
          `Cliente: ${appointment.clientName} (${appointment.clientEmail}).`,
          details,
        ]),
      };
    }),
  ]);
}

export async function sendRescheduleEmails(
  appointment: AppointmentEmailData,
  previousStartsAt: Date,
  previousEndsAt: Date,
) {
  await Promise.all([
    sendEmailSafely(() => {
      const previousStart = formatDateTime(
        previousStartsAt,
        appointment.provider.timeZone,
      );
      const previousEnd = formatDateTime(
        previousEndsAt,
        appointment.provider.timeZone,
      );
      const summary = appointmentSummary(appointment);
      return {
        to: appointment.clientEmail,
        subject: "Seu agendamento foi reagendado",
        html: renderEmail("Agendamento reagendado", [
          `Olá, ${appointment.clientName}! Seu horário com ${appointment.provider.name} foi alterado.`,
          `Horário anterior: ${previousStart} até ${previousEnd}.`,
          `Novo horário: ${summary.start} até ${summary.end}.`,
          `Serviço: ${appointment.service.name}.`,
        ]),
      };
    }),
    sendEmailSafely(() => {
      const previousStart = formatDateTime(
        previousStartsAt,
        appointment.provider.timeZone,
      );
      const previousEnd = formatDateTime(
        previousEndsAt,
        appointment.provider.timeZone,
      );
      const summary = appointmentSummary(appointment);
      return {
        to: appointment.provider.email,
        subject: `Agendamento reagendado: ${appointment.service.name}`,
        html: renderEmail("Um agendamento foi reagendado", [
          `Cliente: ${appointment.clientName} (${appointment.clientEmail}).`,
          `Horário anterior: ${previousStart} até ${previousEnd}.`,
          `Novo horário: ${summary.start} até ${summary.end}.`,
          `Serviço: ${appointment.service.name}.`,
        ]),
      };
    }),
  ]);
}

export async function sendAppointmentReminderEmail(
  appointment: AppointmentEmailData,
) {
  return sendEmailSafely(() => {
    const summary = appointmentSummary(appointment);
    return {
      to: appointment.clientEmail,
      subject: `Lembrete: ${appointment.service.name} amanhã`,
      html: renderEmail("Seu agendamento é amanhã", [
        `Olá, ${appointment.clientName}! Este é um lembrete do seu agendamento com ${appointment.provider.name}.`,
        `Serviço: ${appointment.service.name}.`,
        `Data e horário: ${summary.start} até ${summary.end} (${appointment.provider.timeZone}).`,
      ]),
    };
  });
}
