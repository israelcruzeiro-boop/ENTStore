-- 1. Melhorar o gatilho handle_new_user para ser resiliente a erros de Chave Primária
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
    -- Se o ID for diferente (comum no primeiro login), transferimos os dados
    -- Removemos o registro antigo COM CUIDADO (o usuário ainda não tem dados em outras tabelas nesta fase)
    DELETE FROM public.users WHERE id = provisioned_id;
    
    -- Inserimos o novo registro com o ID oficial do Auth, preservando os dados provisionados
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

-- 2. SCRIPT DE REPARO: Corrigir os usuários atuais que já estão em 'auth.users' mas com ID diferente em 'public.users'
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
        RAISE NOTICE 'Reparando usuário: %', r.email;
        
        -- Movemos o registro no public.users para o ID correto do Auth
        -- Fazemos via DELETE/INSERT para evitar conflitos de FK (assumindo que são usuários novos sem dados complexos ainda)
        -- Se houver dados em tabelas vinculadas, eles seriam perdidos sem CASCADE.
        -- Como são usuários de teste (visto no print), o DELETE/INSERT é o mais seguro.
        
        BEGIN
            -- 1. Salva os dados atuais
            CREATE TEMPORARY TABLE IF NOT EXISTS temp_user_repair AS SELECT * FROM public.users WHERE id = r.public_id;
            
            -- 2. Remove o registro órfão
            DELETE FROM public.users WHERE id = r.public_id;
            
            -- 3. Insere com o ID correto
            INSERT INTO public.users (id, name, email, role, active, company_id, created_at, updated_at, password)
            SELECT r.auth_id, name, email, role, active, company_id, created_at, updated_at, NULL
            FROM temp_user_repair;
            
            DROP TABLE temp_user_repair;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Falha ao reparar usuário %: %', r.email, SQLERRM;
        END;
    END LOOP;
END $$;
