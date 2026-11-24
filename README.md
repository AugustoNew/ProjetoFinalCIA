# Agendaki

Aplicação web de agendamento online para prestadores de serviço.

## Tecnologias

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma
- SQLite em desenvolvimento
- PostgreSQL preparado para produção

## Instalação

Pré-requisitos: Node.js 20 ou superior e npm.

```bash
npm install
copy .env.example .env
npm run db:migrate -- --name init
npm run db:seed
npx prisma generate
```

Defina `AUTH_SECRET` no `.env` com um valor aleatório (por exemplo,
`npx auth secret`). O `.env.example` também inclui `AUTH_URL` para o ambiente
local.

No PowerShell, use `Copy-Item .env.example .env` caso `copy` não esteja disponível.

## Desenvolvimento

```bash
npm run dev
```

Acesse `http://localhost:3000`.

## Comandos

```bash
npm run dev
npm run build
npm run lint
npm run format
npm run test
npx prisma studio
```

## Modelo de dados

```mermaid
erDiagram
  User ||--o{ Service : oferece
  User ||--o{ Availability : define
  User ||--o{ TimeOff : bloqueia
  User ||--o{ Appointment : recebe
  Service ||--o{ Appointment : agenda
```

`User` tem papel de prestador ou cliente. Serviços, disponibilidades e folgas
pertencem ao prestador; cada agendamento referencia um serviço e um prestador,
além de guardar os dados de contato do cliente. Os agendamentos têm status e
token de cancelamento único. Preços são armazenados como `Decimal`.
`Availability.dayOfWeek` usa `0` para domingo e `6` para sábado.

Para recriar o banco local, execute `npm run db:migrate -- --name init`. O seed
é idempotente e cria o prestador `prestador@agendaki.dev`, três serviços,
disponibilidade de segunda a sexta-feira, das 9h às 18h, e dois agendamentos
futuros de exemplo. A senha demonstrativa usada no seed é `agendaki-demo`.

## Autenticação

Prestadores podem criar conta em `/cadastro` e entrar em `/login`. Senhas são
armazenadas com bcrypt; as rotas em `/painel` exigem uma sessão autenticada.
No Next.js 16, `src/proxy.ts` (renomeação do middleware) redireciona usuários
não autenticados ao login e impede que usuários autenticados acessem `/login`.
