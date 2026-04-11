-- ==========================================
-- CORREÇÃO CIRÚRGICA DE CRIAÇÃO E ESTABILIDADE (CONSOLIDADA)
-- ==========================================

-- 1. CORREÇÃO DA TABELA DE USUÁRIOS
-- Adiciona a coluna password que está faltando e impede a criação de admins/usuários
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- 2. CORREÇÃO DA RECURSÃO INFINITA (RLS)
-- Isso resolve o erro 500 e o refresh infinito da página
DROP POLICY IF EXISTS "Acesso Livre Companhias" ON public.companies;
DROP POLICY IF EXISTS "Admins alteram Companhias" ON public.companies;
DROP POLICY IF EXISTS "Leitura pública de empresas" ON public.companies;
DROP POLICY IF EXISTS "Gestão de empresas por Admins" ON public.companies;

-- Política de leitura pública (necessária para login e carregamento inicial)
CREATE POLICY "Leitura pública de empresas" 
ON public.companies FOR SELECT USING (true);

-- Política de gestão sem subqueries recursivas
CREATE POLICY "Gestão de empresas por Admins" 
ON public.companies FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')))
);

-- 3. PERMISSÃO TOTAL PARA SUPER ADMIN EM USUÁRIOS
DROP POLICY IF EXISTS "Super Admins gerenciam tudo" ON public.users;
CREATE POLICY "Super Admins gerenciam tudo" 
ON public.users FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (role = 'SUPER_ADMIN') -- Fallback para permissão local se o JWT atrasar
);

-- Garante que a RLS de usuários permita a criação (INSERT)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins criam usuários" ON public.users;
CREATE POLICY "Admins criam usuários" 
ON public.users FOR INSERT TO authenticated
WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (role IN ('ADMIN', 'SUPER_ADMIN'))
);
