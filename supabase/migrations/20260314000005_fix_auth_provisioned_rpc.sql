-- 1. Create a SECURITY DEFINER function to safely check for a provisioned user's details before login
-- This is necessary because the `anon` role no longer has SELECT access to `public.users` (RLS removed).
CREATE OR REPLACE FUNCTION public.get_provisioned_user(lookup_email TEXT)
RETURNS jsonb AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT name, role INTO v_user
  FROM public.users
  WHERE email = lookup_email
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('name', v_user.name, 'role', v_user.role);
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execution to anonymous and authenticated users so the frontend can call it during sign-in
GRANT EXECUTE ON FUNCTION public.get_provisioned_user(TEXT) TO anon, authenticated;
