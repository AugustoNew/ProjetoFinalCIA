# Como contribuir

Obrigado por ajudar no Agendaki. Antes de abrir uma mudança, procure issues existentes e descreva o problema ou a proposta com passos reproduzíveis.

## Desenvolvimento

1. Abra uma issue para mudanças relevantes e aguarde alinhamento quando houver impacto de produto ou arquitetura.
2. Crie uma branch a partir da versão atual e mantenha a alteração focada.
3. Instale dependências com `npm ci`, configure `.env` usando `.env.example` e inicie o PostgreSQL local com `docker compose up -d db`.
4. Para alterações de schema, edite `prisma/schema.prisma` e gere uma migration com `npm run db:migrate -- --name descricao_curta`. Não edite migrations já aplicadas.
5. Atualize ou adicione testes relevantes. Antes de abrir o PR, rode `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e` e `npm run build` conforme o escopo.

Os testes E2E recriam o banco definido por `E2E_DATABASE_URL`. Use uma base descartável separada da sua base de desenvolvimento.

## Pull requests

- Explique contexto, comportamento alterado e como validou a mudança.
- Inclua capturas de tela para mudanças visuais e atualize a documentação quando necessário.
- Não inclua segredos, dados pessoais reais ou alterações geradas não relacionadas.
- Use Conventional Commits, por exemplo `feat: adicionar bloqueio de horários` ou `fix: corrigir lembrete duplicado`.

Issues de bug e solicitações de funcionalidade usam os formulários em `.github/ISSUE_TEMPLATE/`.