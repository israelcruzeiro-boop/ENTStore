# AUDITORIA.md - Auditoria de Seguranca StorePage

Data da auditoria: 2026-05-04

Escopo principal:

- Frontend: `C:\Users\israe\Downloads\StorePage`
- Backend: `C:\Users\israe\Downloads\StorePage_back`
- Banco/Supabase: migrations nos dois repositorios

Esta auditoria e read-only quanto ao sistema. Nenhuma correcao de codigo, migration ou configuracao de producao foi implementada neste passo.

## 1. Sumario Executivo

O sistema tem uma base de seguranca razoavel em autenticacao e sessao: o frontend nao persiste access token em `localStorage`, o refresh token e tratado por cookie `HttpOnly`, o backend valida JWT/sessao e bloqueia configuracoes inseguras em producao. Tambem nao encontrei chave privada, service role key ou `.env` sensivel versionado nos arquivos rastreados pelo Git.

Os maiores riscos identificados estao em tres frentes:

1. Uma funcao SQL/RPC `storepage_insert_parent_level` com `SECURITY DEFINER` sem `REVOKE`/`GRANT` seguro na propria migration analisada.
2. Uso de senha temporaria global e conhecida (`123456`) para contas provisionadas.
3. Renderizacao de HTML de conteudo de curso com `dangerouslySetInnerHTML` usando sanitizacao baseada em regex.

Tambem ha riscos relevantes em upload/storage, rate limit baseado em `X-Forwarded-For`, ausencia de headers de seguranca no deploy frontend/Vercel, tokens de convite em texto claro, filtros PostgREST montados manualmente e vulnerabilidades altas em dependencias do frontend relacionadas a PWA/Workbox/serialize-javascript.

Conclusao: nao recomendo deploy de novas features antes dos hotfixes criticos de banco/RPC e provisionamento. As correcoes devem ser pequenas, sequenciais e validadas por `security_validator` antes de implementar qualquer patch, conforme `AGENTS.md`.

## 2. Escopo Avaliado

Foram avaliados:

- Frontend React/Vite em `C:\Users\israe\Downloads\StorePage`
- Backend Fastify/TypeScript em `C:\Users\israe\Downloads\StorePage_back`
- API client frontend, contexto de autenticacao e rotas protegidas
- Servicos backend de auth, sessoes, storage, usuarios/admins, convites e repositorios Supabase
- Migrations Supabase do frontend e do backend
- Variaveis de ambiente versionadas e indicios de segredos em arquivos rastreados
- Dependencias via `npm audit --json`
- Autenticacao, autorizacao, cookies, JWT, refresh session e logs
- Upload/storage, MIME types e public URLs
- Headers, CORS e CSP
- RLS, policies e RPCs

Nao foi validado diretamente o estado real de um banco Supabase remoto. A analise de banco foi feita a partir das migrations presentes nos repositorios.

## 3. Achados Por Severidade

### CRITICO 1 - RPC `storepage_insert_parent_level` com `SECURITY DEFINER` sem bloqueio explicito

- Severidade: CRITICO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\supabase\migrations\20260502_insert_parent_level_transition.sql:4`
  - `C:\Users\israe\Downloads\StorePage\supabase\migrations\20260502_insert_parent_level_transition.sql:14`
- O que pode acontecer: se a funcao estiver executavel por `anon` ou `authenticated` via Supabase RPC, um atacante pode tentar alterar estrutura organizacional/empresa burlando RLS, porque `SECURITY DEFINER` executa com privilegios do dono da funcao.
- Probabilidade: Media a alta, dependendo dos grants efetivos no banco remoto. A migration analisada nao inclui `REVOKE`/`GRANT` especifico para esta funcao.
- Impacto: Alto a critico, pois toca dados multi-tenant e estrutura organizacional.
- Evidencia tecnica: `Select-String` encontrou `CREATE OR REPLACE FUNCTION public.storepage_insert_parent_level` e `SECURITY DEFINER`, mas nao encontrou `REVOKE`/`GRANT` na migration `20260502_insert_parent_level_transition.sql`.
- Correcao recomendada: criar migration de hotfix com `REVOKE ALL ON FUNCTION public.storepage_insert_parent_level(uuid, uuid, text, jsonb, text, jsonb) FROM PUBLIC, anon, authenticated;` e `GRANT EXECUTE ... TO service_role;`. Avaliar tambem `SET search_path = public, pg_temp`.
- Risco de quebrar o sistema: Baixo se o backend usa service role para chamar a RPC. Deve ser testado.
- Como validar depois da correcao: testar chamada RPC como `anon` e `authenticated` esperando negacao; testar rota admin backend que usa a RPC esperando sucesso.

### CRITICO 2 - Senha temporaria global `123456` para contas provisionadas

- Severidade: CRITICO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\lib\password-policy.ts:3`
  - `C:\Users\israe\Downloads\StorePage_back\src\services\admin-users.service.ts:142`
  - `C:\Users\israe\Downloads\StorePage_back\src\services\super-admin.service.ts:382`
