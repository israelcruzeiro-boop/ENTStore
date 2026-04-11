-- ==========================================
-- OTIMIZAÇÃO DE RLS - TABELAS DE CONTEÚDO (V7)
-- ==========================================

-- 1. REPOSITÓRIOS
DROP POLICY IF EXISTS "Admins editam repositorios" ON public.repositories;
DROP POLICY IF EXISTS "Leitura de Repositorios Ativos" ON public.repositories;

CREATE POLICY "Leitura de Repositorios Ativos" 
ON public.repositories FOR SELECT USING (status = 'ACTIVE' OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN')));

CREATE POLICY "Admins editam repositorios" 
ON public.repositories FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 2. CATEGORIAS (FASES)
DROP POLICY IF EXISTS "Admins editam Categorias" ON public.categories;
DROP POLICY IF EXISTS "Leitura das Categorias" ON public.categories;

CREATE POLICY "Leitura das Categorias" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins editam Categorias" 
ON public.categories FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 3. CONTEÚDOS (FULL)
DROP POLICY IF EXISTS "Admins editam Conteudos" ON public.contents;
DROP POLICY IF EXISTS "Leitura de Conteúdos" ON public.contents;

CREATE POLICY "Leitura de Conteúdos" 
ON public.contents FOR SELECT USING (status = 'ACTIVE' OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN')));

CREATE POLICY "Admins editam Conteudos" 
ON public.contents FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
);

-- 4. LINKS SIMPLES (CADASTRO RÁPIDO)
DROP POLICY IF EXISTS "Admins editam Links" ON public.simple_links;
DROP POLICY IF EXISTS "Leitura de Links simples" ON public.simple_links;

CREATE POLICY "Leitura de Links simples" 
ON public.simple_links FOR SELECT USING (status = 'ACTIVE' OR (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN')));

CREATE POLICY "Admins editam Links" 
ON public.simple_links FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
)
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
);
