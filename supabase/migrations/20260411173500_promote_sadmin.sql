-- Migração Robusta para Provisionar Super Admin
-- Garante que o usuário exista na tabela pública e tenha as permissões corretas

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Tenta obter o ID do usuário diretamente do Auth do Supabase
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'sadmin@storepage.com';

    IF v_user_id IS NOT NULL THEN
        -- 2. Tenta inserir na tabela pública caso o trigger tenha falhado ou não exista
        INSERT INTO public.users (id, email, name, role, status, active)
        VALUES (
            v_user_id, 
            'sadmin@storepage.com', 
            'Super Admin', 
            'SUPER_ADMIN', 
            'ACTIVE', 
            true
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            role = 'SUPER_ADMIN',
            status = 'ACTIVE',
            active = true,
            deleted_at = NULL; -- Garante que não foi deletado logicamente
            
        RAISE NOTICE 'Usuário sadmin@storepage.com provisionado como SUPER_ADMIN com sucesso.';
    ELSE
        RAISE WARNING 'Usuário sadmin@storepage.com não encontrado no esquema Auth. Por favor, crie o usuário no dashboard primeiro.';
    END IF;
END $$;
