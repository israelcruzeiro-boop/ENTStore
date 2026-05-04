# StorePage performance prompts by module

Status: approved with reservations by impact_validator and security_validator.

Use one prompt at a time. These prompts are for analysis and narrow patches only. Do not run broad refactors, do not mix modules, and do not implement a recommendation that changes security or public contracts without a separate validation step.

## Global guardrails

- Do not change auth, JWT, HttpOnly cookies, CORS, tenant isolation, role checks, ownership checks, service_role handling, storage paths, storage policies, RLS, Zod validation, HTML sanitization, soft delete filters, or security headers.
- Do not reintroduce Supabase access in the browser. No `supabase.from`, `supabase.rpc`, `supabase.storage`, or direct DB/storage shortcuts for performance.
- Do not use `select *`, "fetch everything and filter in the client", global cache for authenticated data, or cache keys that omit tenant/company, user/session, role, and filters.
- Reuse existing layers: frontend `src/services/api/*`, `src/hooks/*`; backend `src/services/*`, `src/repositories/contracts/*`, `src/repositories/supabase/*`, and `src/lib/ttl-cache.ts` if applicable.
- Measure before and after: bundle chunk size, number of requests, endpoint latency, payload size, query count, and render/re-render hot spots where relevant.
- If a change alters API response shape, stop and produce a contract diff covering `API_ROUTING.md`, frontend API types, mappers, hooks, and tests.
- Required validation after any patch: frontend `npm run lint` and `npm run build` when frontend changes; backend `npm run check` and `npm test` when backend changes.

## Prompt 1 - Auth, Tenant and Session

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for StorePage auth, tenant and session flow.

Scope:
- Frontend: src/contexts/AuthContext.tsx, src/contexts/TenantContext.tsx, src/services/api/client.ts, auth-related hooks and protected route usage in src/App.tsx.
- Backend: StorePage_back src/routes/auth.ts, src/plugins/auth-context.ts, src/plugins/tenant-context.ts, src/services/auth.service.ts, src/services/authentication.service.ts, src/services/session-jwt.service.ts.

Goals:
- Reduce avoidable renders, repeated /auth/me or company/features calls, and session refresh waterfalls.
- Ensure SWR/client cache is invalidated on login, logout, refresh failure, company/session changes and user switch.
- Preserve lazy routes and protected route behavior.

Hard blocks:
- Do not weaken auth, refresh token rotation, HttpOnly cookie behavior, JWT/session binding, tenant lookup, CORS, or role checks.
- Do not cache authenticated data globally or across tenants/sessions.
- Do not trust companyId, userId, role or ownership from the client as authority.

Deliver:
- Baseline observations with file references.
- A minimal patch plan, or explicit "no patch recommended".
- Validation commands to run.
```

## Prompt 2 - Frontend Shell, Bundle and Heavy Libraries

Target agents: `frontend-specialist.md`, `performance-optimizer.md`.

```text
Audit and propose narrow frontend bundle/runtime performance improvements for StorePage.

Scope:
- src/App.tsx route splitting and Suspense boundaries.
- Large pages/components: CourseDetails, CoursePlayer, SurveyDashboard, CourseDashboard, ChecklistDashboard, Structure, Users, RepositoryContents, Viewer.
- Heavy build chunks seen in production build: vendor-core, vendor-pdf, vendor-xlsx, vendor-charts, vendor-ui, vendor-lucide.

Goals:
- Keep route-level lazy loading effective.
- Move PDF/XLSX/chart/html2canvas/jsPDF work behind user actions where possible.
- Reduce initial JS and avoid importing export/chart libraries into pages that do not immediately need them.
- Fix high-value hook dependency warnings only when behavior is clear and covered.

Hard blocks:
- Do not remove auth guards, protected layouts, accessibility behavior, validation, or sanitization.
- Do not swap SWR to another data library.
- Do not make visual redesigns or broad component rewrites.

Deliver:
- Bundle opportunities ranked by impact.
- Minimal patch plan with expected chunk/request impact.
- Required validation: npm run lint and npm run build.
```

## Prompt 3 - Repositories, Contents and Public Landing

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `database-architect.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for repositories, contents, categories, simple links and public landing.

Scope:
- Frontend: useApiData/usePlatformData repository hooks, RepositoryDetail, Repositories, RepositoryContents, CompanyLandingPage, LandingPage, src/services/api/repositories.service.ts, contents.service.ts, landing.service.ts.
- Backend: StorePage_back routes/repositories.ts, routes/contents.ts, routes/landing.ts, services/content-library.service.ts, repositories/supabase/supabase-content.repository.ts.
- Database: indexes and query paths for repositories, contents, categories, simple_links, content_views, content_ratings.

Goals:
- Reduce waterfalls by preferring existing catalog/public endpoints.
- Reduce payloads without changing public response contracts.
- Identify safe pagination/filtering opportunities for admin lists.

Hard blocks:
- Public landing must not expose private content, user data, raw metrics or admin-only fields.
- Do not use direct Supabase calls in the frontend.
- Do not remove tenant, access-type, soft-delete or restricted-access checks.

Deliver:
- Request map before/after.
- Query/index recommendations as separate DB-only proposals.
- Minimal patch plan or no-patch verdict.
```

## Prompt 4 - LMS, Courses, Quizzes and Progress

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `database-architect.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for LMS/courses/quizzes.

Scope:
- Frontend: CoursePlayer, CourseDetails, CourseDashboard, CourseList, usePlatformData course hooks, src/services/courseService.ts, src/services/api/courses.service.ts.
- Backend: StorePage_back routes/courses.ts, routes/quizzes.ts, services/lms.service.ts, repositories/supabase/supabase-lms.repository.ts.
- Database: courses, course_modules, course_contents, course_questions, question options, enrollments, answers, quiz attempts.

