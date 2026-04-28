# Regras do Projeto — StorePage (Frontend)

## Contexto 
- **App**: StorePage — Frontend desacoplado da plataforma de Gestão de Conteúdo, LMS, Repositórios e Checklists.
- **Arquitetura**: Frontend Puro consumindo a API **StorePage_back**.
- **Stack**: React 19 (Vite), TypeScript, Tailwind CSS, Zustand, React Query/SWR (HTTP Client), React Hook Form + Zod.
- **Fase atual**: Desacoplamento de Backend e Migração para consumo de API externa.

## Regras de Estrutura — OBRIGATÓRIAS 
- **Componentes**: Ficam em `src/components/[domínio]/` (ex: `admin`, `user`, `ui`).
- **Camada de Integração**: Fica em `src/services/` (Clientes HTTP e funções de chamada à API).
- **Hooks Customizados**: Ficam em `src/hooks/` (Lógica de estado e consumo dos `services`).
- **Tipos TypeScript**: Ficam em `src/types/` (Interfaces e Enums globais).
- **Contextos**: Ficam em `src/contexts/`.
- **Restrição**: NUNCA criar arquivos fora dessas pastas sem perguntar.

## Regras de Código 
- **TypeScript**: Obrigatório. NUNCA usar `any`.
- **Camada de Dados (REGRA DE OURO)**: O Frontend NUNCA acessa o banco de dados, storage ou RPCs diretamente. Toda operação passa por `src/services/` via API.
- **Backlog & Planejamento**: Siga rigorosamente as fases do [BACKLOG_TECNICO_FASES.md](file:///c:/Users/israe/Downloads/StorePage/BACKLOG_TECNICO_FASES.md).
- **Validação**: SEMPRE validar inputs com **Zod** antes de enviar para o Backend.
- **Logging**: NUNCA usar `console.log`. SEMPRE usar o `Logger` customizado em `src/utils/logger.ts`.

## Regras de Segurança & Tenant 
- **Validação no Backend**: O Frontend não depende de RLS. Toda regra de acesso (tenant, role, ownership) é validada no **StorePage_back**.
- **Contexto**: O Frontend deve enviar apenas as informações necessárias para a API identificar a ação solicitada.
- **Autenticação**: Gerenciada via Backend/API.

## Referência Técnica (Banco de Dados)
- **Pasta `supabase/`**: Deve ser tratada apenas como referência legada do schema e migrations para auxiliar no desenvolvimento do backend. Nenhuma alteração ativa deve ser feita aqui para integração direta.

## Comportamento do Agente — INEGOCIÁVEIS
- **Linguagem**: Sempre responda em **Português - BR**. Comentários e código permanecem em Inglês.
- **Minimalismo**: Faça o **menor ajuste possível** para não retirar nada importante.
- **Transparência**: Antes de cada tarefa, apresente o plano e peça aprovação.
- **Foco no Frontend**: NUNCA sugerir soluções que envolvam queries diretas ao banco de dados ou uso do SDK do Supabase para persistência no client.
- **Definição de Pronto (DoD)**: Siga os critérios de qualidade (Backend, Segurança, Performance, Integração) definidos no Backlog para cada entrega.
- **Documentação**: Documente toda dívida técnica criada no `DIVIDA_TECNICA.md`.

