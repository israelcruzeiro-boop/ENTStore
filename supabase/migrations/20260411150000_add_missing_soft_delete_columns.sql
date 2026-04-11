-- Adicionar colunas deleted_at faltantes para suporte completo ao Soft Delete

DO $$ 
BEGIN 
    -- 1. Matrículas de Cursos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='course_enrollments' AND column_name='deleted_at') THEN
        ALTER TABLE public.course_enrollments ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Empresas (Correção Crítica de LOGIN)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='companies' AND column_name='deleted_at') THEN
        ALTER TABLE public.companies ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- 2. Quizzes e Estrutura Relacionada
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='quizzes' AND column_name='deleted_at') THEN
        ALTER TABLE public.quizzes ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='quiz_questions' AND column_name='deleted_at') THEN
        ALTER TABLE public.quiz_questions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='quiz_options' AND column_name='deleted_at') THEN
        ALTER TABLE public.quiz_options ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- 3. Submissões de Checklists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklist_submissions' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklist_submissions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklist_answers' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklist_answers ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;
