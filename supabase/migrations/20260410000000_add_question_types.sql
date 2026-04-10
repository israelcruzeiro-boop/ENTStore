-- ==========================================
-- ADICIONA SUPORTE A NOVOS TIPOS DE PERGUNTAS
-- ==========================================

-- 1. Adicionar colunas na tabela de perguntas
ALTER TABLE public.course_phase_questions 
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'MULTIPLE_CHOICE' 
CHECK (question_type IN ('MULTIPLE_CHOICE', 'WORD_SEARCH', 'ORDERING', 'HOTSPOT')),
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Adicionar colunas na tabela de respostas para dados complexos
ALTER TABLE public.course_answers
ADD COLUMN IF NOT EXISTS complex_answer JSONB;

-- 3. Forçar recarregamento da API
NOTIFY pgrst, 'reload schema';
