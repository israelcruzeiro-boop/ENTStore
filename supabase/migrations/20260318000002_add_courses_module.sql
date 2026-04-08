-- ==========================================
-- NOVO MÓDULO DE CURSOS E IA
-- ==========================================

-- 1. Tabela de Cursos
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Módulos
CREATE TABLE IF NOT EXISTS public.course_modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Conteúdos do Curso (Aulas)
CREATE TABLE IF NOT EXISTS public.course_contents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'IMAGE', 'AUDIO', 'VIDEO')),
  url TEXT NOT NULL,
  file_path TEXT, -- caminho no storage
  size_bytes BIGINT,
  duration_seconds INTEGER,
  processing_status TEXT DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  error_message TEXT, -- Adicionado para logs de erro da IA
  extracted_text TEXT,
  transcription TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Adaptação da Tabela de Quizzes
-- Adiciona a coluna para vincular ao novo módulo de cursos
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS course_content_id UUID REFERENCES public.course_contents(id) ON DELETE CASCADE;
-- Torna content_id opcional (pode ser nulo agora que temos course_content_id)
ALTER TABLE public.quizzes ALTER COLUMN content_id DROP NOT NULL;

-- 5. Bucket de Storage para Cursos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-materials', 'course-materials', true) 
ON CONFLICT DO NOTHING;

-- 6. RLS Policies (Base)
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_contents ENABLE ROW LEVEL SECURITY;

-- Políticas para Admin (Leitura de todos da sua empresa)
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins manage modules" ON public.course_modules;
CREATE POLICY "Admins manage modules" ON public.course_modules FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

DROP POLICY IF EXISTS "Admins manage course contents" ON public.course_contents;
CREATE POLICY "Admins manage course contents" ON public.course_contents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Políticas para Usuários (Leitura apenas Ativos)
DROP POLICY IF EXISTS "Users view active courses" ON public.courses;
CREATE POLICY "Users view active courses" ON public.courses FOR SELECT USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "Users view modules of active courses" ON public.course_modules;
CREATE POLICY "Users view modules of active courses" ON public.course_modules FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'ACTIVE')
);

DROP POLICY IF EXISTS "Users view contents of active courses" ON public.course_contents;
CREATE POLICY "Users view contents of active courses" ON public.course_contents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND c.status = 'ACTIVE')
);

-- 7. Políticas de Storage para Course Materials
-- Permitir leitura pública (SELECT)
DROP POLICY IF EXISTS "Permitir visualização pública de materiais" ON storage.objects;
CREATE POLICY "Permitir visualização pública de materiais"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'course-materials');

-- Permitir upload para admins (INSERT)
DROP POLICY IF EXISTS "Permitir upload de materiais por admins" ON storage.objects;
CREATE POLICY "Permitir upload de materiais por admins"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'course-materials' AND 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Permitir atualização por admins (UPDATE)
DROP POLICY IF EXISTS "Permitir atualização de materiais por admins" ON storage.objects;
CREATE POLICY "Permitir atualização de materiais por admins"
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'course-materials' AND 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- Permitir remoção por admins (DELETE)
DROP POLICY IF EXISTS "Permitir remoção de materiais por admins" ON storage.objects;
CREATE POLICY "Permitir remoção de materiais por admins"
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'course-materials' AND 
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);
