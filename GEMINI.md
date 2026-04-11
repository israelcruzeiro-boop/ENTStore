# GEMINI.md - StorePage Project Intelligence

> Este arquivo serve como a "Fonte da Verdade" para o Antigravity neste projeto. Ele contém a arquitetura, regras de negócio e stack tecnológica para garantir que todas as interações sejam precisas e alinhadas aos objetivos da **StorePage**.

---

## 🏗️ VISÃO GERAL DO PROJETO
**StorePage** é uma plataforma multi-tenant modular projetada para gestão de conteúdo corporativo, treinamento (LMS), repositórios de arquivos e checklists operacionais.

### Objetivos Principais
- Fornecer uma experiência de aprendizado fluida (LMS).
- Garantir conformidade operacional via Checklists.
- Centralizar documentos e ativos da empresa.
- Isolar dados rigorosamente entre diferentes clientes (Multi-tenancy).

---

## 🛠️ TECH STACK (2025/2026)

### Frontend
- **Core**: React 19 (Vite) + TypeScript.
- **Estilização**: Tailwind CSS v3 + `tailwindcss-animate`.
- **UI/UX**: Shadcn UI (Radix UI) + Lucide React + Embla Carousel.
- **Estado Global**: Zustand.
- **Data Fetching/Cache**: TanStack Query (v5) + SWR.
- **Formulários**: React Hook Form + Zod (Validação).
- **Roteamento**: React Router Dom v6.

### Backend & Infra
- **BaaS**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
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
| `src/services/` | Lógica de banco/API (Clientes Supabase e funções de busca). |
| `src/hooks/` | Hooks customizados para lógica de estado e fetch de dados. |
| `src/types/` | Definições de tipos TypeScript globais (Interfaces e Enums). |
| `src/contexts/` | Provedores de contexto React. |
| `src/pages/` | Rotas da aplicação (divididas por privilégio). |
| `supabase/` | Migrations SQL e Edge Functions. |

---

## 📜 REGRAS DE NEGÓCIO & CÓDIGO (CRÍTICAS)

### 1. Segurança & Multi-tenancy
- **RLS (Row Level Security)**: Obrigatório no Supabase. Todos os dados devem ser filtrados por `company_id`.
- **Validação**: NUNCA persistir dados sem validar com **Zod**.

### 2. Gestão de Dados
- **Soft Delete**: NUNCA deletar registros fisicamente. Usar o campo `deleted_at`.
- **Queries**: NUNCA fazer fetch de banco direto em componentes de UI. Use os Services ou Hooks.

### 3. Padrões de Código
- **TypeScript**: Proibido usar `any`. Tipagem estrita em tudo.
- **Logging**: Proibido `console.log`. Use `Logger.info`, `Logger.error`, etc.
- **Minimalismo**: Ajustes pontuais são preferidos para evitar regressões.

## 🗺️ MAPA DE PÁGINAS

### Área Pública
- `LandingPage.tsx`: Portal de entrada institucional.
- `Login.tsx`: Autenticação integrada ao Supabase.

### Painel Administrativo (`/admin`)
- `Dashboard.tsx`: Visão geral de métricas.
- `Courses.tsx` & `CourseDetails.tsx`: Gestão de trilhas, aulas e materiais.
- `Checklists.tsx` & `ChecklistBuilder.tsx`: Motor de auditorias e vistorias.
- `ChecklistDashboard.tsx`: Analytics de conformidade operacional.
- `Repositories.tsx`: Sistema de arquivos corporativo.
- `Users.tsx` & `Structure.tsx`: Gestão de usuários e hierarquia (Unidades/Cargos).
- `Appearance.tsx` & `Settings.tsx`: Customização White Label e configurações gerais.

### Área do Superadmin (`/superadmin`)
- `Dashboard.tsx`: Gestão global de tenants e empresas.

### Área do Usuário (`/user`)
- `Home.tsx`: Dashboard com cursos e pendências.
- `CoursePlayer.tsx`: Interface de consumo de aulas e testes de conhecimento.
- `ChecklistPlayer.tsx`: Execução de checklists em campo.
- `ActionPlans.tsx`: Tratamento de não-conformidades.
- `RepositoryDetail.tsx`: Central de arquivos.
- `Profile.tsx` & `Search.tsx`: Perfil e busca global.

---

---

## ⚠️ DÍVIDA TÉCNICA RECORRENTE
- Migrar lógica de queries inline para a camada de `services`.
- Expandir cobertura de Zod em todas as mutações administrativas.
- Hardening de segurança pós-audit (detalhado em `REVISAO_SEGURANCA.md`).

---

> **Nota para o Agente**: Ao atuar, sempre verifique o arquivo `REGRAS_AGENTE.md` e `DIVIDA_TECNICA.md` para o contexto mais atualizado de tarefas em andamento.
