-- ==========================================
-- CORREÇÃO DE POLÍTICA RLS - COMPANIES (V2 OTIMIZADA)
-- ==========================================

-- 1. Remove políticas antigas
DROP POLICY IF EXISTS "Admins alteram Companhias" ON public.companies;

-- 2. Nova política ultra-resiliente e performática
-- Prioriza JWT claims (em memória) sobre subqueries (acesso a disco)
CREATE POLICY "Admins alteram Companhias" 
ON public.companies 
FOR ALL 
TO authenticated, anon
USING (
  -- Check 1: JWT metadata (Papel SUPER_ADMIN ou ADMIN) - Alta Performance
  (COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') IN ('ADMIN', 'SUPER_ADMIN'))
  OR (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('ADMIN', 'SUPER_ADMIN'))
  
  -- Check 2: Bootstrap/First Access - Verifica se a tabela está vazia (Otimizado com LIMIT 1)
  -- Nota: Isso permite que o primeiro registro seja criado mesmo sem usuários no banco
  OR NOT EXISTS (SELECT 1 FROM public.companies LIMIT 1)
  
  -- Check 3: Fallback para a tabela de usuários (Se o JWT estiver desatualizado)
  OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
)
WITH CHECK (true);
