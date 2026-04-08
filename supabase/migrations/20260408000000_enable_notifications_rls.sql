-- 1. Ativando o RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Permissão de Leitura: Usuários leem as próprias notificações e ADMINs leem da empresa.
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
CREATE POLICY "Users can view notifications" ON public.notifications 
FOR SELECT TO authenticated
USING (
  public.get_auth_user_company_id() = company_id
  AND (
    user_id = (select auth.uid())
    OR public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- 3. Permissão de Inserção: Autenticados podem inserir, se pertencer à empresa
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications" ON public.notifications 
FOR INSERT TO authenticated
WITH CHECK (
  public.get_auth_user_company_id() = company_id
);

-- 4. Permissão de Atualização: Usuários podem atualizar (ex: marcar lida) e ADMIN
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
CREATE POLICY "Users can update notifications" ON public.notifications 
FOR UPDATE TO authenticated
USING (
  public.get_auth_user_company_id() = company_id
  AND (
    user_id = (select auth.uid())
    OR public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  )
);

-- 5. Permissão de Exclusão: Deleção restrita da empresa
DROP POLICY IF EXISTS "Users can delete notifications" ON public.notifications;
CREATE POLICY "Users can delete notifications" ON public.notifications 
FOR DELETE TO authenticated
USING (
  public.get_auth_user_company_id() = company_id
  AND (
    user_id = (select auth.uid())
    OR public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  )
);