- O que pode acontecer: qualquer conta criada com `firstAccess` recebe uma senha global conhecida. Se atacante souber email e tenant, pode tentar autenticar antes do usuario legitimo.
- Probabilidade: Alta enquanto existirem contas pendentes com a senha padrao.
- Impacto: Critico, pois pode resultar em tomada de conta.
- Evidencia tecnica: `TEMPORARY_INITIAL_PASSWORD = '123456'` e usado para gerar `passwordHash` de usuarios/admins provisionados.
- Correcao recomendada: substituir por fluxo de ativacao com token unico, impedir login por senha em conta pendente, revogar sessoes de contas `firstAccess` e reemitir ativacoes.
- Risco de quebrar o sistema: Medio, pois altera onboarding/primeiro acesso. Deve ser feito em fase controlada.
- Como validar depois da correcao: criar usuario pendente e confirmar que login com `123456` falha; ativacao por token funciona; usuario ativo segue fazendo login normalmente.

### ALTO 1 - Stored XSS em conteudo de curso por sanitizacao regex

- Severidade: ALTO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\src\utils\sanitizeHtml.ts:1`
  - `C:\Users\israe\Downloads\StorePage\src\utils\sanitizeHtml.ts:6`
  - `C:\Users\israe\Downloads\StorePage\src\pages\user\CoursePlayer.tsx:1009`
- O que pode acontecer: conteudo HTML malicioso salvo por admin ou vindo de importacao pode executar script no navegador de usuarios.
- Probabilidade: Media.
- Impacto: Alto, podendo roubar dados exibidos na sessao, executar acoes no contexto do usuario e comprometer tenant.
- Evidencia tecnica: `dangerouslySetInnerHTML` renderiza `sanitizeHtml(currentContent.html_content)`, e `sanitizeHtml` remove tags/atributos por regex.
- Correcao recomendada: usar DOMPurify com allowlist explicita no frontend e sanitizacao server-side ao salvar conteudo.
- Risco de quebrar o sistema: Medio, pois conteudos existentes podem perder tags atualmente aceitas. Precisa inventario/allowlist.
- Como validar depois da correcao: testes com payloads XSS comuns, conteudos legitimos com imagens/listas/links e teste visual no player.

### ALTO 2 - Upload/storage permissivo demais

- Severidade: ALTO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\routes\storage.ts:12`
  - `C:\Users\israe\Downloads\StorePage_back\src\routes\storage.ts:24`
  - `C:\Users\israe\Downloads\StorePage_back\src\services\storage.service.ts:31`
  - `C:\Users\israe\Downloads\StorePage_back\src\services\storage.service.ts:89`
- O que pode acontecer: qualquer usuario autenticado consegue solicitar upload/public URL para buckets permitidos. Tipos amplos como `application/octet-stream` ampliam risco de upload de conteudo ativo ou indevido.
- Probabilidade: Media.
- Impacto: Alto se buckets publicos servirem HTML/SVG ou arquivos sensiveis.
- Evidencia tecnica: rotas usam apenas `requireAuthenticatedRequest`; servico aceita buckets da env e permite `application/octet-stream`.
- Correcao recomendada: matriz bucket/role, validacao por magic bytes, bloquear `text/html` e SVG publico, exigir prefixo tenant e separar buckets por caso de uso.
- Risco de quebrar o sistema: Medio. Regras novas podem bloquear uploads legitimos se nao houver inventario.
- Como validar depois da correcao: testes por role/bucket/MIME, upload legitimo de imagens/PDF, negativa para HTML/SVG/octet-stream indevido.

### ALTO 3 - Rate limit confia em `X-Forwarded-For`

