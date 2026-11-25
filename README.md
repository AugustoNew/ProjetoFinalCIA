# Agendaki

Agendaki é uma aplicação web de agendamento online para prestadores de serviço. Clientes consultam serviços e horários disponíveis e fazem reservas sem precisar criar uma conta; prestadores administram serviços, agenda e regras de cancelamento em um painel.

## Funcionalidades

- Cadastro e autenticação de prestadores, com senhas protegidas por bcrypt.
- Página pública por slug, catálogo de serviços e fluxo de reserva.
- Painel para gerenciar serviços, disponibilidade semanal, folgas e agendamentos.
- Cancelamento e reagendamento pelo link privado enviado ao cliente.
- Política de antecedência mínima configurável para cancelamentos e reagendamentos.
- Emails de confirmação, avisos ao prestador e lembretes próximos de 24 horas antes da reserva.
- Preços armazenados em centavos e horários recorrentes interpretados no fuso IANA do prestador.

## Screenshots

Capturas a adicionar antes da divulgação pública:

| Tela | Placeholder |
| --- | --- |
| Página pública e seleção de serviço | `docs/screenshots/public-booking.png` |
| Seleção de horário e confirmação | `docs/screenshots/booking-confirmation.png` |
| Painel e agenda do prestador | `docs/screenshots/provider-dashboard.png` |

## Stack

- Next.js 16 (App Router), React 19 e TypeScript.
- Tailwind CSS 4.
- Prisma ORM 6 e PostgreSQL 17+.
- NextAuth, bcryptjs e Zod.
- Vitest e Playwright.
- Vercel para aplicação e cron; Neon ou Supabase para PostgreSQL.
- Resend para emails transacionais.

## Como rodar

Pré-requisitos: Node.js 20+, npm e Docker Desktop (ou outro PostgreSQL 17+).

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d db

npx prisma generate
npm run db:migrate
npm run db:seed
npm run dev
```

A aplicação estará em `http://localhost:3000`. O seed é opcional e cria dados demonstrativos; a conta de exemplo é `prestador@agendaki.dev` com senha `agendaki-demo`. Use esses dados somente em bancos locais descartáveis.

O Compose cria também um banco separado `agendaki_e2e`. A suíte E2E apaga e recria esse banco antes de executar; nunca aponte `E2E_DATABASE_URL` para uma base com dados que deseja manter.

```powershell
npm run lint
npm run typecheck
npm run test
npx playwright install chromium
npm run test:e2e
npm run build
```

Para encerrar o PostgreSQL local: `docker compose down`. `docker compose down -v` também apaga permanentemente o volume local.

## Variáveis de ambiente

Copie `.env.example` para `.env` no desenvolvimento. O Compose usa credenciais locais de demonstração; substitua-as se expuser o serviço a outras máquinas.

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão usada pela aplicação. Em produção, use a URL pooled do provedor quando disponível. |
| `DIRECT_URL` | Conexão direta usada pelo Prisma CLI para migrations. Localmente, pode ser igual a `DATABASE_URL`. |
| `AUTH_SECRET` | Segredo aleatório forte para sessões de autenticação. |
| `AUTH_URL` | URL base da aplicação usada pela autenticação, por exemplo `https://agendaki.example.com`. |
| `APP_URL` | URL pública usada nos links dos emails e cancelamentos. |
| `CRON_SECRET` | Segredo com pelo menos 32 caracteres para autorizar o endpoint de lembretes. |
| `RESEND_API_KEY` | Chave do Resend; deixe vazia em desenvolvimento para registrar emails no console. |
| `EMAIL_FROM` | Remetente verificado no Resend, por exemplo `Agendaki <agenda@seudominio.com>`. |
| `E2E_DATABASE_URL` | Banco isolado que os testes E2E recriam; por padrão aponta para `agendaki_e2e` local. |

Gere segredos com um gerador criptograficamente seguro. Nunca versione `.env` nem reutilize credenciais demonstrativas em produção.

## Deploy na Vercel

