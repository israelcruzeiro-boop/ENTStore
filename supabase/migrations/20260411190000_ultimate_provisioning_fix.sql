-- ==========================================================
-- ULTIMATE PROVISIONING FIX
-- Objetivo: Garantir que a sincronização entre Auth e Public ocorra via UPDATE (Cascade), 
-- preservando FKs e logs de atividade sem causar erros no login.
-- ==========================================================

-- 1. PREPARAR CASCATA DE ATUALIZAÇÕES (ID)
-- Isso permite atualizar o ID do usuário e propagar para todas as tabelas relacionadas
DO $$ 
BEGIN
    -- Checklist Answers
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'checklist_answers_assigned_user_id_fkey') THEN
        ALTER TABLE public.checklist_answers DROP CONSTRAINT checklist_answers_assigned_user_id_fkey;
    END IF;
    ALTER TABLE public.checklist_answers ADD CONSTRAINT checklist_answers_assigned_user_id_fkey 
        FOREIGN KEY (assigned_user_id) REFERENCES public.users(id) ON UPDATE CASCADE;

    -- Quiz Attempts
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quiz_attempts_user_id_fkey') THEN
        ALTER TABLE public.quiz_attempts DROP CONSTRAINT quiz_attempts_user_id_fkey;
    END IF;
    ALTER TABLE public.quiz_attempts ADD CONSTRAINT quiz_attempts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

    -- Content Views (Métricas)
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_views_user_id_fkey') THEN
        ALTER TABLE public.content_views DROP CONSTRAINT content_views_user_id_fkey;
    END IF;
    ALTER TABLE public.content_views ADD CONSTRAINT content_views_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;
END $$;

-- 2. REFORMULAR O GATILHO handle_new_user (USANDO UPDATE EM VEZ DE DELETE)
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public
    AS $$
DECLARE
  v_provisioned_id UUID;
BEGIN
  -- 1. Tenta localizar o perfil provisionado pelo e-mail
  SELECT id INTO v_provisioned_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF v_provisioned_id IS NOT NULL THEN
    -- MÁGICA: Em vez de apagar, atualizamos o ID existente para o novo ID do Auth
    -- Isso preserva todas as FKs devido ao ON UPDATE CASCADE ajustado acima.
    UPDATE public.users 
    SET 
      id = NEW.id,
      name = COALESCE(NEW.raw_user_meta_data->>'name', name),
      role = COALESCE(NEW.raw_user_meta_data->>'role', role),
      password = NULL, -- Limpeza de segurança
      updated_at = NOW()
    WHERE id = v_provisioned_id;
  ELSE
    -- Caso padrão: Usuário totalmente novo no sistema
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
$$;

-- 3. SCRIPT DE REPARO DOS "USUÁRIOS NO LIMBO"
-- Conserta quem já logou mas o ID da tabela public não bate com o do Auth
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
        UPDATE public.users SET id = r.auth_id, password = NULL WHERE id = r.public_id;
        RAISE NOTICE 'Sincronizado: %', r.email;
    END LOOP;
END $$;

-- 4. ATUALIZAR CACHE DA API
NOTIFY pgrst, 'reload schema';