- Severidade: ALTO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\lib\rate-limit.ts:17`
  - `C:\Users\israe\Downloads\StorePage_back\src\lib\rate-limit.ts:20`
  - `C:\Users\israe\Downloads\StorePage_back\src\app.ts:16`
- O que pode acontecer: se o proxy permitir header forjado, atacante pode rotacionar `X-Forwarded-For` e burlar rate limit de login/refresh/convite.
- Probabilidade: Media.
- Impacto: Alto para brute force e abuso de convites.
- Evidencia tecnica: rate limit usa `WeakMap` em memoria e pega primeiro IP de `x-forwarded-for`; app usa `trustProxy: true`.
- Correcao recomendada: confiar apenas em proxy conhecido, usar `request.ip` normalizado pelo Fastify/proxy confiavel, e store compartilhado como Redis/Upstash.
- Risco de quebrar o sistema: Baixo a medio. Pode mudar contagem de IPs atras de proxy.
- Como validar depois da correcao: testes com e sem `X-Forwarded-For`, multiplas instancias e limites por IP+identificador.

### ALTO 4 - Frontend/Vercel sem security headers

- Severidade: ALTO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\vercel.json:3`
- O que pode acontecer: a SPA fica sem CSP, HSTS, `frame-ancestors`, `nosniff` e politicas de permissao no host frontend. Isso reduz defesa contra XSS, clickjacking e downgrade.
- Probabilidade: Alta se este `vercel.json` for usado em producao.
- Impacto: Alto em conjunto com o risco de XSS.
- Evidencia tecnica: `vercel.json` contem apenas rewrites.
- Correcao recomendada: adicionar headers na Vercel; iniciar CSP em report-only se houver risco de quebrar assets.
- Risco de quebrar o sistema: Medio para CSP; baixo para HSTS/nosniff/referrer/permissions.
- Como validar depois da correcao: `curl -I` no deploy, teste de carregamento da SPA, console sem violacoes inesperadas.

### ALTO 5 - Vulnerabilidades altas no frontend via PWA/Workbox/serialize-javascript

- Severidade: ALTO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\package.json:93`
  - `C:\Users\israe\Downloads\StorePage\package-lock.json:9851`
  - `C:\Users\israe\Downloads\StorePage\package-lock.json:11223`
- O que pode acontecer: cadeia de build/PWA usa dependencia vulneravel. `npm audit` reportou RCE/DoS em `serialize-javascript` via `@rollup/plugin-terser`/`workbox-build`.
- Probabilidade: Media, mais ligada a ambiente de build/supply chain do que runtime direto.
- Impacto: Alto se explorado no pipeline ou processo de build.
- Evidencia tecnica: `npm audit --json` no frontend retornou 3 vulnerabilidades altas, fix disponivel.
- Correcao recomendada: atualizar `vite-plugin-pwa`/Workbox/dependencias relacionadas, rodar build e validar service worker/cache.
- Risco de quebrar o sistema: Medio, pois PWA/cache pode mudar comportamento.
- Como validar depois da correcao: `npm audit --json`, `npm run build`, teste de PWA/cache e carregamento offline se suportado.

### MEDIO 1 - Tokens de convite em texto claro

- Severidade: MEDIO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\modules\invite\contracts\invite.types.ts:17`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-invite.repository.ts:19`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-invite.repository.ts:23`
- O que pode acontecer: se a tabela ou logs forem expostos, tokens de convite ativos podem ser usados diretamente.
- Probabilidade: Media.
- Impacto: Medio a alto, dependendo do perfil convidado.
- Evidencia tecnica: contrato possui `token: string`; repositorio busca `provisioned_invites` por coluna `token`.
- Correcao recomendada: armazenar hash do token, opcionalmente com selector/prefixo; nunca persistir token claro.
- Risco de quebrar o sistema: Medio. Fluxo de convites ativos precisa migracao.
- Como validar depois da correcao: convite novo guarda apenas hash; link de ativacao funciona; token antigo expira ou e reemitido.

### MEDIO 2 - Filtros Supabase/PostgREST `or`/`ilike` montados manualmente

