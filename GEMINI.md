# GEMINI.md - StorePage Project Intelligence

> Este arquivo serve como a "Fonte da Verdade" para o Antigravity neste projeto. Ele contém a arquitetura, regras de negócio e stack tecnológica para garantir que todas as interações sejam precisas e alinhadas aos objetivos da **StorePage** (Frontend).

---

## 🏗️ VISÃO GERAL DO PROJETO
**StorePage** é a interface (Frontend) de uma plataforma multi-tenant modular projetada para gestão de conteúdo corporativo, treinamento (LMS), repositórios de arquivos e checklists operacionais.

O projeto opera de forma **desacoplada**, atuando exclusivamente como a camada de apresentação e experiência do usuário, consumindo recursos através da API do **StorePage_back**.

### Objetivos Principais
- Fornecer uma experiência de aprendizado fluida (LMS).
- Garantir conformidade operacional via Checklists.
- Centralizar documentos e ativos da empresa.
- Apresentar dados isolados rigorosamente entre diferentes clientes (Multi-tenancy).

---

## 🛠️ TECH STACK (2025/2026)

### Frontend (Pure Frontend Role)
- **Core**: React 19 (Vite) + TypeScript.
- **Estilização**: Tailwind CSS v3 + `tailwindcss-animate`.
- **UI/UX**: Shadcn UI (Radix UI) + Lucide React + Embla Carousel.
- **Estado Global**: Zustand.
- **Data Fetching/Cache**: TanStack Query (v5) + SWR.
- **Formulários**: React Hook Form + Zod (Validação).
- **Roteamento**: React Router Dom v6.

### Backend & Infra (Arquitetura de Comunicação)
- **Fluxo**: Frontend **StorePage** <-> API **StorePage_back** <-> Banco/Storage.
- **Integração**: O Frontend comunica-se **exclusivamente** com a API REST/GraphQL do backend.
- **Deploy**: Vercel.
- **Monitoramento**: Custom Logger (`src/utils/logger.ts`).

### Utilitários & Relatórios
- **Gráficos**: Recharts.
- **Documentos**: jsPDF, html2canvas, XLSX.
- **Datas**: date-fns.

---

## 📐 DESIGN SYSTEM & ESTÉTICA
- **Base**: Minimalista e Premium, baseado em Shadcn UI.
- **Responsividade**: Mobile-first (foco em usabilidade em dispositivos iPhone/Android).
- **Feedback Visual**: Uso intensivo de `sonner` para notificações e `framer-motion` (via tailwind-animate) para transições.
- **Tipografia**: Gerenciada via Tailwind (Inter/sans-serif padrão).

---

## 📂 ESTRUTURA DE ARQUIVOS (OBRIGATÓRIA)
| Diretório | Responsabilidade |
| :--- | :--- |
| `src/components/[domínio]/` | Componentes de UI divididos por domínio (`admin`, `user`, `ui`). |
| `src/services/` | Lógica de integração com a API (**StorePage_back**). |
| `src/hooks/` | Hooks customizados para lógica de estado e consumo da API. |
| `src/types/` | Definições de tipos TypeScript globais (Interfaces e Enums). |
| `src/contexts/` | Provedores de contexto React. |
| `src/pages/` | Rotas da aplicação (divididas por privilégio). |
| `supabase/` | **[LEGADO]** Referência técnica de schema/migrations para o backend. |

---

## 📅 PLANEJAMENTO DE DESACOPLAMENTO (BACKLOG)
O projeto segue uma migração incremental dividida em 6 fases principais, documentadas detalhadamente em:
👉 **[BACKLOG_TECNICO_FASES.md](file:///c:/Users/israe/Downloads/StorePage/BACKLOG_TECNICO_FASES.md)**

### Resumo das Fases:
- **Fase 0**: Fundação da Aplicação (HTTP, Erros, Logs, Middlewares).
- **Fase 1**: Autenticação, Tenant e Gestão de Usuários.
- **Fase 2**: Repositórios, Conteúdos e Métricas.
- **Fase 3**: LMS, Treinamento e Quizzes.
- **Fase 4**: Checklists, Submissões e Planos de Ação.
- **Fase 5**: Surveys (Pesquisas).
- **Fase 6**: Super Admin e Hardening Final.

---

---

## 📜 REGRAS DE NEGÓCIO & CÓDIGO (CRÍTICAS)

### 1. Arquitetura de Comunicação (REGRA DE OURO)
- **Desacoplamento Total**: O Frontend nunca acessa o banco de dados, storage ou RPCs do Supabase diretamente.
- **API First**: Todas as operações de dados e autenticação devem passar por endpoints de API no Backend.
- **Segurança**: O Backend (**StorePage_back**) é o único responsável por validar permissões, isolamento de tenant (`company_id`) e autorização.

### 2. Gestão de Dados
- **Soft Delete**: O frontend deve enviar requisições de deleção para a API, que gerencia o campo `deleted_at`.
- **Camada de Serviço**: Proibido chamadas de API diretas em componentes. Use `src/services`.
- **Validação**: Todas as entradas de dados devem ser validadas com **Zod** antes do envio para o Backend.

### 3. Padrões de Código
- **TypeScript**: Proibido usar `any`. Tipagem estrita em tudo.
- **Logging**: Proibido `console.log`. Use `Logger.info`, `Logger.error`, etc.
- **Minimalismo**: Ajustes pontuais são preferidos para evitar regressões.

## 🗺️ MAPA DE PÁGINAS

### Área Pública
- `LandingPage.tsx`: Portal de entrada institucional.
- `Login.tsx`: Autenticação integrada à API do Backend.

### Painel Administrativo (`/admin`)
- `Dashboard.tsx`: Visão geral de métricas consumidas da API.
- `Courses.tsx` & `CourseDetails.tsx`: Gestão de trilhas via endpoints de treinamento.
- `Checklists.tsx` & `ChecklistBuilder.tsx`: Motor de auditorias consumindo a API.
- `ChecklistDashboard.tsx`: Analytics de conformidade.
- `Repositories.tsx`: Interface para sistema de arquivos corporativo.
- `Users.tsx` & `Structure.tsx`: Gestão de usuários e hierarquia via API.
- `Appearance.tsx` & `Settings.tsx`: Customização White Label e configurações.

### Área do Superadmin (`/superadmin`)
- `Dashboard.tsx`: Gestão global de tenants e empresas.

### Área do Usuário (`/user`)
- `Home.tsx`: Dashboard com cursos e pendências.
- `CoursePlayer.tsx`: Interface de consumo de aulas.
- `ChecklistPlayer.tsx`: Execução de checklists em campo.
- `ActionPlans.tsx`: Tratamento de não-conformidades.
- `RepositoryDetail.tsx`: Central de arquivos.
- `Profile.tsx` & `Search.tsx`: Perfil e busca global.

---

---

## ⚠️ DÍVIDA TÉCNICA RECORRENTE
- Substituir instâncias remanescentes do cliente Supabase por chamadas à API.
- Migrar lógica de autenticação para o novo fluxo do Backend.
- Expandir cobertura de Zod em todas as mutações administrativas.

---

> **Nota para o Agente**: Ao atuar, sempre verifique o arquivo `REGRAS_AGENTE.md` para o contexto mais atualizado de tarefas em andamento. O frontend é agora agnóstico à infraestrutura de banco de dados.
