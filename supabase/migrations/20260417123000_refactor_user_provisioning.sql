-- Migration: Refactor user provisioning — drop the "id-swap magic" in
-- handle_new_user and move pre-sign-up metadata into a dedicated invites
-- table. Also hardens FKs that were carrying ON UPDATE CASCADE only to
-- support that id-swap.
--
-- Background (see 20260411170000 and 20260411190000): the previous trigger
-- reconciled auth.users.id ↔ public.users.id by UPDATE'ing the id on an
-- existing pre-provisioned row and cascading through FKs. That worked but
-- tied tenant schema to a brittle reconciliation step. This migration:
--
--   1. Creates public.provisioned_invites to hold pre-signUp metadata.
--   2. Migrates any existing pre-provisioned rows from public.users
--      (password IS NOT NULL AND id NOT IN auth.users) into the new table
--      and removes them from public.users.
--   3. Rewrites handle_new_user to INSERT directly with id = NEW.id by
--      pulling metadata from the invite. No more UPDATE id.
--   4. Rewrites get_provisioned_user to read from invites. Signature
--      unchanged — frontend keeps calling it the same way. Payload remains
--      { name, role, is_provisioned: true } (compat with the fix from
--      20260417121000).
--   5. Adds RPC provision_invite — single server-side entry point for
--      super admin / admin to create admins or users. Enforces role and
--      tenant rules server-side; frontend no longer inserts into
--      public.users directly.
--   6. Drops ON UPDATE CASCADE from the 4 FKs that only existed for the
--      id-swap. Switches ON DELETE CASCADE to ON DELETE SET NULL on the
--      audit-bearing tables (quiz_attempts, content_views, content_ratings)
--      so deleting a user no longer destroys their historical metrics.
--   7. Clears public.users.password and revokes column-level access to
--      anon/authenticated. Column is NOT dropped on purpose — a previous
--      attempt to drop it caused access issues; dropping is scheduled for
--      a later migration once everything is stable.

----------------------------------------------------------------
-- 1. provisioned_invites
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provisioned_invites (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL,
  name              text NOT NULL,
  role              text NOT NULL CHECK (role IN ('ADMIN','USER')),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  consumed_at       timestamptz,
  consumed_user_id  uuid REFERENCES public.users(id) ON DELETE SET NULL
);

-- Only one pending invite per e-mail at a time; consumed rows stay as
-- audit log and don't block a re-invite after the original was consumed.
CREATE UNIQUE INDEX IF NOT EXISTS provisioned_invites_email_pending_uidx
  ON public.provisioned_invites (lower(email))
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS provisioned_invites_email_idx
  ON public.provisioned_invites (lower(email));

CREATE INDEX IF NOT EXISTS provisioned_invites_company_idx
  ON public.provisioned_invites (company_id);

COMMENT ON TABLE public.provisioned_invites IS
  'Convites de usuário criados pelo super admin/admin antes do signUp. '
  'Consumidos no primeiro signUp via trigger handle_new_user.';

----------------------------------------------------------------
-- 2. RLS on provisioned_invites
----------------------------------------------------------------
ALTER TABLE public.provisioned_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: super admins veem tudo; admins veem só da própria company.
CREATE POLICY "Super admin lê todos convites"
  ON public.provisioned_invites
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "Admin lê convites da própria company"
  ON public.provisioned_invites
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    AND company_id = public.get_auth_user_company_id()
  );

-- INSERT/UPDATE/DELETE: apenas via RPC SECURITY DEFINER. Nenhuma
-- policy para authenticated aqui, então escritas diretas pelo PostgREST
-- são rejeitadas — exatamente o comportamento desejado.

----------------------------------------------------------------
-- 3. Data migration: move pre-provisioned rows to the new table.
--    Safe to re-run: DELETE só dispara depois do INSERT bem-sucedido.
----------------------------------------------------------------
DO $$
DECLARE
  v_migrated int;
BEGIN
  INSERT INTO public.provisioned_invites (email, name, role, company_id, created_at)
  SELECT lower(u.email),
         COALESCE(u.name, 'Usuário'),
         CASE WHEN upper(COALESCE(u.role,'USER')) IN ('ADMIN','USER') THEN upper(u.role) ELSE 'USER' END,
         u.company_id,
         COALESCE(u.created_at, now())
    FROM public.users u
   WHERE u.password IS NOT NULL
     AND u.company_id IS NOT NULL
     AND u.id NOT IN (SELECT id FROM auth.users)
     AND lower(u.email) NOT IN (
       SELECT lower(email) FROM public.provisioned_invites WHERE consumed_at IS NULL
     );

  GET DIAGNOSTICS v_migrated = ROW_COUNT;
  RAISE NOTICE 'provisioned_invites: migrated % row(s) from public.users', v_migrated;

  DELETE FROM public.users
   WHERE password IS NOT NULL
     AND id NOT IN (SELECT id FROM auth.users);
END $$;

