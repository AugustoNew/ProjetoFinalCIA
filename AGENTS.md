# AGENTS.md

## Objetivo

Agendaki é uma aplicação web de agendamento online para prestadores de serviço.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite em desenvolvimento
- PostgreSQL em produção
- ESLint e Prettier

## Convenções de código

- Escreva componentes e funções em TypeScript.
- Prefira componentes server-side por padrão; use `"use client"` apenas quando necessário.
- Use nomes em inglês para código e mantenha os textos da interface em português.
- Formate o código com Prettier e valide com ESLint.
- Use o alias `@/*` para imports internos.

## Estrutura de pastas

- `src/app`: rotas, layouts e páginas do App Router.
- `src/components`: componentes reutilizáveis da interface.
- `src/lib`: utilitários compartilhados.
- `src/server`: código exclusivo do servidor e integrações.
- `prisma`: schema e migrações do banco.

## Commits

Todo commit deve seguir Conventional Commits. Exemplos:

- `feat: adicionar agenda`
- `fix: corrigir conflito de horário`
- `docs: atualizar instruções`

## Datas e fusos horários

- Cada prestador possui um fuso IANA configurável em `User.timeZone`, com
  `America/Sao_Paulo` como padrão.
- Disponibilidades semanais são horários locais (`HH:mm`) interpretados no
  fuso do prestador, pois representam horários recorrentes no relógio local.
- Folgas, bloqueios, agendamentos e demais instantes são armazenados em UTC.
  Entradas locais devem ser convertidas usando o fuso do prestador antes de
  gravar; datas exibidas devem ser formatadas nesse mesmo fuso.
- Rejeite horários locais inexistentes ou ambíguos durante transições de horário
  de verão, em vez de escolher um instante silenciosamente.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