Goals:
- Remove or reduce N+1 read patterns using existing or new batch endpoints only when contract impact is explicit.
- Keep course progress, completion, scoring and answers idempotent and ordered.
- Reduce CoursePlayer render cost and defer Viewer/heavy content safely.

Hard blocks:
- Do not make progress/answer/complete mutations fire-and-forget.
- Do not parallelize ordered mutations unless idempotency and final state are proven.
- Do not trust userId/companyId from client for ownership.
- Do not remove Zod validation, access control, soft delete filters or restricted access checks.

Deliver:
- Hot path map: course load, module navigation, answer save, completion, dashboard.
- Minimal patch plan with tests affected.
- Required validation: frontend build/lint for UI changes; backend check/test for API changes.
```

## Prompt 5 - Checklists, Submissions and Action Plans

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `database-architect.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for checklists, checklist dashboards, submissions and action plans.

Scope:
- Frontend: useChecklists.ts, ChecklistPlayer, Checklists admin, ChecklistBuilder, ChecklistDashboard, ChecklistSubmissionDetail, ActionPlans.
- Backend: StorePage_back routes/checklists.ts, services/checklists.service.ts, repositories/supabase/supabase-checklists.repository.ts.
- Database: checklists, folders, sections, questions, submissions, answers, action plan fields, photos/attachments.

Goals:
- Reduce repeated dashboard/submission requests using existing dashboard/detail endpoints.
- Consider virtualization or local memoization for large tables/lists.
- Improve batch/reorder behavior only where ordering and failure handling are preserved.

Hard blocks:
- Do not lose autosave, notes, photos, action plans, due dates, assigned users or completion state.
- Do not make answer save/complete/reorder fire-and-forget.
- Do not expose cross-tenant submissions or action plans.
- Do not bypass section/question validation.

Deliver:
- Request/query map for user flow and admin dashboard.
- Safe performance recommendations ranked by data-loss risk.
- Minimal patch plan or no-patch verdict.
```

## Prompt 6 - Surveys and Metrics

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `database-architect.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for surveys and metrics dashboards.

Scope:
- Frontend: useSurveys.ts, surveys.service.ts, SurveyBuilder, SurveyDashboard, SurveyPlayer, metrics hooks/services.
- Backend: StorePage_back routes/surveys.ts, routes/metrics.ts, services/surveys.service.ts, services/content-library.service.ts, repositories/supabase/supabase-surveys.repository.ts and metrics-related repository methods.
- Database: surveys, survey_questions, survey_responses, survey_answers, content_views, content_ratings.

Goals:
- Prefer safe backend aggregation and pagination for dashboards.
- Reduce raw answer/event payload size where contracts allow.
- Prevent repeated per-response/per-user lookups.

Hard blocks:
- Do not expose raw metrics or personal data to USER routes.
- Do not weaken anonymous survey behavior.
- Do not return other users' identifiers in non-admin contexts.
- Do not aggregate in a way that bypasses tenant, role or ownership checks.

Deliver:
- Dashboard data-shape audit.
- Aggregation/pagination proposal with security notes.
- Minimal patch plan and tests to update.
```

## Prompt 7 - Storage, Files, PDF and XLSX Exports

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for storage, uploads, public URLs, PDF export and XLSX export.

Scope:
- Frontend: storage utilities, download/export flows, CourseDiploma, ChecklistDashboard export, SurveyDashboard export, spreadsheet utilities.
- Backend: StorePage_back routes/storage.ts, services/storage.service.ts, storage schemas and env config.

Goals:
- Lazy-load PDF/XLSX/html2canvas work only on user action.
- Keep upload validation server-side and avoid large unnecessary payloads.
- Confirm export work does not block initial route loads.

Hard blocks:
- Do not expose service_role or storage credentials.
- Do not allow arbitrary buckets, paths or MIME types beyond backend validation.
- Do not move signed URL or upload trust decisions to the client.
- Do not remove sanitization before rendering/exporting HTML content.

Deliver:
- Heavy-import map and lazy-load opportunities.
- Upload/export risk notes.
- Minimal patch plan or no-patch verdict.
```

## Prompt 8 - Super Admin, Admin Lists and Organization Structure

Target agents: `backend-specialist.md`, `frontend-specialist.md`, `database-architect.md`, `performance-optimizer.md`.

```text
Audit and propose narrow performance improvements for super-admin, admin users and organization structure.

Scope:
- Frontend: Users, Structure, superadmin Dashboard, useApiData/usePlatformData user/company/structure hooks.
- Backend: StorePage_back routes/super-admin.ts, routes/admin-users.ts, routes/admin-structure.ts, services/super-admin.service.ts, services/admin-users.service.ts, services/organization.service.ts, repositories/supabase user/company/structure repositories.
- Database: users, companies, provisioned invites, org_top_levels, org_units, sessions.

Goals:
- Improve pagination/filtering for admin lists.
- Reduce repeated structure/user fetching when moving between admin screens.
- Keep hierarchy operations and parent-level transition safe.

Hard blocks:
- Do not allow user role escalation, self-protection bypass, cross-tenant reads, or client-authoritative companyId/role.
- Do not cache super-admin/admin responses globally.
- Do not change hierarchy migration/transition semantics without expand/migrate/contract plan.

Deliver:
- Admin list request/query map.
- Pagination/cache-key proposal with tenant/user/role scope.
- Minimal patch plan and tests to update.
```
