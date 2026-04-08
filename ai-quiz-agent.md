# Plano Mestre: Agente de IA para Quizzes

Este plano detalha a implementação cirúrgica do Agente de IA para geração de Quizzes, integrando Frontend, Backend e Performance.

## 🟢 Fase 1: Análise (ANALYZE) - CONCLUÍDA
- [x] Verificação de tipos de conteúdo existentes (PDF, VIDEO, DOCUMENT, LINK, MUSIC).
- [x] Mapeamento de RLS (Row Level Security) e Multi-tenancy (uso de `company_id`).
- [x] Identificação de pontos de injeção no `Viewer.tsx` e `ContentDetail.tsx`.
- [x] Estudo do sistema de progresso (`user_progress` e `missions`).

---

## 🟡 Fase 2: Planejamento (PLANNING) - EM ANDAMENTO

### Arquitetura de Dados (P0)
- **Tabela `quizzes`**: Vinculada à tabela `contents` (1:1 ou via `content_id`).
- **Tabela `quiz_questions`**: Perguntas normalizadas para facilitar ordenação e atualizações.
- **Tabela `quiz_options`**: Opções de resposta com flag `is_correct`.
- **Tabela `quiz_attempts`**: Registro histórico de tentativas dos usuários.

### Agentes Designados
- `backend-specialist`: Schema, RLS, Edge Functions (Deno/Supabase).
- `frontend-specialist`: UI do Player de Quiz e Admin.
- `performance-optimizer`: Otimização de latência da IA e UX de feedback.
- `project-planner`: Coordenação entre fases e validação de dependências.

---

## 🟠 Fase 3: Solução (SOLUTIONING) - PRÓXIMO PASSO
- Desenho do contrato da Edge Function (Input: prompt_id, content_id -> Output: JSON Quiz).
- Mockup do componente `QuizPlayer.tsx` com animações de micro-interação e feedback sonoro opcional.
- Definição da lógica de pontuação (XP vindo da `missions` ou pontuação direta).

---

## 🔴 Fase 4: Implementação (IMPLEMENTATION)

### Tarefa 1: Backend Infrastructure (Schema & RLS)
- AGENTE: `backend-specialist`
- SKILLS: `database-design`, `supabase-rls`
- **INPUT**: Schema atual.
- **OUTPUT**: Migrations SQL para novas tabelas (`quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`).
- **VERIFY**: Tabelas visíveis no dashboard Supabase com RLS ativa garantindo isolamento por `company_id`.

### Tarefa 2: AI Edge Function (Geração de Quiz)
- AGENTE: `backend-specialist`
- SKILLS: `api-patterns`, `nodejs-best-practices`
- **INPUT**: Chave da API (OpenAI/Gemini) configurada nos Secrets do Supabase.
- **OUTPUT**: Função `generate-quiz` em Deno/TypeScript.
- **VERIFY**: Chamada curl/postman retornando JSON estruturado com perguntas baseadas no conteúdo alvo.

### Tarefa 3: Frontend - Quiz Player UI & Logic
- AGENTE: `frontend-specialist`
- SKILLS: `frontend-design`, `react-best-practices` e `clean-code`.
- **INPUT**: Definição de tipos em `types/index.ts` atualizada com `QUIZ`.
- **OUTPUT**: Componente `QuizPlayer.tsx` integrado ao `Viewer.tsx` com suporte a estados de "respondendo", "feedback" e "resultado final".
- **VERIFY**: Simulador de quiz terminando e exibindo resumo sem erros no console.

### Tarefa 4: Admin - Interface de Geração de Conteúdo
- AGENTE: `frontend-specialist`
- SKILLS: `clean-code`
- **INPUT**: Componente `RepositoryContents.tsx` de admin.
- **OUTPUT**: Widget de "Gerar com IA" que dispara a Edge Function e atualiza a listagem de conteúdos após a criação.
- **VERIFY**: Conteúdo do tipo 'QUIZ' aparecendo no repositório após o processo.

### Tarefa 5: Gamificação, Progresso e Performance
- AGENTEs: `backend-specialist` & `performance-optimizer`
- SKILLS: `database-design` & `performance-profiling`.
- **INPUT**: `user_progress` table.
- **OUTPUT**: Trigger ou lógica na Edge Function para conceder XP/Moedas ao finalizar o quiz com sucesso.
- **VERIFY**: Usuário termina quiz -> vê progresso atualizado -> animação de "XP ganho".

---

## ✅ Fase X: Verificação Final (MAESTRO AUDITOR)
- AGENTE: `performance-optimizer`
- Scripts: `ux_audit.py`, `security_scan.py`, `lint_runner.py`.
- [ ] Teste de carga na geração de perguntas (latência aceitável).
- [ ] Validação de Core Web Vitals no player (LCP < 2.5s).
- [ ] Verificação de isolamento Multi-tenant (Segurança total dos dados da Company).
- [ ] Teste E2E (Admin Gera -> Aluno Responde -> Ganha moedas).
