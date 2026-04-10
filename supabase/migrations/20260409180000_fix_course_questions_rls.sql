-- ==========================================
-- CORRIGIR RLS PARA TABELAS DE PERGUNTAS DE CURSOS
-- Segue o mesmo padrão de course_modules e course_contents
-- ==========================================

-- 1. Habilitar RLS (seguro fazer IF NOT EXISTS)
ALTER TABLE public.course_phase_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_question_options ENABLE ROW LEVEL SECURITY;

-- 2. Adicionar company_id na tabela course_modules (se ausente)
-- (Necessário para que o JOIN funcione corretamente nas RLS)
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. LIMPAR POLÍTICAS EXISTENTES (Remove qualquer política antiga/duplicada)
DROP POLICY IF EXISTS "course_phase_questions_policy" ON public.course_phase_questions;
DROP POLICY IF EXISTS "Admins manage course questions" ON public.course_phase_questions;
DROP POLICY IF EXISTS "Users view questions of active courses" ON public.course_phase_questions;
DROP POLICY IF EXISTS "course_question_options_policy" ON public.course_question_options;
DROP POLICY IF EXISTS "Admins manage question options" ON public.course_question_options;
DROP POLICY IF EXISTS "Users view options of active courses" ON public.course_question_options;

-- 4. CRIAR POLÍTICAS PARA course_phase_questions
-- 4a. Admins podem gerenciar perguntas dos cursos da sua empresa
CREATE POLICY "Admins manage course questions" ON public.course_phase_questions
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.course_modules m 
    JOIN public.courses c ON c.id = m.course_id 
    WHERE m.id = course_phase_questions.module_id 
    AND c.company_id = public.get_auth_user_company_id()
  )
)
WITH CHECK (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.course_modules m 
    JOIN public.courses c ON c.id = m.course_id 
    WHERE m.id = course_phase_questions.module_id 
    AND c.company_id = public.get_auth_user_company_id()
  )
);

-- 4b. Usuários podem visualizar perguntas de cursos ativos
CREATE POLICY "Users view questions of active courses" ON public.course_phase_questions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_modules m 
    JOIN public.courses c ON c.id = m.course_id 
    WHERE m.id = course_phase_questions.module_id 
    AND c.status = 'ACTIVE' 
    AND c.company_id = public.get_auth_user_company_id()
  )
);

-- 5. CRIAR POLÍTICAS PARA course_question_options
-- 5a. Admins podem gerenciar opções das perguntas da sua empresa
CREATE POLICY "Admins manage question options" ON public.course_question_options
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.course_phase_questions q
    JOIN public.course_modules m ON m.id = q.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE q.id = course_question_options.question_id
    AND c.company_id = public.get_auth_user_company_id()
  )
)
WITH CHECK (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (
    SELECT 1 FROM public.course_phase_questions q
    JOIN public.course_modules m ON m.id = q.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE q.id = course_question_options.question_id
    AND c.company_id = public.get_auth_user_company_id()
  )
);

-- 5b. Usuários podem visualizar opções de cursos ativos
CREATE POLICY "Users view options of active courses" ON public.course_question_options
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_phase_questions q
    JOIN public.course_modules m ON m.id = q.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE q.id = course_question_options.question_id
    AND c.status = 'ACTIVE'
    AND c.company_id = public.get_auth_user_company_id()
  )
);

-- 6. Criar índices para performance das RLS
CREATE INDEX IF NOT EXISTS idx_course_phase_questions_module_id ON public.course_phase_questions(module_id);
CREATE INDEX IF NOT EXISTS idx_course_question_options_question_id ON public.course_question_options(question_id);

-- 7. Garantir que thumbnail_url existe na tabela courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 8. Forçar recarregamento da API
NOTIFY pgrst, 'reload schema';