- Severidade: MEDIO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-rest-client.ts:214`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-rest-client.ts:239`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-user.repository.ts:77`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-user.repository.ts:123`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-company.repository.ts:60`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-lms.repository.ts:94`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-checklists.repository.ts:77`
  - `C:\Users\israe\Downloads\StorePage_back\src\repositories\supabase\supabase-surveys.repository.ts:56`
- O que pode acontecer: caracteres especiais podem quebrar a gramatica PostgREST, ampliar filtros ou causar erro/DoS de consulta.
- Probabilidade: Media.
- Impacto: Medio. Nao e SQL injection direta, mas e uma superficie de injecao de filtro.
- Evidencia tecnica: `options.or` e inserido como string; buscas usam template string com `*${search}*`.
- Correcao recomendada: helper central de escape/normalizacao para valores PostgREST, limitar caracteres de busca ou construir filtros seguros por coluna.
- Risco de quebrar o sistema: Medio, pois pode alterar resultado de buscas com caracteres especiais.
- Como validar depois da correcao: testes com busca normal, acentos, parenteses, virgula, asterisco e payloads maliciosos.

### MEDIO 3 - Drift entre migrations do frontend e backend

- Severidade: MEDIO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\supabase\migrations\*`
  - `C:\Users\israe\Downloads\StorePage_back\supabase\*`
- O que pode acontecer: ambiente real pode aplicar migrations de uma trilha e o codigo de outra, gerando policies/RPCs/schema divergentes.
- Probabilidade: Media.
- Impacto: Medio a alto em seguranca e estabilidade.
- Evidencia tecnica: existem migrations e scripts Supabase nos dois repositorios.
- Correcao recomendada: definir fonte unica de verdade, inventario de ordem aplicada e check de drift em CI.
- Risco de quebrar o sistema: Baixo se for apenas organizacao; medio se exigir reconciliacao de schema.
- Como validar depois da correcao: comparar migrations aplicadas no Supabase remoto com repositorio canonico.

### MEDIO 4 - Dados publicos de empresa precisam governanca

- Severidade: MEDIO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\supabase\migrations\20260417122000_fix_tenant_isolation.sql:113`
  - `C:\Users\israe\Downloads\StorePage\supabase\migrations\20260417122000_fix_tenant_isolation.sql:135`
- O que pode acontecer: campos de branding/landing sao publicos por design. Se alguem inserir informacao sensivel em `public_bio`, `hero_title`, imagens ou tema, ela sera exposta publicamente.
- Probabilidade: Media.
- Impacto: Medio.
- Evidencia tecnica: migration cria policy `Lookup publico de empresas` com `USING (true)` e concede select anon a colunas especificas.
- Correcao recomendada: documentar esses campos como publicos, validar conteudo e evitar PII/secrets nesses campos.
- Risco de quebrar o sistema: Baixo.
- Como validar depois da correcao: consulta anon retorna somente colunas permitidas; revisao de conteudo publico.

### BAIXO 1 - Politica de senha minima simples

- Severidade: BAIXO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage_back\src\schemas\shared.ts`
- O que pode acontecer: senhas fracas podem passar se cumprirem comprimento minimo.
- Probabilidade: Media.
- Impacto: Baixo a medio.
- Evidencia tecnica: schema de senha foi observado como minimo de comprimento, sem complexidade/entropia/breach check.
- Correcao recomendada: apos remover `123456`, adicionar politica por entropia e lista de senhas comprometidas.
- Risco de quebrar o sistema: Medio se aplicado a usuarios existentes sem fase.
- Como validar depois da correcao: testes de senha fraca, senha longa, senha comprometida e senha valida.

### INFORMATIVO 1 - Scanner local tem falsos positivos importantes

- Severidade: INFORMATIVO
- Arquivos/linhas:
  - `C:\Users\israe\Downloads\StorePage\.agent\skills\vulnerability-scanner\scripts\security_scan.py`
  - `C:\Users\israe\Downloads\StorePage_back\src\plugins\auth-context.ts:15`
- O que pode acontecer: priorizacao incorreta se o resultado bruto for aceito sem triagem.
- Probabilidade: Alta.
- Impacto: Baixo, mas pode desperdiçar tempo.
- Evidencia tecnica: scanner marcou o proprio arquivo de regras como `eval/exec`, worktrees `.claude`, e marcou `.exec()` de regex como code execution.
- Correcao recomendada: ajustar exclusoes do scanner e regras para diferenciar regex `.exec()` de execucao de codigo.
- Risco de quebrar o sistema: Nulo, se for apenas ajuste de ferramenta.
- Como validar depois da correcao: scanner deve continuar achando `dangerouslySetInnerHTML` real e senha global real, sem apontar o proprio arquivo de regras.

