-- 1. Habilitar INSERT para Super Admins na tabela users
-- A política atual só cobria SELECT/UPDATE/DELETE via USING.
-- Precisamos de uma política explícita para INSERT.

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Super Admins inserem usuários'
    ) THEN
        CREATE POLICY "Super Admins inserem usuários" ON "public"."users" 
        FOR INSERT TO "authenticated" 
        WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- 2. Garantir que a política de gestão geral também cubra INSERT (ajuste de segurança)
-- Caso o banco use políticas simplificadas, esta garante o acesso total.
ALTER POLICY "Super Admins gerenciam tudo" ON "public"."users" 
USING (public.is_super_admin() OR auth.uid() = id)
WITH CHECK (public.is_super_admin() OR auth.uid() = id);

-- 3. Notificação técnica
COMMENT ON TABLE public.users IS 'RLS atualizado em 11/04/2026 para permitir provisionamento integrado por Super Admins.';
