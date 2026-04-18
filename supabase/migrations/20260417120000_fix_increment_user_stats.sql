-- Migration: Harden increment_user_stats against cross-tenant abuse.
--
-- Previous behavior (20260411140000_prod_baseline.sql): the function was
-- SECURITY DEFINER and updated public.users purely by user_id_param, with
-- no identity or tenant check. Any authenticated client could call:
--   supabase.rpc('increment_user_stats', {
--     user_id_param: '<victim-uuid>', xp_to_add: 999999, coins_to_add: 999999
--   });
-- and tamper with users in other companies, bypassing RLS.
--
-- This migration replaces the function body while preserving its signature
-- (uuid, integer, integer) -> void and its SECURITY DEFINER model. It now:
--   (a) requires an authenticated session (auth.uid() IS NOT NULL);
--   (b) loads the caller's company_id via get_auth_user_company_id();
--   (c) updates only when user_id_param belongs to the same company;
--   (d) otherwise raises SQLSTATE 42501 (insufficient_privilege).

CREATE OR REPLACE FUNCTION public.increment_user_stats(
    user_id_param uuid,
    xp_to_add     integer,
    coins_to_add  integer
) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id         uuid := auth.uid();
  v_caller_company_id uuid;
  v_target_company_id uuid;
BEGIN
  -- (a) Must be an authenticated session. Blocks anon / service calls
  --     that omit a JWT and makes the checks below meaningful.
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'increment_user_stats: authenticated session required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (b) Resolve the caller's tenant using the existing helper
  --     (already SECURITY DEFINER, validates auth.uid() internally).
  v_caller_company_id := public.get_auth_user_company_id();

  IF v_caller_company_id IS NULL THEN
    RAISE EXCEPTION 'increment_user_stats: caller has no company assignment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (c) Resolve the target user's tenant. Because this function is
  --     SECURITY DEFINER, the SELECT bypasses RLS on purpose so we can
  --     compare tenants before deciding to update.
  SELECT company_id
    INTO v_target_company_id
    FROM public.users
   WHERE id = user_id_param;

  IF v_target_company_id IS NULL THEN
    -- Either the user does not exist or has no tenant. Either way,
    -- refuse rather than mutating an orphan row.
    RAISE EXCEPTION 'increment_user_stats: target user not found or has no company'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- (d) Reject cross-tenant calls.
  IF v_target_company_id <> v_caller_company_id THEN
    RAISE EXCEPTION 'increment_user_stats: cross-tenant modification is not allowed'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- All checks passed: apply the increment.
  UPDATE public.users
     SET xp_total    = COALESCE(xp_total, 0)    + xp_to_add,
         coins_total = COALESCE(coins_total, 0) + coins_to_add,
         updated_at  = NOW()
   WHERE id = user_id_param;
END;
$$;

-- Preserve ownership to match the baseline. GRANTs from prior migrations
-- are retained by CREATE OR REPLACE and remain safe: the auth.uid() check
-- above rejects the anon role at runtime.
ALTER FUNCTION public.increment_user_stats(uuid, integer, integer) OWNER TO postgres;

COMMENT ON FUNCTION public.increment_user_stats(uuid, integer, integer) IS
  'Increments xp_total / coins_total of a user. Enforces tenant isolation: '
  'the caller must be authenticated and share company_id with the target user, '
  'otherwise raises insufficient_privilege (SQLSTATE 42501).';
