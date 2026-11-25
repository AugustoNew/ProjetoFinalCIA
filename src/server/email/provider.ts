export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.info("[email:development]", message);
  }
}

class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...message, from: this.from }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `Resend rejected an email (${response.status}): ${responseBody}`,
      );
    }
  }
}

export function createEmailProvider(): EmailProvider {
  if (process.env.NODE_ENV !== "production") {
    return new ConsoleEmailProvider();
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "RESEND_API_KEY and EMAIL_FROM are required to send production emails.",
    );
  }

  return new ResendEmailProvider(apiKey, from);
}

export async function sendEmailSafely(
  createMessage: () => EmailMessage,
  provider?: EmailProvider,
) {
  try {
    const message = createMessage();
    await (provider ?? createEmailProvider()).send(message);
    return true;
  } catch (error) {
    console.error("[email] Failed to send transactional email.", error);
    return false;
  }
}
