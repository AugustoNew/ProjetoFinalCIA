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
npx prisma generate
```

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
