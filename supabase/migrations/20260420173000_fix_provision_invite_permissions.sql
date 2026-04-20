-- Migration: fix_provision_invite_permissions
-- Description: Allow ADMIN to create other ADMINs within the same company.
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
  v_auth_id        uuid;
  v_clean_email    text;
  v_clean_name     text;
  v_clean_role     text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'provision_invite: authenticated session required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
  v_caller_company := public.get_auth_user_company_id();

  IF v_caller_role IS NULL
     OR upper(v_caller_role) NOT IN ('SUPER_ADMIN','MAESTRO','ADMIN') THEN
    RAISE EXCEPTION 'provision_invite: requires ADMIN role or higher'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF target_email IS NULL OR btrim(target_email) = '' THEN
    RAISE EXCEPTION 'provision_invite: email is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF target_name IS NULL OR btrim(target_name) = '' THEN
    RAISE EXCEPTION 'provision_invite: name is required'
      USING ERRCODE = 'check_violation';
  END IF;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'provision_invite: company_id is required'
      USING ERRCODE = 'check_violation';
  END IF;

  v_clean_email := lower(btrim(target_email));
  v_clean_name  := btrim(target_name);
  v_clean_role  := upper(COALESCE(target_role, 'USER'));

  IF v_clean_role NOT IN ('ADMIN','USER') THEN
    RAISE EXCEPTION 'provision_invite: invalid role %', target_role
      USING ERRCODE = 'check_violation';
  END IF;

  -- ADMIN (não-super) pode convidar ADMIN ou USER, mas APENAS na própria company.
  -- Restrição: ADMIN não pode criar SUPER_ADMIN (já garantido pelo check NOT IN acima, 
  -- pois só aceitamos 'ADMIN' ou 'USER').
  IF upper(v_caller_role) = 'ADMIN' THEN
    -- Bloqueia cross-tenant
    IF target_company_id <> v_caller_company THEN
      RAISE EXCEPTION 'provision_invite: cross-tenant provisioning blocked'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Nota: Removida a trava que impedia ADMIN de criar outro ADMIN na mesma company.
  END IF;

  -- Se o e-mail já tem conta no auth.users, atualiza o public.users direto.
  SELECT id INTO v_auth_id FROM auth.users WHERE lower(email) = v_clean_email;

  IF v_auth_id IS NOT NULL THEN
    UPDATE public.users
       SET name       = v_clean_name,
           role       = v_clean_role,
           company_id = target_company_id,
           active     = true,
           deleted_at = NULL,
           updated_at = now()
     WHERE id = v_auth_id;

    RETURN jsonb_build_object(
      'status',  'updated_existing',
      'user_id', v_auth_id
    );
  END IF;

  -- Novo convite (ou atualização de convite pendente).
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
