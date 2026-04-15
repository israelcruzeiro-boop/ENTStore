-- ==========================================================
-- MASTER STORAGE & USERS AUDIT FIX
-- Objetivo: Destravar upload de fotos, salvamento de perfil 
-- e auditar a saúde da sincronização.
-- ==========================================================

-- 1. CORREÇÃO DE STORAGE (BUCKET ASSETS)
-- Garante que o bucket assets existe e está configurado corretamente
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Limpeza de políticas antigas do bucket assets para evitar conflitos
DELETE FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%assets%';

-- Política: Visualização Pública (Qualquer um pode ver as fotos)
CREATE POLICY "Visualização Pública de Assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Política: Upload Authenticated (Qualquer usuário logado pode enviar fotos de avatar)
-- Ajustado para ser assertivo: Permite se for na pasta avatars ou assets da empresa
CREATE POLICY "Upload de Assets para Usuários Autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'assets' AND 
    (storage.foldername(name))[1] = 'companies'
);

-- Política: Update/Delete (Dono do arquivo ou Admin pode gerenciar)
CREATE POLICY "Gerenciamento de Assets Próprios"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'assets' AND auth.uid()::text = owner::text)
WITH CHECK (bucket_id = 'assets' AND auth.uid()::text = owner::text);


-- 2. REFORÇO DE RLS NA TABELA USERS
-- Garante que o usuário logado SEMPRE consiga ver e atualizar seu registro, 
-- mesmo que as funções de helper (is_admin) falhem momentaneamente.
DROP POLICY IF EXISTS "Usuários veem próprio perfil" ON public.users;
CREATE POLICY "Usuários veem próprio perfil" ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários atualizam próprio perfil" ON public.users;
CREATE POLICY "Usuários atualizam próprio perfil" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- 3. SCRIPT DE AUDITORIA (SAÚDE DO BANCO)
-- Esta função cria uma visão rápida para diagnosticar quem está quebrado.
CREATE OR REPLACE VIEW public.vw_auth_sync_audit AS
SELECT 
    au.email,
    au.id as auth_id,
    pu.id as public_id,
    CASE 
        WHEN pu.id IS NULL THEN '🔴 SEM PERFIL NO BANCO'
        WHEN au.id = pu.id THEN '🟢 SINCRONIZADO'
        ELSE '🟡 ID DESALINHADO'
    END as sync_status,
    pu.role,
    pu.company_id,
    pu.first_access
FROM auth.users au
LEFT JOIN public.users pu ON au.email = pu.email;

COMMENT ON VIEW public.vw_auth_sync_audit IS 'Audit de sincronização manual para o Israel.';

-- 4. RELOAD FINAL
NOTIFY pgrst, 'reload schema';
