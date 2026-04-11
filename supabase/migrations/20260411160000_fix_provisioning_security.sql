-- 1. Restaurar a coluna password na tabela users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password text;

-- 2. Garantir que a coluna password seja limpa após o primeiro login bem-sucedido
-- Atualizando a função handle_new_user para limpar a senha provisionada
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Procura se já existe um perfil provisionado (pelo admin) com este e-mail
  SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- MÁGICA: Atualiza o registro existente com o novo ID do Auth
    -- E limpa a senha em texto plano (password = NULL) pois agora o usuário está no Auth
    UPDATE public.users 
    SET id = NEW.id,
        name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        role = COALESCE(NEW.raw_user_meta_data->>'role', role),
        password = NULL, -- LIMPEZA DE SEGURANÇA
        updated_at = NOW()
    WHERE id = existing_user_id;
  ELSE
    -- Se não existir, cria um novo perfil do zero
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

-- 3. Atualizar a RPC get_provisioned_user para suportar o fluxo de AuthContext
CREATE OR REPLACE FUNCTION public.get_provisioned_user(lookup_email text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT name, role, password INTO v_user
  FROM public.users
  WHERE email = lookup_email
  AND password IS NOT NULL -- Só retorna se ainda for provisionado
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
        'name', v_user.name, 
        'role', v_user.role,
        'password', v_user.password
    );
  ELSE
    RETURN NULL;
  END IF;
END;
$$;

-- 4. Notificar o Super Admin
COMMENT ON COLUMN public.users.password IS 'Senha temporária para provisionamento. Limpa automaticamente após o primeiro login.';
