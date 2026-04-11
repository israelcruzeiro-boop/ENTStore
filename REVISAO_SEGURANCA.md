# Relatório de Revisão de Segurança — StorePage

Este documento detalha os achados da auditoria de segurança realizada com base nos critérios inegociáveis do projeto.

---

## 🛡️ Resumo da Auditoria

| Item | Status | Prioridade |
| :--- | :--- | :--- |
| **1. Validação com Zod** | ⚠️ Parcial (Checklists/Cursos) | **Alta** |
| **2. Filtragem de Dados** | ⚠️ Melhorado (ainda há `select *`) | **Crítica** |
| **3. Rotas Protegidas** | ✅ Implementado Corretamente | **Baixa** |
| **4. Variáveis de Ambiente** | ✅ Seguras no Client | **Baixa** |
| **5. Sanitização SQL** | ✅ Protegido via Supabase Client | **Média** |
| **6. Tratamento de Erros** | ⚠️ Migrando para Logger.ts | **Média** |

---

## 🔍 Detalhamento dos Problemas (Atualizado)

### 1. Validação de Input (Zod) - STATUS: EM PROGRESSO
- **Auditado**: Mutations principais como `saveAnswer`, `createChecklist` e `updateSupabaseUser` já possuem validação rigorosa.
- **Pendente**: Funções de **reordenação** (`reorderQuestions`, `reorderSections`) e finalização (`completeSubmission`) ainda não possuem validação de payload no frontend.
- **Arquivos**: [useChecklists.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useChecklists.ts).
- **Prioridade**: **ALTA**

### 2. Superexposição de Dados (`select *`) - STATUS: EM PROGRESSO
- **Auditado**: A maioria dos hooks foi migrada para selects explícitos.
- **Pendente**: O hook `useAllCompanyQuestions` usado no Dashboard Administrativo ainda utiliza `select('*')`.
- **Arquivos**: [useChecklists.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useChecklists.ts) (L100).
- **Prioridade**: **CRÍTICA** (Exposição de metadados internos das perguntas).

### 3. Tratamento de Erros e Logs - STATUS: EM PROGRESSO
- **Auditado**: Nova estrutura de `Logger` criada.
- **Pendente**: Substituição de `console.error` em componentes de UI e no `AuthContext`.
- **Prioridade**: **MÉDIA**

### 4. Chamadas RPC sem Controle de Segurança Visível
- **Descrição**: O uso de `supabase.rpc('increment_user_stats', ...)` e `supabase.rpc('get_provisioned_user', ...)` depende inteiramente da segurança definida no banco (Definer vs Invoker).
- **Impacto**: Se essas funções no Postgres não tiverem verificações de permissão internas (ID do usuário logado), podem ser abusadas via console do navegador por qualquer usuário autenticado.
- **Arquivos**: [useSupabaseData.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useSupabaseData.ts), [AuthContext.tsx](file:///c:/Users/israe/Downloads/StorePage/src/contexts/AuthContext.tsx).
- **Correção sugerida**: Revisar o código SQL das funções RPC para garantir que validam o `auth.uid()`.
- **Prioridade**: **MÉDIA**

---

## ✅ Pontos Fortes Identificados
- **Proteção de Rotas**: O componente `RequireAuth` é extremamente completo, validando não apenas a sessão e o papel (Role), mas também o isolamento de Tenant (Company Slug), impedindo que um usuário de uma empresa acesse o painel de outra.
- **Autenticação**: O fluxo de `AuthContext` trata deadlocks de sessão e implementa uma lógica resiliente para usuários provisionados.
- **Variáveis de Ambiente**: Nenhuma chave privada (Service Role) foi encontrada exposta no código client; apenas a Anon Key e URL, que são públicas por design.
