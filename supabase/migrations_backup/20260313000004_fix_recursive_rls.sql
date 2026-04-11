-- ==========================================
-- CORREÇÃO FINAL - REMOÇÃO DE RECURSÃO INFINITA RLS
-- ==========================================

-- 1. Limpeza total de políticas na tabela companies
-- Remover TODAS as políticas para garantir que não haja sobreposição
DROP POLICY IF EXISTS "Acesso Livre Companhias" ON public.companies;
DROP POLICY IF EXISTS "Admins alteram Companhias" ON public.companies;
DROP POLICY IF EXISTS "Empresas são públicas" ON public.companies;

-- 2. Habilitar RLS (Caso não esteja)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 3. Política de SELECT (Pública)
-- Qualquer um (até anônimo) pode ver a lista de empresas (necessário para o login do tenant)
CREATE POLICY "Leitura pública de empresas" 
ON public.companies 
FOR SELECT 
USING (true);

-- 4. Política de Gerenciamento (Super Admins e Admins)
-- FOCO: Remover qualquer subquery SELECT 1 FROM companies que cause recursion
CREATE POLICY "Gestão de empresas por Admins" 
ON public.companies 
FOR ALL 
TO authenticated
USING (
  -- 4.1 Check via JWT (Ultra Rápido e Sem Recursão)
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  
  -- 4.2 Check via tabela de usuários (Sem recursão, pois users não aponta para companies na sua política de SELECT)
  OR EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- 5. Política para tabela de usuários (Garantir que Super Admin possa tudo)
DROP POLICY IF EXISTS "Super Admins gerenciam tudo" ON public.users;
CREATE POLICY "Super Admins gerenciam tudo" 
ON public.users 
FOR ALL 
TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (role = 'SUPER_ADMIN')
);

-- 6. Garantir que políticas padrão de usuários não quebrem
-- (Manter as básicas que já existem ou recriar se necessário)
-- CREATE POLICY "Usuários veem a si mesmos" ON public.users FOR SELECT USING (auth.uid() = id);
