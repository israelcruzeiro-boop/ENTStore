-- Migration: fix_provision_invite_permissions_v2
-- Description: Hardening security for user provisioning. Prevents self-downgrade and cross-role violations.
-- Date: 2026-04-20

CREATE OR REPLACE FUNCTION public.provision_invite(
  target_email       text,
  target_name        text,
  target_role        text,
  target_company_id  uuid
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_role    text;
  v_caller_company uuid;
  v_target_id      uuid;
  v_target_current_role text;
  v_target_current_company uuid;
  v_clean_email    text;
  v_clean_name     text;
  v_clean_role     text;
BEGIN
  -- 1. Verificação de Sessão
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'provision_invite: authenticated session required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 2. Carrega dados do chamador
  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
  v_caller_company := public.get_auth_user_company_id();

  IF v_caller_role IS NULL
     OR upper(v_caller_role) NOT IN ('SUPER_ADMIN','MAESTRO','ADMIN') THEN
    RAISE EXCEPTION 'provision_invite: requires ADMIN role or higher'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Sanitização e Validação Básica
  IF target_email IS NULL OR btrim(target_email) = '' THEN
    RAISE EXCEPTION 'provision_invite: email is required'
      USING ERRCODE = 'check_violation';
  END IF;
  
  v_clean_email := lower(btrim(target_email));
  v_clean_name  := btrim(target_name);
  v_clean_role  := upper(COALESCE(target_role, 'USER'));

  -- 4. BLOQUEIO DE AUTO-MODIFICAÇÃO (Segurança Crítica)
  -- Descobre o ID do alvo no auth.users
  SELECT id INTO v_target_id FROM auth.users WHERE lower(email) = v_clean_email;

  IF v_target_id = auth.uid() THEN
    RAISE EXCEPTION 'provision_invite: não é permitido alterar sua própria conta através deste fluxo'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 5. Regras de Hierarquia para ADMIN (não-super)
  IF upper(v_caller_role) = 'ADMIN' THEN
    -- Admin só pode convidar para a própria empresa
    IF target_company_id <> v_caller_company THEN
      RAISE EXCEPTION 'provision_invite: cross-tenant provisioning blocked'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Se o usuário alvo já existe, validar o que ele é atualmente
    IF v_target_id IS NOT NULL THEN
       SELECT role, company_id INTO v_target_current_role, v_target_current_company 
       FROM public.users WHERE id = v_target_id;

       -- Admin não pode alterar usuários de outras empresas
       IF v_target_current_company IS NOT NULL AND v_target_current_company <> v_caller_company THEN
          RAISE EXCEPTION 'provision_invite: este usuário já pertence a outra empresa e você não tem permissão para movê-lo'
            USING ERRCODE = 'insufficient_privilege';
       END IF;

       -- Admin não pode alterar dados de outros Admins ou Super Admins
       IF v_target_current_role IS NOT NULL AND upper(v_target_current_role) IN ('ADMIN', 'SUPER_ADMIN', 'MAESTRO') THEN
          RAISE EXCEPTION 'provision_invite: apenas Super Administradores podem alterar contas de nível Administrativo'
            USING ERRCODE = 'insufficient_privilege';
       END IF;
    END IF;
  END IF;

  -- 6. Execução do Update (se usuário já existe)
  IF v_target_id IS NOT NULL THEN
    UPDATE public.users
       SET name       = v_clean_name,
           role       = v_clean_role,
           company_id = target_company_id,
           active     = true,
           deleted_at = NULL,
           updated_at = now()
     WHERE id = v_target_id;

    RETURN jsonb_build_object(
      'status',  'updated_existing',
      'user_id', v_target_id
    );
  END IF;

  -- 7. Execução do Convite (novo ou atualização de pendente)
  INSERT INTO public.provisioned_invites (email, name, role, company_id, created_by)
  VALUES (v_clean_email, v_clean_name, v_clean_role, target_company_id, auth.uid())
  ON CONFLICT (lower(email)) WHERE consumed_at IS NULL
  DO UPDATE SET
    name       = EXCLUDED.name,
    role       = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    created_by = EXCLUDED.created_by;

  RETURN jsonb_build_object(
    'status', 'invited',
    'email',  v_clean_email
  );
END;
$$;
