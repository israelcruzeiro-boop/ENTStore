-- 1. Funções de Segurança (SECURITY DEFINER para evitar recursão/loop infinito)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualização de Políticas de RLS para usar as novas funções

-- COMPANIES
DROP POLICY IF EXISTS "Gestão de empresas por Admins" ON public.companies;
DROP POLICY IF EXISTS "Admins alteram Companhias" ON public.companies;
CREATE POLICY "Gestão de empresas por Admins" 
ON public.companies FOR ALL TO authenticated
USING (public.is_admin());

-- USERS
DROP POLICY IF EXISTS "Super Admins gerenciam tudo" ON public.users;
CREATE POLICY "Super Admins gerenciam tudo" 
ON public.users FOR ALL TO authenticated
USING (
  public.is_super_admin()
  OR (id = auth.uid()) -- Usuário pode ver/editar a si mesmo
);

-- REPOSITORIES
DROP POLICY IF EXISTS "Admins editam repositorios" ON public.repositories;
DROP POLICY IF EXISTS "Leitura de Repositorios Ativos" ON public.repositories;

CREATE POLICY "Leitura de Repositorios Ativos" 
ON public.repositories FOR SELECT USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Admins editam repositorios" 
ON public.repositories FOR ALL TO authenticated
USING (public.is_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "Admins editam Categorias" ON public.categories;
CREATE POLICY "Admins editam Categorias" 
ON public.categories FOR ALL TO authenticated
USING (public.is_admin());

-- CONTENTS
DROP POLICY IF EXISTS "Admins editam Conteudos" ON public.contents;
DROP POLICY IF EXISTS "Leitura de Conteúdos" ON public.contents;

CREATE POLICY "Leitura de Conteúdos" 
ON public.contents FOR SELECT USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Admins editam Conteudos" 
ON public.contents FOR ALL TO authenticated
USING (public.is_admin());

-- SIMPLE LINKS
DROP POLICY IF EXISTS "Admins editam Links" ON public.simple_links;
DROP POLICY IF EXISTS "Leitura de Links simples" ON public.simple_links;

CREATE POLICY "Leitura de Links simples" 
ON public.simple_links FOR SELECT USING (status = 'ACTIVE' OR public.is_admin());

CREATE POLICY "Admins editam Links" 
ON public.simple_links FOR ALL TO authenticated
USING (public.is_admin());
