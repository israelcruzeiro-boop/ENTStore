# 📊 Inventário de Consultas ao Banco de Dados (StorePage)

Este documento mapeia todas as interações diretas do frontend com o banco de dados (via Supabase Client). Este inventário serve como especificação técnica para a criação dos endpoints no `StorePage_back`.

---

## 🔐 1. Módulo: Autenticação & Perfil
Responsável pelo login, validação de sessão e dados básicos do usuário/empresa.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AuthContext.tsx` | `users`, `companies` | SELECT | User Profile, Tenant Data | Público/Auth | `lib/supabaseClient` |
| `Login.tsx` | `companies` | SELECT | ID, Slug, Active Status | Público | `AuthContext` |
| `useSupabaseData.ts` | `users` | UPDATE | Avatar, Name, Settings | Usuário Auth | `AuthContext` |
| `AuthContext.tsx` | RPC: `get_user_by_email` | CALL ★ | User Identity | Público | `Login.tsx` |

---

## 👥 2. Módulo: Gestão de Usuários & Estrutura
Gerenciamento de colaboradores, níveis hierárquicos e unidades de negócio.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Admin/Users.tsx` | `users`, `provisioned_invites` | SELECT | Listagem de usuários | Admin | `useUsers` |
| `Admin/Users.tsx` | `users` | UPDATE/DELETE | Soft Delete (deleted_at) | Admin | `useUsers` |
| `Admin/Users.tsx` | RPC: `provision_invite` | CALL ★ | Nome, Email, Role, Company | Admin | `supabaseClient` |
| `Admin/Structure.tsx` | `org_top_levels`, `org_units` | SELECT | Árvore Org | Admin | `useOrgStructure` |
| `Admin/Structure.tsx` | `org_top_levels`, `org_units` | INSERT/UPDATE/DELETE | Nodes da Estrutura | Admin | `useOrgStructure` |

---

## 📚 3. Módulo: Treinamento (LMS)
Motor de cursos, módulos, conteúdos e progresso do aluno.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `courseService.ts` | `courses` | SELECT | Lista de Cursos | Auth/Admin | `useCourses` |
| `courseService.ts` | `course_modules` | SELECT/INSERT/UPDATE | Módulos da trilha | Admin | `CourseDetails.tsx` |
| `courseService.ts` | `course_contents` | SELECT/INSERT/UPDATE | Vídeos, PDFs, Quizzes | Admin | `CourseDetails.tsx` |
| `courseService.ts` | `course_enrollments` | INSERT/UPDATE | Status, Progresso, Score | Usuário Auth | `CoursePlayer.tsx` |
| `courseService.ts` | `course_answers` | INSERT/UPSERT | Respostas de Quizzes | Usuário Auth | `CoursePlayer.tsx` |
| `useSupabaseData.ts` | RPC: `increment_user_stats` | CALL | XP, Moedas (Gamificação) | Usuário Auth | `CoursePlayer.tsx` |

---

## ✅ 4. Módulo: Checklists & Auditoria
Motor de conformidade, preenchimento de formulários e relatórios.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `checklistActions.ts` | `checklists` | SELECT/INSERT/UPDATE | Definição de Checklist | Admin | `Checklists.tsx` |
| `checklistActions.ts" | `checklist_items` | SELECT/INSERT/UPDATE | Perguntas e Seções | Admin | `ChecklistBuilder.tsx` |
| `checklistActions.ts" | `checklist_submissions` | INSERT | Dados da execução | Usuário Auth | `ChecklistPlayer.tsx` |
| `checklistActions.ts" | `checklist_photos` | INSERT | URLs de evidências | Usuário Auth | `ChecklistPlayer.tsx` |
| `useSupabaseData.ts" | `checklist_reports` | SELECT | Resumos de auditoria | Admin | `ChecklistDashboard.tsx` |

---

## 📂 5. Módulo: Conteúdo & Repositórios
Gestão de arquivos, links e bibliotecas Netflix-style.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Admin/Repositories.tsx` | `repositories` | SELECT/INSERT/UPDATE | Canais de Conteúdo | Admin | `useRepositories` |
| `Admin/Repositories.tsx` | `categories` | SELECT/INSERT/UPDATE | Agrupadores | Admin | `useCategories` |
| `useSupabaseData.ts` | `contents` | SELECT/INSERT/UPDATE | Itens (Vídeos/PDFs) | Admin/Auth | `useContents` |
| `useSupabaseData.ts` | `simple_links` | SELECT/INSERT/UPDATE | Links Rápidos | Admin/Auth | `useSimpleLinks` |

---

## 📈 6. Módulo: Métricas & Engajamento
Logs de visualização, avaliações e analytics.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `useSupabaseData.ts` | `content_views` | INSERT | Log de visualização | Usuário Auth | `RepositoryDetail.tsx` |
| `useSupabaseData.ts` | `content_ratings` | UPSERT | Estrelas/Feedback | Usuário Auth | `RepositoryDetail.tsx` |
| `useSupabaseData.ts` | `quiz_attempts` | INSERT | Tentativas de Quiz | Usuário Auth | `useQuiz` |

---

## 🎨 7. Módulo: White Label & Landing Page
Customização visual e página pública.

| Arquivo | Tabela(s) | Operação | Dados (In/Out) | Permissão | Dependências |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Admin/Appearance.tsx` | `companies` | UPDATE | Theme, Bio, Layout | Admin | `useCompanies` |
| `useSupabaseData.ts` | `companies` | SELECT (Public) | Dados para Landing | Público | `LandingPage.tsx` |

---

## ⚠️ Observações Críticas para o Backend
1. **Isolamento de Tenant**: Todo SELECT deve conter `.eq('company_id', companyId)`.
2. **Soft Delete**: Quase todas as tabelas usam `deleted_at`. O backend deve filtrar automaticamente registros não nulos.
3. **RPCs**: As funções `provision_invite` e `increment_user_stats` contêm lógica de negócio complexa que deve ser portada integralmente para o `StorePage_back`.
4. **Storage**: O frontend utiliza `supabase.storage`. O backend deve prover endpoints para geração de Signed URLs ou proxy de upload.
