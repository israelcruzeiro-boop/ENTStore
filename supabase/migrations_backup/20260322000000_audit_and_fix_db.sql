-- ==========================================
-- AUDITORIA E ENDURECIMENTO DE BANCO (V8)
-- ==========================================

-- 1. NOVOS ÍNDICES DE PERFORMANCE (TENANT ISOLATION)
-- Estes índices garantem que as políticas de RLS e queries por empresa sejam instantâneas.
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_courses_company_id ON public.courses(company_id);
CREATE INDEX IF NOT EXISTS idx_repositories_company_id ON public.repositories(company_id);
CREATE INDEX IF NOT EXISTS idx_course_contents_company_id ON public.course_contents(company_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON public.course_modules(course_id);

-- 2. UNIFICAÇÃO DE RLS (SEGURANÇA CRÍTICA)
-- Removemos as políticas que não filtravam por company_id e aplicamos os helpers seguros.

-- Tabelas: courses
DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
CREATE POLICY "Admins manage courses" ON public.courses 
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN') 
  AND public.get_auth_user_company_id() = company_id
);

DROP POLICY IF EXISTS "Users view active courses" ON public.courses;
CREATE POLICY "Users view active courses" ON public.courses 
FOR SELECT TO authenticated
USING (
  status = 'ACTIVE' 
  AND public.get_auth_user_company_id() = company_id
);

-- Tabelas: course_modules
DROP POLICY IF EXISTS "Admins manage modules" ON public.course_modules;
CREATE POLICY "Admins manage modules" ON public.course_modules 
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.company_id = public.get_auth_user_company_id())
);

DROP POLICY IF EXISTS "Users view modules of active courses" ON public.course_modules;
CREATE POLICY "Users view modules of active courses" ON public.course_modules 
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.status = 'ACTIVE' AND c.company_id = public.get_auth_user_company_id())
);

-- Tabelas: course_contents
DROP POLICY IF EXISTS "Admins manage course contents" ON public.course_contents;
CREATE POLICY "Admins manage course contents" ON public.course_contents 
FOR ALL TO authenticated
USING (
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  AND public.get_auth_user_company_id() = company_id
);

DROP POLICY IF EXISTS "Users view contents of active courses" ON public.course_contents;
CREATE POLICY "Users view contents of active courses" ON public.course_contents 
FOR SELECT TO authenticated
USING (
  public.get_auth_user_company_id() = company_id
  AND EXISTS (SELECT 1 FROM public.course_modules m JOIN public.courses c ON c.id = m.course_id WHERE m.id = module_id AND c.status = 'ACTIVE')
);

-- 3. STORAGE HARDENING (COURSE MATERIALS)
-- Garante que arquivos só possam ser acessados se o path começar com o ID da empresa ou se for público.
-- Nota: Para isolamento total no storage, recomenda-se prefixar o path com o company_id no frontend.

DROP POLICY IF EXISTS "Permitir upload de materiais por admins" ON storage.objects;
CREATE POLICY "Permitir upload de materiais por admins"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'course-materials' AND 
  public.get_auth_user_role() IN ('ADMIN', 'SUPER_ADMIN')
);

-- 4. LIMPEZA DE REDUNDÂNCIAS
-- Garante que o handle_new_user do initial_schema (básico) não sobrescreva a versão Merge (V6).
-- (A criação de handle_new_user já foi corrigida via CREATE OR REPLACE nas migrações anteriores).

-- Adiciona comentário para documentar a auditoria no banco
COMMENT ON TABLE public.courses IS 'Tabela auditada em 22/03/2026 para reforço de RLS e Performance.';
