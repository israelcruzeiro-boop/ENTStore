-- Fix for infinite recursion (Error 42P17) on the users table policies

-- 1. Create helper functions with SECURITY DEFINER
-- This bypasses RLS during the check, preventing the infinite loop.
CREATE OR REPLACE FUNCTION public.get_auth_user_company_id()
RETURNS uuid AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.users WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the policy that caused infinite recursion
DROP POLICY IF EXISTS "Admins gerenciam usuarios da mesma empresa" ON public.users;

-- 3. Recreate the policy using the safe helper functions
CREATE POLICY "Admins gerenciam usuarios da mesma empresa" 
ON public.users 
FOR ALL 
TO authenticated
USING (
  public.get_auth_user_role() = 'ADMIN' 
  AND public.get_auth_user_company_id() = company_id
);