## 4. Dados Sensiveis Expostos

- Ha secrets versionados? Nao encontrei secrets privados obvios nos arquivos rastreados pelo Git. A busca por padroes como service role key, private key, bearer JWT, `sk_live`, `AKIA` e similares nao retornou achados em codigo versionado.
- Ha `.env` commitado? No frontend, `git ls-files .env .env.*` nao retornou arquivos. No backend, apenas `.env.example` esta versionado. Arquivos `.env` reais existem localmente no backend, mas estao ignorados pelo Git; seus valores nao foram impressos.
- Ha service role key exposta no frontend? Nao. Busca por `@supabase`, `createClient`, `supabase.` e `rpc(` em `src` do frontend nao encontrou uso direto atual. Busca por service role no frontend encontrou apenas texto SQL de grants nas migrations, nao uma chave.
- Ha token/API key em codigo? Nao encontrei token/API key real versionado. O scanner apontou tokens em testes e strings de regras, mas a triagem manual indicou falsos positivos ou dados de teste. A senha `123456` e real como senha temporaria de fluxo, por isso e achado critico.
- Quais dados de empresa sao publicos por design? `id`, `name`, `slug`, `link_name`, `theme`, `logo_url`, `hero_image`, `hero_title`, `hero_subtitle`, `public_bio`, `active`, `landing_page_active`, `landing_page_layout`.
- Ha PII ou credencial trafegando/renderizando de forma insegura? Ha risco de token de convite persistido em claro no banco. Ha risco de HTML de curso renderizar conteudo ativo se sanitizacao falhar. Refresh token nao e enviado no corpo da resposta final das rotas, sendo mantido em cookie `HttpOnly`.

## 5. Pontos Positivos

- Access token nao e persistido em `localStorage`; o frontend remove chave legada `sp_access_token` e guarda apenas hint `sp_has_refresh_session`.
- Refresh token usa cookie `HttpOnly`, `SameSite=Lax`, `Path`, `Max-Age` e `Secure` em producao.
- Backend remove `refreshToken` do payload antes de responder nas rotas que setam cookie.
- JWT usa `jose`, issuer/audience e `token_use` para access/refresh.
- Sessoes sao revogaveis e refresh token e comparado contra hash persistido.
- Config de producao bloqueia `JWT_AUTH_MODE=disabled`, wildcard CORS e provider de convite `noop`.
- Plugin de security headers da API define CSP restritiva, `frame-ancestors 'none'`, `nosniff`, referrer policy e HSTS em producao.
- Logger backend redige `authorization`, `cookie`, `password`, `token`, refresh token e parametros sensiveis de URL.
- Policies de `auth_sessions` e `invite_delivery_attempts` no backend estao restritas a `TO service_role`.
- Migration `20260417122000_fix_tenant_isolation.sql` corrige varias policies antigas `USING(true)` para escopo por tenant, mantendo excecao documentada para lookup publico de empresas.
- Frontend nao usa Supabase client diretamente em `src` no estado atual verificado.

## 6. Plano De Correcao Em 8 Passos

1. Criar `AUDITORIA.md`: concluido neste passo. Documento vira checklist rastreavel.
2. Hotfix do banco/RPC critica: bloquear execucao publica de `storepage_insert_parent_level`, liberar apenas `service_role`, validar anon/authenticated negados e rota admin funcionando.
3. Remover senha temporaria global: substituir `123456` por ativacao segura, bloquear login de conta pendente por senha, revogar sessoes e migrar contas `firstAccess`.
4. Corrigir XSS no conteudo de cursos: trocar regex por DOMPurify/allowlist, sanitizar tambem no backend e testar payloads.
5. Endurecer upload/storage: matriz bucket/role, MIME sniffing, bloqueio de tipos ativos e prefixo tenant obrigatorio.
6. Corrigir rate limit/proxy: store compartilhado e IP confiavel; chave por IP+identificador/tenant.
7. Hash de convites e filtros Supabase seguros: token hash/selector, dual-read ou reemissao; helper seguro para filtros PostgREST.
8. Headers, dependencias e validacao final: security headers na Vercel, update PWA/Workbox, `npm audit`, build/testes e `final_validator`.