1. Crie um projeto PostgreSQL no Neon ou Supabase e configure as variáveis de conexão. Use a URL pooled em `DATABASE_URL` para o tráfego da aplicação e a URL direta em `DIRECT_URL` para migrations. Para Neon, prefira a URL pooled fornecida pelo painel para a aplicação.
2. Importe o repositório na Vercel e configure `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_URL`, `APP_URL`, `CRON_SECRET`, `RESEND_API_KEY` e `EMAIL_FROM` nos ambientes necessários. `AUTH_URL` e `APP_URL` devem usar o domínio HTTPS publicado.
3. Antes de liberar tráfego, aplique as migrations uma vez contra a base de produção: `npm run db:deploy`. Não use `prisma migrate dev` nem `prisma migrate reset` em produção.
4. Faça o deploy. O `vercel.json` agenda `GET /api/cron/appointment-reminders` a cada 15 minutos. A Vercel envia `CRON_SECRET` como bearer token quando essa variável está configurada. Confirme que o plano Vercel permite essa frequência e monitore os logs da função.
5. Configure e verifique o domínio de envio no Resend. Faça uma reserva de teste e confirme os emails, o cancelamento e a execução do cron antes do lançamento.

O endpoint envia lembretes para reservas pendentes ou confirmadas entre 23h30 e 24h antes do início. Ele limita cada lote a 100 reservas e usa uma reivindicação temporária no banco para reduzir envios duplicados em execuções concorrentes. Falhas de email são registradas e podem ser tentadas novamente pelo cron seguinte.

## Checklist de produção

- [ ] `DATABASE_URL` aponta para o PostgreSQL de produção usando a conexão pooled do provedor quando disponível.
- [ ] `DIRECT_URL` aponta diretamente para o mesmo banco e é usada para migrations.
- [ ] `AUTH_SECRET` é único e forte; `AUTH_URL` e `APP_URL` apontam para o domínio HTTPS definitivo.
- [ ] `CRON_SECRET` tem pelo menos 32 caracteres e está configurado no ambiente Vercel.
- [ ] `RESEND_API_KEY` e `EMAIL_FROM` estão configurados; o domínio remetente foi verificado.
- [ ] Backup e acesso ao banco foram confirmados antes de executar `npm run db:deploy`.
- [ ] A migration foi aplicada com `npm run db:deploy`; nenhum `migrate reset` foi executado em produção.
- [ ] O cron está ativo no plano Vercel escolhido e seus logs foram verificados.
- [ ] Reserva, cancelamento e envio de email foram testados em produção com dados controlados.
- [ ] O seed foi omitido. Só execute `npm run db:seed` em ambiente descartável: ele cria uma conta demo com senha conhecida.

As migrations PostgreSQL atuais inicializam uma base nova e não transferem registros do banco SQLite anterior. Se houver dados SQLite a preservar, faça e valide uma exportação/importação planejada antes de apontar tráfego para a nova base.

## Decisões de arquitetura

- PostgreSQL é o banco de desenvolvimento, CI e produção; migrations versionadas definem o schema. `DIRECT_URL` separa operações administrativas da conexão pooled em produção.
- O Prisma é instanciado como singleton em desenvolvimento. Acesso a dados e validações de operações sensíveis ficam no servidor.
- Disponibilidades semanais são horários locais no fuso IANA do prestador. Folgas e agendamentos são instantes; conversões e exibição respeitam esse fuso e horários locais ambíguos ou inexistentes são rejeitados.
- Valores monetários são inteiros em centavos para evitar imprecisão de ponto flutuante.
- Links de cancelamento e reagendamento usam tokens privados; as regras e disponibilidade são revalidadas no servidor.
- O seed contém dados previsíveis apenas para desenvolvimento e demonstração, não para inicialização da produção.

## Construção com IA

O projeto foi construído com apoio de ferramentas de IA generativa para explorar alternativas, implementar partes da aplicação, revisar documentação e apoiar a criação de testes. As decisões de produto e arquitetura, revisão do código, execução dos testes e validação antes de qualquer deploy são responsabilidade dos mantenedores. Sugestões geradas por IA não substituem revisão humana, especialmente em autenticação, dados pessoais, agendamentos, fusos horários e operações de banco.

## Contribuição e licença

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para reportar problemas e propor mudanças. O projeto está sob a licença MIT; consulte [LICENSE](LICENSE).
