-- Migration: Replace the 7 USING(true) SELECT policies identified in the audit
-- with tenant-scoped filters.
--
-- Audit reference (REVISAO_SEGURANCA.md): the baseline migration shipped 7
-- SELECT policies with USING(true), allowing any authenticated (sometimes
-- anonymous) session to read rows across tenants:
--
--   content_ratings      — authenticated, USING(true)      -- baseline L1573
--   content_views        — authenticated, USING(true)      -- baseline L1577
--   companies            — public,        USING(true)      -- baseline L1581
--   checklist_questions  — authenticated, USING(true)      -- baseline L1591
--   checklist_sections   — authenticated, USING(true)      -- baseline L1601
--   org_top_levels       — authenticated, USING(true)      -- baseline L1717
--   org_units            — authenticated, USING(true)      -- baseline L1721
--
-- Strategy:
--   * For tables that already carry company_id, the filter is a direct
--     equality with public.get_auth_user_company_id().
--   * checklist_questions / checklist_sections have no company_id column;
--     they reference checklists(company_id). Instead of re-implementing the
--     tenant check on the child tables, we let the EXISTS subquery inherit
--     the existing RLS on public.checklists ("Checklists visible to correct
--     users"). That policy is already tenant-scoped AND enforces the full
--     checklist ACL (allowed_user_ids, excluded_user_ids, access_type ALL /
--     RESTRICTED, role-based rules). Reusing it means questions and sections
--     become visible to exactly the same set of users who can see the parent
--     checklist — nothing more, nothing less.
--   * companies is special-cased — anonymous visitors must resolve an
--     empresa by slug to render the branded login screen and landing page.
--     Row visibility for anon is kept open (USING true), but column-level
--     GRANT is tightened so anon only reads the columns the public UI needs.
--     Authenticated users are scoped to their own company; the pre-existing
--     "Gestão de empresas por Admins" policy (TO authenticated USING is_admin())
--     continues to grant admins their broader access and is NOT touched here.

----------------------------------------------------------------
-- 1. content_ratings — tenant-scoped SELECT
----------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de avaliações" ON public.content_ratings;

CREATE POLICY "Tenant lê avaliações" ON public.content_ratings
  FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

----------------------------------------------------------------
-- 2. content_views — tenant-scoped SELECT
----------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de visualizações" ON public.content_views;

CREATE POLICY "Tenant lê visualizações" ON public.content_views
  FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

----------------------------------------------------------------
-- 3. checklist_questions — visibility inherited from parent checklist
--    (the EXISTS below is resolved under the caller's RLS on checklists,
--    which already scopes by company_id + full ACL).
----------------------------------------------------------------
DROP POLICY IF EXISTS "Questions visible to authenticated" ON public.checklist_questions;

CREATE POLICY "Tenant lê checklist_questions" ON public.checklist_questions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.checklists c
       WHERE c.id = checklist_questions.checklist_id
    )
  );

----------------------------------------------------------------
-- 4. checklist_sections — visibility inherited from parent checklist
--    (same rationale as item 3).
----------------------------------------------------------------
DROP POLICY IF EXISTS "Sections visible to authenticated" ON public.checklist_sections;

CREATE POLICY "Tenant lê checklist_sections" ON public.checklist_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
        FROM public.checklists c
       WHERE c.id = checklist_sections.checklist_id
    )
  );

----------------------------------------------------------------
-- 5. org_top_levels — tenant-scoped SELECT
----------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários leem seus times" ON public.org_top_levels;

CREATE POLICY "Tenant lê org_top_levels" ON public.org_top_levels
  FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

----------------------------------------------------------------
-- 6. org_units — tenant-scoped SELECT
----------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários leem suas units" ON public.org_units;

CREATE POLICY "Tenant lê org_units" ON public.org_units
  FOR SELECT TO authenticated
  USING (company_id = public.get_auth_user_company_id());

----------------------------------------------------------------
-- 7. companies — special case (anon lookup + authenticated tenant scope)
----------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura pública de empresas" ON public.companies;

-- 7a. Anonymous probe. Row visibility is kept open so the login screen and
--     landing page can resolve an empresa by slug/link_name. Column-level
--     grant (below) limits what anon can actually read.
CREATE POLICY "Lookup público de empresas" ON public.companies
  FOR SELECT TO anon
  USING (true);

-- 7b. Authenticated tenants see their own company. SUPER_ADMIN / ADMIN
--     broader access is handled by the pre-existing
--     "Gestão de empresas por Admins" policy (TO authenticated USING is_admin()),
--     which remains in place and, being permissive, ORs with this one.
CREATE POLICY "Tenant lê própria empresa" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_auth_user_company_id());

-- Column-level GRANT for anon.
--
-- The public surface is larger than the login screen: the landing page
-- (src/hooks/useSupabaseData.ts :: usePublicCompanyBySlug, linha 419) already
-- reads theme, hero_*, public_bio and a couple of feature flags to render
-- the branded company home BEFORE any login happens. The column list below
-- matches exactly that hook's current SELECT so the public UI keeps working
-- with no frontend change. Sensitive fields (org_levels, checklists_enabled,
-- created_at/updated_at/deleted_at, etc.) stay off-limits for anon.
REVOKE ALL ON TABLE public.companies FROM anon;
GRANT SELECT (
  id,
  name,
  slug,
  link_name,
  theme,
  logo_url,
  hero_image,
  hero_title,
  hero_subtitle,
  public_bio,
  active,
  landing_page_active,
  landing_page_layout
) ON TABLE public.companies TO anon;

-- Authenticated role keeps full column access; row scoping comes from the
-- policies above.
GRANT SELECT ON TABLE public.companies TO authenticated;

----------------------------------------------------------------
-- End of migration.
----------------------------------------------------------------