## 7. Estrategia Para Nao Quebrar Nada

- Comecar por hotfixes de menor superficie e maior impacto: RPC e senha temporaria.
- Antes de implementar qualquer fix de seguranca, usar `security_validator` em read-only conforme `AGENTS.md`.
- Para planos de implementacao, usar `impact_validator` antes do worker implementar.
- Depois de cada implementacao, usar `final_validator` como portao final.
- Aplicar mudancas pequenas e reversiveis.
- Evitar refactors junto com fix de seguranca.
- Para banco, preferir migrations aditivas e grants/revokes especificos.
- Para alteracoes de fluxo de login/convite, manter compatibilidade temporaria quando seguro ou reemitir convites ativos.
- Para CSP, iniciar em report-only se necessario e depois aplicar enforcing.
- Para storage, primeiro inventariar uso real; depois aplicar bloqueios por bucket/role.
- Para dependencias PWA, validar build, service worker e cache antes de deploy.
- Todo item rejeitado pelo `security_validator`, `impact_validator` ou `final_validator` deve bloquear implementacao/merge.

## 8. Comandos Executados

Comandos de contexto e estado:

- `Get-Content AGENTS.md`: confirmou obrigatoriedade de `security_validator` antes de implementacoes de seguranca.
- `Get-Content .codex/Validation/V_Agent_ImpactGuard.md`: confirmou fluxo com `impact_validator`.
- `Get-Content .codex/Validation/V_Agent_QualitySeal.md`: confirmou uso de `final_validator` apos implementacao.
- `Get-Content .codex/Validation/V_final-validator.toml`: confirmou regras do validador final.
- `Get-Content .codex/Validation/V_impact-validator.toml`: confirmou regras do validador de impacto.
- `Get-Content .agent/agents/security-auditor.md`: confirmou workflow de auditoria e scanner local.
- `git status --short --branch` em frontend e backend: ambos tem alteracoes preexistentes no working tree; esta auditoria nao reverteu nem editou esses arquivos.

Comandos de busca e evidencias:

- `rg ...`: tentativa inicial falhou com `Acesso negado`; usado fallback com `Select-String` e `git grep`.
- `Select-String` em `20260502_insert_parent_level_transition.sql`: encontrou RPC e `SECURITY DEFINER`; nao encontrou `REVOKE`/`GRANT` especifico nesta migration.
- `Select-String` em `password-policy.ts`, `admin-users.service.ts`, `super-admin.service.ts`: confirmou `TEMPORARY_INITIAL_PASSWORD = '123456'` e uso no hash de senha.
- `Select-String` em `sanitizeHtml.ts` e `CoursePlayer.tsx`: confirmou sanitizacao regex e `dangerouslySetInnerHTML`.
- `Select-String` em `storage.service.ts` e `storage.ts`: confirmou upload/public URL apenas com autenticacao e MIME amplo.
- `Select-String` em `rate-limit.ts` e `app.ts`: confirmou `x-forwarded-for`, `WeakMap` local e `trustProxy: true`.
- `Select-String` em `vercel.json`, `package.json`, `package-lock.json`, `vite.config.ts`: confirmou falta de headers e dependencia PWA/Workbox.
- `Select-String` em repositorios Supabase: confirmou `or`/`ilike` montados manualmente.
- `git grep` em frontend `src` por `@supabase`, `createClient`, `supabase.` e `rpc(`: sem matches.
- Busca por padroes de secrets em arquivos versionados: sem achados de segredo real.
- `git ls-files .env .env.*`: frontend sem `.env` versionado; backend com `.env.example`.

Comandos automatizados:

- `npm audit --json` em `C:\Users\israe\Downloads\StorePage`: 3 vulnerabilidades altas, todas relacionadas a `serialize-javascript`, `@rollup/plugin-terser` e `workbox-build`; fix disponivel.
- `npm audit --json` em `C:\Users\israe\Downloads\StorePage_back`: 0 vulnerabilidades.
- `python .agent\skills\vulnerability-scanner\scripts\security_scan.py C:\Users\israe\Downloads\StorePage --output summary`: reportou criticos/altos, mas com falsos positivos em arquivo de regras e worktree `.claude`; achado util: falta de headers e padroes perigosos a revisar.
- `python .agent\skills\vulnerability-scanner\scripts\security_scan.py C:\Users\israe\Downloads\StorePage_back --output summary`: reportou criticos/altos, mas marcou `.exec()` de regex como execucao de codigo; achado util: senha global `123456`.

