-- Adiciona coluna de controle mestre para o módulo de Landing Page
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS landing_page_enabled BOOLEAN DEFAULT TRUE;

-- Opcional: Migrar valores atuais se necessário, mas como acabamos de criar, podemos resetar.
UPDATE public.companies SET landing_page_enabled = landing_page_active;
