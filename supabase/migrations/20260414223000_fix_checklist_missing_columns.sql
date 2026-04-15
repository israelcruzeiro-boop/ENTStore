-- ============================================================================
-- MIGRATION: Corrigir colunas faltantes nas tabelas do módulo de Checklists
-- Problema: order_index e deleted_at podem não existir em algumas tabelas
-- ============================================================================

-- 1. CHECKLIST_FOLDERS
ALTER TABLE public.checklist_folders ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.checklist_folders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.checklist_folders ADD COLUMN IF NOT EXISTS color text;

-- 2. CHECKLIST_SECTIONS
ALTER TABLE public.checklist_sections ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.checklist_sections ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.checklist_sections ADD COLUMN IF NOT EXISTS description text;

-- 3. CHECKLIST_QUESTIONS  
ALTER TABLE public.checklist_questions ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;
ALTER TABLE public.checklist_questions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.checklist_questions ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.checklist_questions ADD COLUMN IF NOT EXISTS config jsonb DEFAULT '{}'::jsonb;

-- 4. CHECKLISTS (tabela principal)
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS folder_id uuid;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS access_type text DEFAULT 'ALL';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS allowed_user_ids uuid[] DEFAULT '{}';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS allowed_region_ids uuid[] DEFAULT '{}';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS allowed_store_ids uuid[] DEFAULT '{}';
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS excluded_user_ids uuid[] DEFAULT '{}';

-- 5. CHECKLIST_SUBMISSIONS
ALTER TABLE public.checklist_submissions ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 6. CHECKLIST_ANSWERS
ALTER TABLE public.checklist_answers ADD COLUMN IF NOT EXISTS action_plan_created_by uuid;
ALTER TABLE public.checklist_answers ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Adicionar constraint unique para upsert de respostas (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'checklist_answers_submission_question_unique'
  ) THEN
    ALTER TABLE public.checklist_answers 
    ADD CONSTRAINT checklist_answers_submission_question_unique 
    UNIQUE (submission_id, question_id);
  END IF;
END $$;

-- ============================================================================
-- INDEXES para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_checklist_folders_company_id ON public.checklist_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_checklist_folders_deleted_at ON public.checklist_folders(deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklist_sections_checklist_id ON public.checklist_sections(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_sections_deleted_at ON public.checklist_sections(deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklist_questions_checklist_id ON public.checklist_questions(checklist_id);
CREATE INDEX IF NOT EXISTS idx_checklist_questions_section_id ON public.checklist_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_checklist_questions_deleted_at ON public.checklist_questions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklists_company_id ON public.checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_checklists_deleted_at ON public.checklists(deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklists_folder_id ON public.checklists(folder_id);

-- ============================================================================
-- Forçar atualização do schema cache do PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';