## O que nao pode ser verificado neste passo

- Estado real do banco Supabase remoto, grants efetivos e lista de migrations aplicadas.
- Se os buckets Supabase sao publicos ou privados no ambiente real.
- Se o proxy de producao filtra ou sobrescreve `X-Forwarded-For`.
- Se headers ja sao aplicados por camada externa fora do `vercel.json`.
- Se existem segredos expostos fora do Git local, por exemplo em dashboards, CI/CD ou provedor cloud.
- Se convites ativos em producao ainda usam tokens antigos e quantos usuarios estao em `firstAccess`.

## Prompt do proximo passo (2/8)

```md
Voce esta no projeto `C:\Users\israe\Downloads\StorePage`.

Existe tambem um backend relacionado em:

`C:\Users\israe\Downloads\StorePage_back`

Objetivo deste passo 2/8: implementar um hotfix seguro para a funcao SQL/RPC critica `public.storepage_insert_parent_level`, garantindo que ela nao possa ser executada por `PUBLIC`, `anon` ou `authenticated`, mantendo funcionamento pelo backend via `service_role`.

Antes de qualquer implementacao, leia e respeite:

- `AGENTS.md`
- `AUDITORIA.md`
- `.codex/Validation/V_Agent_ImpactGuard.md`
- `.codex/Validation/V_Agent_QualitySeal.md`
- `.codex/Validation/V_final-validator.toml`
- `.codex/Validation/V_impact-validator.toml`

Regra obrigatoria de seguranca:

Use o `security_validator` para revisar o item da `AUDITORIA.md` sobre `storepage_insert_parent_level` antes de aplicar qualquer fix.

O `security_validator` deve operar em read-only e responder se o hotfix proposto esta:

- APROVADO
- APROVADO COM RESSALVA
- REJEITADO
- QUESTIONAR

Se o `security_validator` rejeitar, nao implemente nada.
Se aprovar com ressalva, implemente somente respeitando todas as ressalvas.

Escopo permitido:

1. Criar uma nova migration Supabase no repositorio correto para revogar execucao publica da funcao:
   - `REVOKE ALL ON FUNCTION public.storepage_insert_parent_level(uuid, uuid, text, jsonb, text, jsonb) FROM PUBLIC;`
   - `REVOKE ALL ON FUNCTION public.storepage_insert_parent_level(uuid, uuid, text, jsonb, text, jsonb) FROM anon;`
   - `REVOKE ALL ON FUNCTION public.storepage_insert_parent_level(uuid, uuid, text, jsonb, text, jsonb) FROM authenticated;`
   - `GRANT EXECUTE ON FUNCTION public.storepage_insert_parent_level(uuid, uuid, text, jsonb, text, jsonb) TO service_role;`
2. Verificar se existe assinatura antiga da funcao e, se existir, aplicar o mesmo bloqueio tambem nela.
3. Nao alterar logica da funcao neste passo, salvo se o `security_validator` exigir ajuste obrigatorio.
4. Nao alterar frontend.
5. Nao alterar fluxo de senha, storage, XSS ou dependencias neste passo.

Validacoes obrigatorias:

- Confirmar que a migration original possui `SECURITY DEFINER`.
- Confirmar se a nova migration tem `REVOKE` para `PUBLIC`, `anon`, `authenticated`.
- Confirmar se a nova migration tem `GRANT EXECUTE` apenas para `service_role`.
- Rodar testes ou comandos disponiveis que validem syntax/consistencia de migrations, se existirem.
- Fazer busca no codigo para confirmar que a chamada da RPC pelo backend continua centralizada e protegida por rota admin.
- Rodar `git diff --stat` e revisar o diff final.

Ao final:

1. Explique exatamente quais arquivos foram alterados.
2. Informe quais comandos foram executados e resultados.
3. Informe riscos residuais.
4. Nao faca commit.
5. Inclua uma secao chamada `Prompt do proximo passo (3/8)`.

Na secao `Prompt do proximo passo (3/8)`, escreva um prompt completo para remover a senha temporaria global `123456` sem quebrar o fluxo de primeiro acesso. Esse prompt deve obrigatoriamente mandar o proximo agente usar o `security_validator` antes de implementar qualquer correcao.
```
