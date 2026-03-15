-- ==========================================
-- CORREÇÃO DEFINITIVA - ACESSO ANÔNIMO PARA ATIVAÇÃO (V7)
-- ==========================================

-- 1. LIBERAÇÃO DE LEITURA PÚBLICA (Resolvendo Erro 406)
-- Permite que o sistema consulte se um e-mail já existe para poder ativar a conta no primeiro login
DROP POLICY IF EXISTS "Acesso básico de usuários" ON public.users;
CREATE POLICY "Leitura anônima para ativação" 
ON public.users 
FOR SELECT 
TO anon, authenticated
USING (true);

-- 2. GARANTIA DE ID PADRÃO
-- Reforço para garantir que a criação manual nunca falhe por ID nulo
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. PERMISSÕES DE TABELA
-- Garante que o PostgREST (API) tenha permissão de ler a tabela
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;

-- 4. RELOAD DE SCHEMA (Opcional, mas ajuda a limpar cache do PostgREST)
NOTIFY pgrst, 'reload schema';
