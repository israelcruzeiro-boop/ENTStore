-- Fix RLS Leak from anonymous policy
DROP POLICY IF EXISTS "Leitura anônima para ativação" ON public.users;

-- Create secure RPC function for email checkout during activation
CREATE OR REPLACE FUNCTION public.check_user_email_exists(lookup_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE email = lookup_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix Admin access to manage users within the same company
DROP POLICY IF EXISTS "Admins gerenciam usuarios da mesma empresa" ON public.users;
CREATE POLICY "Admins gerenciam usuarios da mesma empresa" 
ON public.users FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users admin_user
    WHERE admin_user.id = auth.uid()
    AND admin_user.role = 'ADMIN'
    AND admin_user.company_id = public.users.company_id
  )
);
