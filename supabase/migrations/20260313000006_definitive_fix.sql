-- ==========================================
-- CORREÇÃO DEFINITIVA - PROVISIONAMENTO E RLS (V6)
-- ==========================================

-- 1. PREPARAÇÃO DA TABELA DE USUÁRIOS
-- Permite que usuários sejam criados sem ID do Auth (ID temporário gerado pelo banco)
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Remove a restrição que obriga o ID a existir na tabela de autenticação imediatamente
-- Isso é o que permite ao Admin criar o usuário antes dele fazer o primeiro login
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Adiciona a coluna password caso não tenha sido adicionada no passo anterior
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        ALTER TABLE public.users ADD COLUMN password TEXT;
    END IF;
END $$;

-- 2. AJUSTE DE RELACIONAMENTOS (CASCADE UPDATE)
-- Garante que se mudarmos o ID de um usuário, os dados dele (votos, views) acompanhem
ALTER TABLE public.content_views DROP CONSTRAINT IF EXISTS content_views_user_id_fkey;
ALTER TABLE public.content_views ADD CONSTRAINT content_views_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.content_ratings DROP CONSTRAINT IF EXISTS content_ratings_user_id_fkey;
ALTER TABLE public.content_ratings ADD CONSTRAINT content_ratings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. GATILHO DE MERGE (Gênio da Lâmpada 🧙‍♂️)
-- Quando um usuário finalmente logar (Auth), este gatilho transfere os dados do perfil provisório
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Procura se já existe um perfil provisionado (pelo admin) com este e-mail
  SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- MÁGICA: Atualiza o registro existente com o novo ID do Auth
    -- Tudo o que estiver ligado a este usuário (empresa, unidades, etc) será mantido
    UPDATE public.users 
    SET id = NEW.id,
        name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        role = COALESCE(NEW.raw_user_meta_data->>'role', role),
        updated_at = NOW()
    WHERE id = existing_user_id;
  ELSE
    -- Se não existir, cria um novo perfil do zero como antes
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FIM DA RECURSÃO RLS (LIMPEZA TOTAL)
-- Removemos qualquer política que faça SELECT em outras tabelas para evitar loop infinito
DROP POLICY IF EXISTS "Acesso Livre Companhias" ON public.companies;
DROP POLICY IF EXISTS "Admins alteram Companhias" ON public.companies;
DROP POLICY IF EXISTS "Leitura pública de empresas" ON public.companies;
DROP POLICY IF EXISTS "Gestão de empresas por Admins" ON public.companies;

-- Política baseada apenas no JWT (Zero Loop / Performance Máxima)
CREATE POLICY "Leitura pública de empresas" ON public.companies FOR SELECT USING (true);

CREATE POLICY "Gestão de empresas por Admins" 
ON public.companies FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
  OR (auth.jwt() -> 'app_metadata' ->> 'role' IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Política de Usuários (Garante que Super Admin possa ver e editar todos para provisioning)
DROP POLICY IF EXISTS "Autenticados leem Colegas" ON public.users;
DROP POLICY IF EXISTS "Super Admins gerenciam tudo" ON public.users;

CREATE POLICY "Super Admins gerenciam tudo" 
ON public.users FOR ALL TO authenticated
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (auth.jwt() -> 'app_metadata' ->> 'role' = 'SUPER_ADMIN')
  OR (role = 'SUPER_ADMIN')
);

CREATE POLICY "Acesso básico de usuários" 
ON public.users FOR SELECT TO authenticated
USING (true);
