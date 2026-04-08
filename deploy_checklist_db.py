import requests
import json

TOKEN = "sbp_8211c8d35ba2bd8519cd7f4ae7767f9918799051"
REF = "rmvfegihpkogdvwmmvpj"

sql = """
-- ==========================================
-- 1. ADIÇÃO DE FLAG GLOBAL NA EMPRESA
-- ==========================================
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS checklists_enabled BOOLEAN DEFAULT FALSE;

-- ==========================================
-- 2. TABELA DE DEFINIÇÃO DE CHECKLISTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    access_type TEXT DEFAULT 'ALL' CHECK (access_type IN ('ALL', 'RESTRICTED')),
    allowed_user_ids UUID[] DEFAULT '{}',
    allowed_region_ids UUID[] DEFAULT '{}',
    allowed_store_ids UUID[] DEFAULT '{}',
    excluded_user_ids UUID[] DEFAULT '{}',
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 3. TABELA DE PERGUNTAS DO CHECKLIST
-- ==========================================
CREATE TABLE IF NOT EXISTS public.checklist_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('COMPLIANCE', 'DATE', 'TIME', 'NUMBER', 'TEXT')),
    required BOOLEAN DEFAULT TRUE,
    order_index INT DEFAULT 0,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 4. TABELA DE SUBMISSÕES (INSTÂNCIAS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.checklist_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    org_unit_id UUID REFERENCES public.org_units(id), 
    status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 5. TABELA DE RESPOSTAS INDIVIDUAIS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.checklist_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.checklist_submissions(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.checklist_questions(id) ON DELETE CASCADE,
    value TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(submission_id, question_id) 
);

-- ==========================================
-- 6. SEGURANÇA (RLS)
-- ==========================================

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_answers ENABLE ROW LEVEL SECURITY;

-- Políticas para Checklists (Leitura)
DO $$ BEGIN 
    CREATE POLICY "Checklists visible to correct users" ON public.checklists
        FOR SELECT USING (
            auth.uid() IN (
                SELECT u.id FROM public.users u 
                WHERE u.company_id = checklists.company_id 
                AND (u.role IN ('SUPER_ADMIN', 'ADMIN') OR checklists.status = 'ACTIVE')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Políticas para Perguntas
DO $$ BEGIN 
    CREATE POLICY "Questions visible if checklist is visible" ON public.checklist_questions
        FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.checklists c WHERE c.id = checklist_id)
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Políticas para Submissões (Dono e Admins)
DO $$ BEGIN 
    CREATE POLICY "Users can manage their own submissions" ON public.checklist_submissions
        FOR ALL USING (
            auth.uid() = user_id OR 
            EXISTS (
                SELECT 1 FROM public.users u 
                WHERE u.id = auth.uid() AND u.role IN ('SUPER_ADMIN', 'ADMIN') AND u.company_id = checklist_submissions.company_id
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Políticas para Respostas
DO $$ BEGIN 
    CREATE POLICY "Users can manage answers of their submissions" ON public.checklist_answers
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.checklist_submissions s 
                WHERE s.id = submission_id AND (
                    s.user_id = auth.uid() OR 
                    EXISTS (
                        SELECT 1 FROM public.users u 
                        WHERE u.id = auth.uid() AND u.role IN ('SUPER_ADMIN', 'ADMIN') AND u.company_id = s.company_id
                    )
                )
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- 7. FUNÇÃO DE UPDATED_AT (CASO NÃO EXISTA)
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 8. TRIGGERS DE UPDATED_AT
-- ==========================================

DROP TRIGGER IF EXISTS set_checklists_updated_at ON public.checklists;
CREATE TRIGGER set_checklists_updated_at BEFORE UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_checklist_questions_updated_at ON public.checklist_questions;
CREATE TRIGGER set_checklist_questions_updated_at BEFORE UPDATE ON public.checklist_questions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_checklist_submissions_updated_at ON public.checklist_submissions;
CREATE TRIGGER set_checklist_submissions_updated_at BEFORE UPDATE ON public.checklist_submissions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS set_checklist_answers_updated_at ON public.checklist_answers;
CREATE TRIGGER set_checklist_answers_updated_at BEFORE UPDATE ON public.checklist_answers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
"""

url = f"https://api.supabase.com/v1/projects/{REF}/database/query"
headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

data = {
    "query": sql
}

response = requests.post(url, headers=headers, json=data)
print(f"Status: {response.status_code}")
if response.status_code != 201:
    print(f"Error: {response.text}")
else:
    print("Sucesso! Infraestrutura de banco de dados implantada.")
