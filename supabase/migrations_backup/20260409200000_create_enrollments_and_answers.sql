-- ==========================================
-- CRIAR TABELAS COURSE_ENROLLMENTS E COURSE_ANSWERS
-- (Essas tabelas nunca foram definidas em migração)
-- ==========================================

-- 1. Tabela de Matrículas/Progresso do Curso
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score_percent INTEGER,
  total_correct INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_spent_seconds INTEGER,
  current_module_id UUID,
  current_content_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_enrollment UNIQUE(course_id, user_id)
);

-- 2. Tabela de Respostas do Aluno
CREATE TABLE IF NOT EXISTS public.course_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.course_phase_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.course_question_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_answer UNIQUE(enrollment_id, question_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_answers ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para course_enrollments
-- Usuários podem criar e atualizar sua própria matrícula
DROP POLICY IF EXISTS "Users manage own enrollment" ON public.course_enrollments;
CREATE POLICY "Users manage own enrollment" ON public.course_enrollments
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins podem gerenciar (ver, editar, excluir) matrículas da sua empresa
DROP POLICY IF EXISTS "Admins manage company enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admins view company enrollments" ON public.course_enrollments;
CREATE POLICY "Admins manage company enrollments" ON public.course_enrollments
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND company_id = public.get_auth_user_company_id()
);

-- 5. Políticas RLS para course_answers
-- Usuários podem criar e visualizar suas próprias respostas
DROP POLICY IF EXISTS "Users manage own answers" ON public.course_answers;
CREATE POLICY "Users manage own answers" ON public.course_answers
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments e
    WHERE e.id = course_answers.enrollment_id
    AND e.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.course_enrollments e
    WHERE e.id = course_answers.enrollment_id
    AND e.user_id = auth.uid()
  )
);

-- Admins podem visualizar respostas da sua empresa
DROP POLICY IF EXISTS "Admins view company answers" ON public.course_answers;
CREATE POLICY "Admins view company answers" ON public.course_answers
FOR SELECT TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.course_enrollments e
    WHERE e.id = course_answers.enrollment_id
    AND e.company_id = public.get_auth_user_company_id()
  )
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_user
  ON public.course_enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_company
  ON public.course_enrollments(company_id);
CREATE INDEX IF NOT EXISTS idx_course_answers_enrollment
  ON public.course_answers(enrollment_id);

-- 7. Adicionar colunas faltantes na tabela courses (se ainda não existirem)
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS passing_score INTEGER DEFAULT 70;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS diploma_template TEXT DEFAULT 'azul';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'ALL';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS allowed_user_ids UUID[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS allowed_region_ids UUID[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS allowed_store_ids UUID[];
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS excluded_user_ids UUID[];

-- 8. Forçar recarregamento da API
NOTIFY pgrst, 'reload schema';