----------------------------------------------------------------
-- 4. handle_new_user — insert with NEW.id; no more UPDATE id magic.
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT id, name, role, company_id
    INTO v_invite
    FROM public.provisioned_invites
   WHERE lower(email) = lower(NEW.email)
     AND consumed_at IS NULL
   LIMIT 1;

  IF FOUND THEN
    -- Convite pendente: cria public.users já com id = auth.users.id.
    INSERT INTO public.users (
      id, name, email, role, company_id, active, first_access, created_at, updated_at
    ) VALUES (
      NEW.id,
      v_invite.name,
      NEW.email,
      v_invite.role,
      v_invite.company_id,
      true,
      (v_invite.role = 'USER'),
      now(), now()
    );

    UPDATE public.provisioned_invites
       SET consumed_at = now(),
           consumed_user_id = NEW.id
     WHERE id = v_invite.id;
  ELSE
    -- Sem convite: auto-signUp (signUp direto pela tela, sem pré-cadastro).
    INSERT INTO public.users (
      id, name, email, role, active, created_at, updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
      true,
      now(), now()
    );
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Cria public.users com id = auth.users.id ao fim do signUp. Se houver '
  'convite pendente em provisioned_invites para o e-mail, copia nome/role/'
  'company_id e marca o convite como consumido. Caso contrário, cria um '
  'perfil USER genérico.';

----------------------------------------------------------------
-- 5. get_provisioned_user — lê da tabela de convites.
--    Assinatura e payload preservados (compat com AuthContext).
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_provisioned_user(lookup_email text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT name, role
    INTO v
    FROM public.provisioned_invites
   WHERE lower(email) = lower(lookup_email)
     AND consumed_at IS NULL
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'name',           v.name,
      'role',           v.role,
      'is_provisioned', true
    );
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.get_provisioned_user(text) OWNER TO postgres;

COMMENT ON FUNCTION public.get_provisioned_user(text) IS
  'Probe usada no login para detectar e-mails com convite pendente em '
  'provisioned_invites. Retorna { name, role, is_provisioned: true } ou '
  'NULL. Nunca devolve a senha.';

----------------------------------------------------------------
-- 6. provision_invite — RPC unificada para criar convites.
--    Enforcement de role/tenant server-side. Único write path legítimo
--    para provisioned_invites a partir de clients authenticated.
----------------------------------------------------------------
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

  -- ADMIN (não-super) só pode convidar USER na própria company.
  IF upper(v_caller_role) = 'ADMIN' THEN
    IF v_clean_role <> 'USER' THEN
      RAISE EXCEPTION 'provision_invite: ADMIN pode convidar apenas USER'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF target_company_id <> v_caller_company THEN
      RAISE EXCEPTION 'provision_invite: cross-tenant provisioning blocked'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Se o e-mail já tem conta no auth.users, atualiza o public.users direto
  -- (cenário de re-atribuição — ex. promover USER a ADMIN).
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

ALTER FUNCTION public.provision_invite(text,text,text,uuid) OWNER TO postgres;
REVOKE ALL  ON FUNCTION public.provision_invite(text,text,text,uuid) FROM PUBLIC;
REVOKE ALL  ON FUNCTION public.provision_invite(text,text,text,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.provision_invite(text,text,text,uuid) TO authenticated;

COMMENT ON FUNCTION public.provision_invite(text,text,text,uuid) IS
  'Convida um usuário (ADMIN ou USER). Super admins convidam em qualquer '
  'company; admins convidam apenas USER na própria company. Se o e-mail já '
  'tem conta no auth.users, atualiza o perfil existente (promoção/troca de '
  'tenant). Senha não trafega por aqui — é definida pelo usuário no primeiro '
  'login via supabase.auth.signUp.';

----------------------------------------------------------------
-- 7. FK cleanup — drop ON UPDATE CASCADE, trocar ON DELETE CASCADE
--    por ON DELETE SET NULL nas tabelas de auditoria/métrica.
----------------------------------------------------------------

-- 7a. checklist_answers.assigned_user_id — já era nullable (atribuição
--     de plano de ação é opcional). Só troca a ação on delete.
ALTER TABLE public.checklist_answers
  DROP CONSTRAINT IF EXISTS checklist_answers_assigned_user_id_fkey;
ALTER TABLE public.checklist_answers
  ADD  CONSTRAINT checklist_answers_assigned_user_id_fkey
    FOREIGN KEY (assigned_user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

-- 7b. content_views.user_id — torna nullable, ON DELETE SET NULL para
--     preservar as métricas mesmo após exclusão do autor.
ALTER TABLE public.content_views
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.content_views
  DROP CONSTRAINT IF EXISTS content_views_user_id_fkey;
ALTER TABLE public.content_views
  ADD  CONSTRAINT content_views_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

-- 7c. content_ratings.user_id — idem content_views.
ALTER TABLE public.content_ratings
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.content_ratings
  DROP CONSTRAINT IF EXISTS content_ratings_user_id_fkey;
ALTER TABLE public.content_ratings
  ADD  CONSTRAINT content_ratings_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

-- 7d. quiz_attempts.user_id — preserva tentativas históricas.
ALTER TABLE public.quiz_attempts
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_user_id_fkey;
ALTER TABLE public.quiz_attempts
  ADD  CONSTRAINT quiz_attempts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.users(id)
    ON DELETE SET NULL;

----------------------------------------------------------------
-- 8. public.users.password — zera valores e revoga acesso. Não dropa:
--    uma tentativa anterior de drop causou problemas de acesso, então
--    deixamos a coluna morta no schema e removemos em migration futura.
----------------------------------------------------------------
UPDATE public.users SET password = NULL WHERE password IS NOT NULL;

REVOKE ALL (password) ON TABLE public.users FROM anon;
REVOKE ALL (password) ON TABLE public.users FROM authenticated;

COMMENT ON COLUMN public.users.password IS
  'DEPRECATED — não usar. Provisionamento migrou para public.provisioned_invites. '
  'Coluna mantida temporariamente; será removida em migration futura.';

----------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
----------------------------------------------------------------
-- End of migration.
----------------------------------------------------------------
