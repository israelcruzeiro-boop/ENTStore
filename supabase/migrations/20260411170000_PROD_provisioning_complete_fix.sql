-- ==========================================================
-- PROD_provisioning_complete_fix.sql
-- Objetivo: Consolidar todas as correções de provisionamento e roles em Produção.
-- Data: 11/04/2026
-- ==========================================================

-- 1. ADICIONAR COLUNA PASSWORD (Se não existir)
-- Isso permite o provisionamento de administradores sem convite inicial.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
        COMMENT ON COLUMN public.users.password IS 'Senha temporária para provisionamento. Limpa automaticamente no primeiro login.';
    END IF;
END $$;

-- 2. UNIFICAR ROLES (MAESTRO / SUPER_ADMIN)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['SUPER_ADMIN'::text, 'MAESTRO'::text, 'ADMIN'::text, 'USER'::text]));

-- Função is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('SUPER_ADMIN', 'MAESTRO')
  );
END;
$$;

-- Função is_admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN', 'MAESTRO')
  );
END;
$$;

-- 3. PERMISSÕES RLS (INSERT)
-- Garante que Super Admins/Maestros possam inserir administradores na tabela users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Super Admins inserem usuários') THEN
        CREATE POLICY "Super Admins inserem usuários" ON "public"."users" 
        FOR INSERT TO "authenticated" 
        WITH CHECK (public.is_super_admin());
    END IF;
END $$;

-- Garante que a política de gestão geral cubra INSERT (ajuste de segurança)
ALTER POLICY "Super Admins gerenciam tudo" ON "public"."users" 
USING (public.is_super_admin() OR auth.uid() = id)
WITH CHECK (public.is_super_admin() OR auth.uid() = id);

-- 4. GATILHO DE SINCRONIZAÇÃO E SEGURANÇA (handle_new_user)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  provisioned_id UUID;
  provisioned_comp_id UUID;
  provisioned_role TEXT;
  provisioned_name TEXT;
BEGIN
  -- Busca os dados do usuário provisionado pelo e-mail
  SELECT id, company_id, role, name 
  INTO provisioned_id, provisioned_comp_id, provisioned_role, provisioned_name 
  FROM public.users 
  WHERE email = NEW.email 
  LIMIT 1;

  IF provisioned_id IS NOT NULL AND provisioned_id != NEW.id THEN
    -- MÁGICA: Se o ID for diferente, transferimos os dados do registro antigo para o novo ID do Auth
    DELETE FROM public.users WHERE id = provisioned_id;
    
    INSERT INTO public.users (id, name, email, role, company_id, active, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', provisioned_name), 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', provisioned_role),
      provisioned_comp_id,
      true,
      NOW(),
      NOW()
    );
  ELSIF provisioned_id IS NULL THEN
    -- Caso padrão (usuário novo não provisionado)
    INSERT INTO public.users (id, name, email, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
      NOW(),
      NOW()
    );
  END IF;

  -- Limpeza da senha em texto plano (Segurança)
  UPDATE public.users SET password = NULL WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- 5. SCRIPT DE REPARO AUTO-EXECUTÁVEL EM PRODUÇÃO
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT au.id as auth_id, pu.id as public_id, pu.email 
        FROM auth.users au
        JOIN public.users pu ON au.email = pu.email
        WHERE au.id != pu.id
    LOOP
        BEGIN
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_user_repair_prod AS SELECT * FROM public.users WHERE id = r.public_id;
            DELETE FROM public.users WHERE id = r.public_id;
            INSERT INTO public.users (id, name, email, role, active, company_id, created_at, updated_at, password)
            SELECT r.auth_id, name, email, role, active, company_id, created_at, updated_at, NULL
            FROM temp_user_repair_prod;
            DROP TABLE temp_user_repair_prod;
            RAISE NOTICE 'Reparado em PROD: %', r.email;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Falha ao reparar usuário em PROD %: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;

-- 6. ATUALIZAÇÃO DO POSTGREST (Reload Cache)
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.handle_new_user() IS 'Gerencia provisionamento e limpeza de senhas em PROD.';
