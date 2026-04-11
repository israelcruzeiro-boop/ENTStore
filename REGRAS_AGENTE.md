# Regras do Projeto — StorePage

## Contexto 
- **App**: StorePage — Plataforma Multi-tenant de Gestão de Conteúdo, LMS (Cursos), Repositórios de Arquivos e Checklists Operacionais.
- **Stack**: React 19 (Vite), TypeScript, Supabase (Backend/Auth/DB), Tailwind CSS (Styling), React Router (Navigation), Zustand (State), React Query/SWR (Cache).
- **Fase atual**: Hardening de Segurança e Implementação de Soft Delete.

## Regras de Estrutura — OBRIGATÓRIAS 
- **Componentes**: Ficam em `src/components/[domínio]/` (ex: `admin`, `user`, `ui`).
- **Lógica de Banco/API**: Ficam em `src/services/` (Clientes Supabase e funções de busca direta). **Dívida**: Migrar lógica de componentes para services conforme refatoramos.
- **Tipos TypeScript**: Ficam em `src/types/` (Interfaces e Enums globais).
- **Hooks Customizados**: Ficam em `src/hooks/` (Lógica de estado local e fetch de dados).
- **Contextos**: Ficam em `src/contexts/`.
- **Restrição**: NUNCA criar arquivos fora dessas pastas sem perguntar.

## Regras de Código 
- **TypeScript**: Obrigatório. NUNCA usar `any`.
- **Camada de Dados**: NUNCA fazer query de banco direto nas rotas/componentes de UI. Use os hooks em `src/hooks/` ou funções em `src/services/`.
- **Validação**: SEMPRE validar inputs com **Zod** antes de realizar qualquer persistência (insert/update).
- **Logging**: NUNCA usar `console.log`. SEMPRE usar o `Logger` customizado em `src/utils/logger.ts`.

## Regras de Banco de Dados 
- **Soft Delete**: NUNCA deletar registros fisicamente. SEMPRE usar exclusão lógica através do campo `deleted_at`.
- **Schema**: SEMPRE criar uma migration SQL ao alterar o esquema do banco.
- **Produção**: NUNCA usar `prisma db push` ou similares que mutem o banco sem migration controlada em produção.

## Comportamento do Agente — INEGOCIÁVEIS
- **Linguagem**: Sempre responda em **Português - BR**. Comentários e código permanecem em Inglês.
- **Minimalismo**: Faça o **menor ajuste possível** para não retirar nada importante.
- **Transparência**: Antes de cada tarefa, apresente o plano e peça aprovação.
- **Controle de Banco de Dados**: NUNCA execute mutações ou alterações de schema no banco de dados sem aviso prévio e sem fornecer o código SQL exato para execução manual pelo usuário nos bancos de dev e prod.
- **Documentação**: Documente toda dívida técnica criada no `DIVIDA_TECNICA.md`.
- **Segurança**: Antes de salvar, verifique se os inputs estão sanitizados e se o RLS está sendo respeitado via isolamento de `company_id`.
