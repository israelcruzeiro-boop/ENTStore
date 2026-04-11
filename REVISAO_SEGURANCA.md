# Relatório de Revisão de Segurança — StorePage

Este documento detalha os achados da auditoria de segurança realizada com base nos critérios inegociáveis do projeto.

---

## 🛡️ Resumo da Auditoria

| Item | Status | Prioridade |
| :--- | :--- | :--- |
| **1. Validação com Zod** | ❌ Ausente em Mutations | **Alta** |
| **2. Filtragem de Dados** | ⚠️ Deficiente (`select *`) | **Crítica** |
| **3. Rotas Protegidas** | ✅ Implementado Corretamente | **Baixa** |
| **4. Variáveis de Ambiente** | ✅ Seguras no Client | **Baixa** |
| **5. Sanitização SQL** | ✅ Protegido via Supabase Client | **Média** |
| **6. Tratamento de Erros** | ⚠️ Vazamento via Console | **Média** |

---

## 🔍 Detalhamento dos Problemas

### 1. Ausência de Validação de Input (Zod)
- **Descrição**: Funções que alteram o estado do banco (ex: `addContentView`, `rateContent`, `saveAnswer`, `createFolder`) aceitam objetos diretamente sem validação de esquema.
- **Impacto**: Permite que dados malformados, tipos incorretos ou campos inesperados cheguem ao banco de dados ou causem erros de execução. Também viola a nova regra do `REGRAS_AGENTE.md`.
- **Arquivos**: [useSupabaseData.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useSupabaseData.ts), [useChecklists.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useChecklists.ts).
- **Correção sugerida**: Implementar esquemas Zod em `src/types/schemas.ts` e validar todos os payloads antes de chamar o `supabase.insert()` ou `.update()`.
- **Prioridade**: **ALTA**

### 2. Superexposição de Dados (`select *`)
- **Descrição**: A maioria das queries de busca utiliza o seletor universal `*`. 
- **Impacto**: Se as tabelas `users` ou `companies` possuírem campos sensíveis (notas internas, flags de sistema, etc.), esses dados são enviados para o frontend desnecessariamente. 
- **Arquivos**: [useSupabaseData.ts](file:///c:/Users/israe/Downloads/StorePage/src/hooks/useSupabaseData.ts) (hooks `useUsers`, `useCompanies`, `useOrgStructure`).
- **Correção sugerida**: Substituir `select('*')` por uma lista explícita de campos necessários para a UI, seguindo o exemplo de `usePublicCompanyBySlug`.
- **Prioridade**: **CRÍTICA** (Dependendo do conteúdo das colunas no banco).

### 3. Vazamento de Detalhes Técnicos em Erros
- **Descrição**: O uso sistemático de `console.error` despeja objetos de erro completos do Supabase (que podem conter nomes de tabelas, colunas e mensagens do Postgres) no console do navegador.
- **Impacto**: Fornece informações valiosas para um atacante sobre a estrutura interna do banco e esquema.
- **Arquivos**: [AuthContext.tsx](file:///c:/Users/israe/Downloads/StorePage/src/contexts/AuthContext.tsx), [supabaseClient.ts](file:///c:/Users/israe/Downloads/StorePage/src/lib/supabaseClient.ts), e ganchos gerais.
- **Correção sugerida**: Migrar todos os logs para o novo utilitário [logger.ts](file:///c:/Users/israe/Downloads/StorePage/src/utils/logger.ts), garantindo que logs detalhados sejam omitidos em produção.
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
