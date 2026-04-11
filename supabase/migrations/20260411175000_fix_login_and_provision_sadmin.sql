-- Correção Crítica de LOGIN: Adicionando coluna deleted_at na tabela companies
-- E provisionamento forçado do Super Admin

DO $$ 
BEGIN 
    -- 1. Garante coluna deleted_at em companies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='companies' AND column_name='deleted_at') THEN
        ALTER TABLE public.companies ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- 2. Provisionamento do Super Admin sadmin@storepage.com
    DECLARE
        v_user_id UUID;
    BEGIN
        SELECT id INTO v_user_id FROM auth.users WHERE email = 'sadmin@storepage.com';

        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.users (id, email, name, role, status, active)
            VALUES (v_user_id, 'sadmin@storepage.com', 'Super Admin', 'SUPER_ADMIN', 'ACTIVE', true)
            ON CONFLICT (id) DO UPDATE 
            SET role = 'SUPER_ADMIN', status = 'ACTIVE', active = true, deleted_at = NULL;
        END IF;
    END;
END $$;
