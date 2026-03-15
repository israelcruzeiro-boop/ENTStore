-- ==========================================
-- CORREÇÃO DE PERMISSÕES DE PERFIL E STORAGE
-- ==========================================

-- 1. PERMISSÃO PARA USUÁRIO ATUALIZAR SEU PRÓPRIO PERFIL
DROP POLICY IF EXISTS "Usuários atualizam próprio perfil" ON public.users;

CREATE POLICY "Usuários atualizam próprio perfil" 
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. AJUSTE DE STORAGE PARA ASSETS (PERMISSÃO DE ATUALIZAÇÃO)
-- Garante que usuários possam atualizar seus próprios avatares
DROP POLICY IF EXISTS "Permitir atualização pelo dono" ON storage.objects;

CREATE POLICY "Permitir atualização pelo dono"
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'assets' AND (auth.uid())::text = owner::text);

-- 3. PERMISSÃO DE INSERÇÃO COM DONO DEFINIDO
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;

CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'assets');
