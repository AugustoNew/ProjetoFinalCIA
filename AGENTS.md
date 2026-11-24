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
