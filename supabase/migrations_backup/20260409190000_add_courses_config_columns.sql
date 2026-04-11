-- ==========================================
-- ADICIONAR COLUNAS FALTANTES NA TABELA COURSES
-- passing_score e diploma_template
-- ==========================================

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS diploma_template TEXT DEFAULT 'azul';

-- Forçar recarregamento da API
NOTIFY pgrst, 'reload schema';
