-- 1. Atualizar a constraint de roles na tabela users para aceitar 'MAESTRO'
-- Primeiro removemos a constraint antiga (se existir) e adicionamos a nova
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role = ANY (ARRAY['SUPER_ADMIN'::text, 'MAESTRO'::text, 'ADMIN'::text, 'USER'::text]));

-- 2. Atualizar a função is_super_admin para reconhecer ambos os cargos
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

-- 3. Atualizar a função is_admin para reconhecer ambos os cargos
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

-- 4. Garantir que a política de RLS use as funções atualizadas
-- (Isso já acontece automaticamente pois as funções foram sobrescritas)

-- 5. Comentário de auditoria
COMMENT ON FUNCTION public.is_super_admin() IS 'Reconhece SUPER_ADMIN e MAESTRO como administradores da plataforma.';
