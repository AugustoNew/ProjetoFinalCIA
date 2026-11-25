import { expect, test } from "@playwright/test";

const weekdays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function getFutureDateInSaoPaulo(daysAhead: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

test("prestador configura serviço e horário e cliente agenda", async ({
  browser,
  page,
}) => {
  const unique = Date.now();
  const providerName = "Prestador E2E";
  const serviceName = `Consulta E2E ${unique}`;
  const slug = `e2e-${unique}`;
  const email = `prestador-${unique}@example.test`;
  const bookingDate = getFutureDateInSaoPaulo(7);
  const weekday =
    weekdays[new Date(`${bookingDate}T00:00:00.000Z`).getUTCDay()];

  const registrationResponse = await page.goto("/cadastro");
  expect(registrationResponse?.headers()["x-content-type-options"]).toBe(
    "nosniff",
  );
  expect(registrationResponse?.headers()["x-frame-options"]).toBe("DENY");
  expect(registrationResponse?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  await page.keyboard.press("Tab");
  const brandLink = page.getByRole("link", { name: "Agendaki" });
  await expect(brandLink).toBeFocused();
  await expect(brandLink).toHaveCSS("outline-style", "solid");
  await page.getByLabel("Nome", { exact: true }).fill(providerName);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("SenhaSegura123!");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page).toHaveURL(/\/painel$/);
  await expect(
    page.getByRole("heading", { name: `Bem-vindo(a), ${providerName}!` }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Serviços", exact: true }).click();
  await page.getByRole("button", { name: "Novo serviço" }).click();
  await page.locator("#service-name").fill(serviceName);
  await page.getByLabel("Descrição").fill("Serviço criado pelo teste E2E.");
  await page.getByLabel("Duração (minutos)").fill("60");
  await page.getByLabel("Preço (R$)").fill("75,00");
  await page.getByRole("button", { name: "Criar serviço" }).click();
  await expect(page.getByText(serviceName, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Horários", exact: true }).click();
  const weekdayCheckbox = page.getByRole("checkbox", {
    name: weekday,
    exact: true,
  });
  if (!(await weekdayCheckbox.isChecked())) {
    await weekdayCheckbox.check();
  }
  const weekdayInputName = weekday.toLowerCase();
  await page.getByLabel(`Início, ${weekdayInputName}`).fill("09:00");
  await page.getByLabel(`Fim, ${weekdayInputName}`).fill("18:00");
  await page.getByRole("button", { name: "Salvar disponibilidade" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Disponibilidade semanal salva.",
  );

  await page.goto("/painel");
  await page.getByLabel("Endereço público").fill(slug);
  await page.getByRole("button", { name: "Salvar endereço" }).click();
  await expect(page.getByRole("status")).toContainText("atualizado");

  const clientContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const clientPage = await clientContext.newPage();
  try {
    await clientPage.goto(`/p/${slug}`);
    await clientPage
      .getByRole("button", { name: new RegExp(serviceName) })
      .click();
    await expect(
      clientPage.getByRole("heading", { name: "Data e horário" }),
    ).toBeVisible();
    await clientPage.getByRole("textbox", { name: "Data" }).fill(bookingDate);

    const availableTimes = clientPage.getByRole("group", {
      name: "Horários disponíveis",
    });
    const firstAvailableTime = availableTimes.getByRole("button").first();
    await expect(firstAvailableTime).toBeVisible({ timeout: 15_000 });
    await firstAvailableTime.click();
    await clientPage.getByRole("button", { name: "Continuar" }).click();

    await clientPage.getByLabel("Nome completo").fill("Cliente E2E");
    await clientPage
      .getByLabel("E-mail", { exact: true })
      .fill(`cliente-${unique}@example.test`);
    await clientPage.getByLabel("Telefone").fill("11987654321");
    await clientPage
      .getByRole("button", { name: "Revisar agendamento" })
      .click();
    await expect(
      clientPage.getByRole("heading", { name: "Confirmação" }),
    ).toBeVisible();
    await clientPage
      .getByRole("button", { name: "Confirmar agendamento" })
      .click();
    await clientPage.waitForURL(new RegExp(`/p/${slug}/sucesso\\?token=`));
  } finally {
    await clientContext.close();
  }

  await page.goto(`/painel/agenda?date=${bookingDate}&view=day&status=PENDING`);
  const appointmentSummary = page
    .locator("summary")
    .filter({ hasText: "Cliente E2E" });
  await expect(appointmentSummary).toContainText(serviceName);
});

test("exibe uma página 404 para endereços desconhecidos", async ({ page }) => {
  const response = await page.goto("/rota-inexistente-e2e");

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
});
