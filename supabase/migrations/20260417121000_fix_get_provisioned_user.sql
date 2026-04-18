-- Migration: Stop leaking the provisioned password from get_provisioned_user.
--
-- Previous behavior (20260411160000_fix_provisioning_security.sql): the RPC
-- returned jsonb_build_object('name', ..., 'role', ..., 'password', ...),
-- which meant any caller (including the anonymous role, since the function
-- is SECURITY DEFINER) could read a user's plaintext provisioned password
-- simply by knowing their e-mail address. This was exploitable via the
-- browser console until the user performed their first login.
--
-- This migration replaces the function body. Signature is preserved:
--   public.get_provisioned_user(lookup_email text) RETURNS jsonb
-- The new payload is intentionally narrow:
--   { "name": "...", "role": "...", "is_provisioned": true }   -- when still provisioned
--   NULL                                                       -- otherwise
--
-- The "is_provisioned" flag uses the same signal the old code used
-- (password IS NOT NULL in public.users), so callers can keep their
-- "is this user still in provisioning state?" check; they just no longer
-- receive the actual secret.

CREATE OR REPLACE FUNCTION public.get_provisioned_user(lookup_email text) RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_user RECORD;
BEGIN
  -- Look up the profile only when it is still in provisioned state.
  -- NOTE: we intentionally DO NOT select the password column — nothing in
  -- this function body is allowed to touch it, even transiently.
  SELECT name, role
    INTO v_user
    FROM public.users
   WHERE email = lookup_email
     AND password IS NOT NULL
   LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'name',            v_user.name,
      'role',            v_user.role,
      'is_provisioned',  true
    );
  END IF;

  RETURN NULL;
END;
$$;

ALTER FUNCTION public.get_provisioned_user(text) OWNER TO postgres;

COMMENT ON FUNCTION public.get_provisioned_user(text) IS
  'Probe RPC used by the login flow to detect whether an e-mail belongs to '
  'a still-provisioned user (password IS NOT NULL in public.users). Returns '
  '{ name, role, is_provisioned: true } or NULL. NEVER returns the password.';
