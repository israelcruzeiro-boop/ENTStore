-- ==========================================
-- CORREÇÃO DE SEGURANÇA: ISOLAMENTO DE TENANT
-- ==========================================

-- 1. REPOSITORIES
DROP POLICY IF EXISTS "Leitura de Repositorios Ativos" ON public.repositories;
CREATE POLICY "Leitura de Repositorios Ativos" 
ON public.repositories FOR SELECT TO authenticated
USING (
  (status = 'ACTIVE' AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "Admins editam repositorios" ON public.repositories;
CREATE POLICY "Admins editam repositorios" 
ON public.repositories FOR ALL TO authenticated
USING (
  (public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN') AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

-- 2. CONTENTS
DROP POLICY IF EXISTS "Leitura de Conteúdos" ON public.contents;
CREATE POLICY "Leitura de Conteúdos" 
ON public.contents FOR SELECT TO authenticated
USING (
  (status = 'ACTIVE' AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "Admins editam Conteudos" ON public.contents;
CREATE POLICY "Admins editam Conteudos" 
ON public.contents FOR ALL TO authenticated
USING (
  (public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN') AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

-- 3. SIMPLE LINKS
DROP POLICY IF EXISTS "Leitura de Links simples" ON public.simple_links;
CREATE POLICY "Leitura de Links simples" 
ON public.simple_links FOR SELECT TO authenticated
USING (
  (status = 'ACTIVE' AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "Admins editam Links" ON public.simple_links;
CREATE POLICY "Admins editam Links" 
ON public.simple_links FOR ALL TO authenticated
USING (
  (public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN') AND company_id = public.get_auth_user_company_id())
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

-- 4. CATEGORIES (Filtro via relacionamento com Repository)
DROP POLICY IF EXISTS "Leitura das Categorias" ON public.categories;
CREATE POLICY "Leitura das Categorias" 
ON public.categories FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.repositories r 
    WHERE r.id = repository_id 
    AND r.company_id = public.get_auth_user_company_id()
  )
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

DROP POLICY IF EXISTS "Admins editam Categorias" ON public.categories;
CREATE POLICY "Admins editam Categorias" 
ON public.categories FOR ALL TO authenticated
USING (
  (
    public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN') 
    AND EXISTS (
      SELECT 1 FROM public.repositories r 
      WHERE r.id = repository_id 
      AND r.company_id = public.get_auth_user_company_id()
    )
  )
  OR public.get_auth_user_role() = 'SUPER_ADMIN'
);

-- 5. DOCUMENTAÇÃO
COMMENT ON TABLE public.repositories IS 'Auditado em 09/04/2026: Isolamento de Tenant aplicado.';
COMMENT ON TABLE public.contents IS 'Auditado em 09/04/2026: Isolamento de Tenant aplicado.';
