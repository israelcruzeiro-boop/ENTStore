-- ==========================================
-- SISTEMA DE QUIZ IA - SCHEMA E RLS
-- ==========================================

-- 1. Atualizar o check constraint da tabela contents para incluir QUIZ
ALTER TABLE public.contents DROP CONSTRAINT IF EXISTS contents_type_check;
ALTER TABLE public.contents ADD CONSTRAINT contents_type_check 
  CHECK (type IN ('PDF', 'VIDEO', 'DOCUMENT', 'LINK', 'MUSIC', 'QUIZ'));

-- 2. Tabela de Quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  passing_score INTEGER DEFAULT 70,
  time_limit INTEGER, -- em segundos
  points_reward INTEGER DEFAULT 10,
  shuffle_questions BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_id)
);

-- 3. Tabela de Perguntas
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Opções
CREATE TABLE IF NOT EXISTS public.quiz_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Tentativas (Progresso do Usuário)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers JSONB,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_quizzes_company ON public.quizzes(company_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_content ON public.quizzes(content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON public.quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id);

-- POLÍTICAS: QUIZZES
CREATE POLICY "Users can view quizzes from their company" ON public.quizzes
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage quizzes" ON public.quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
    AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- POLÍTICAS: PERGUNTAS
CREATE POLICY "Users can view questions from their company" ON public.quiz_questions
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage questions" ON public.quiz_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
    AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- POLÍTICAS: OPÇÕES
CREATE POLICY "Users can view options from their company" ON public.quiz_options
  FOR SELECT USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage options" ON public.quiz_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
    AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );

-- POLÍTICAS: TENTATIVAS
CREATE POLICY "Users can view their own attempts" ON public.quiz_attempts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all attempts from their company" ON public.quiz_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))
    AND company_id = (SELECT company_id FROM public.users WHERE id = auth.uid())
  );
