-- MIGRATION: 20240411_soft_delete_and_cleanup.sql
-- DESCRIÇÃO: Implementa Soft Delete e remove coluna password da tabela pública.

BEGIN;

-- 1. Adicionar coluna deleted_at nas tabelas principais
DO $$ 
BEGIN 
    -- Usuários
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='deleted_at') THEN
        ALTER TABLE public.users ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Cursos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='courses' AND column_name='deleted_at') THEN
        ALTER TABLE public.courses ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Módulos de Curso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='course_modules' AND column_name='deleted_at') THEN
        ALTER TABLE public.course_modules ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Conteúdos de Curso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='course_contents' AND column_name='deleted_at') THEN
        ALTER TABLE public.course_contents ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Perguntas de Curso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='course_phase_questions' AND column_name='deleted_at') THEN
        ALTER TABLE public.course_phase_questions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Repositórios
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='repositories' AND column_name='deleted_at') THEN
        ALTER TABLE public.repositories ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Categorias de Repositório
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='categories' AND column_name='deleted_at') THEN
        ALTER TABLE public.categories ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Conteúdos de Repositório
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='contents' AND column_name='deleted_at') THEN
        ALTER TABLE public.contents ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Links Simples
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='simple_links' AND column_name='deleted_at') THEN
        ALTER TABLE public.simple_links ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Estrutura Organizacional
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='org_top_levels' AND column_name='deleted_at') THEN
        ALTER TABLE public.org_top_levels ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='org_units' AND column_name='deleted_at') THEN
        ALTER TABLE public.org_units ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Pastas de Checklist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklist_folders' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklist_folders ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Checklists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklists' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklists ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Seções de Checklist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklist_sections' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklist_sections ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Perguntas de Checklist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='checklist_questions' AND column_name='deleted_at') THEN
        ALTER TABLE public.checklist_questions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Opções de Perguntas de Curso
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='course_question_options' AND column_name='deleted_at') THEN
        ALTER TABLE public.course_question_options ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Criar índices para performance nas filtragens de Soft Delete
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_courses_deleted_at ON public.courses(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_repositories_deleted_at ON public.repositories(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_checklists_deleted_at ON public.checklists(deleted_at) WHERE deleted_at IS NULL;

-- 3. Limpeza de Segurança: Remover coluna password de public.users
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='users' AND column_name='password') THEN
        ALTER TABLE public.users DROP COLUMN password;
    END IF;
END $$;

COMMIT;
