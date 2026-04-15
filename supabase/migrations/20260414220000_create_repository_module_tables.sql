-- ============================================================================
-- MIGRATION: Criar tabelas do módulo de Repositórios
-- Tabelas: repositories, categories, contents, simple_links, 
--          content_views, content_ratings
-- ============================================================================

-- 1. REPOSITORIES
CREATE TABLE IF NOT EXISTS public.repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image text,
  banner_image text,
  banner_position integer DEFAULT 50,
  banner_brightness integer DEFAULT 100,
  featured boolean DEFAULT false,
  show_in_landing boolean DEFAULT false,
  type text NOT NULL DEFAULT 'FULL' CHECK (type IN ('FULL', 'SIMPLE', 'PLAYLIST', 'VIDEO_PLAYLIST')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT')),
  access_type text NOT NULL DEFAULT 'ALL' CHECK (access_type IN ('ALL', 'RESTRICTED')),
  allowed_user_ids uuid[] DEFAULT '{}',
  allowed_region_ids uuid[] DEFAULT '{}',
  allowed_store_ids uuid[] DEFAULT '{}',
  excluded_user_ids uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 2. CATEGORIES (Fases de repositório)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 3. CONTENTS (Conteúdos de repositório completo/playlist)
CREATE TABLE IF NOT EXISTS public.contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  type text NOT NULL DEFAULT 'VIDEO' CHECK (type IN ('PDF', 'VIDEO', 'DOCUMENT', 'LINK', 'MUSIC', 'IMAGE', 'QUIZ')),
  url text NOT NULL,
  embed_url text,
  featured boolean DEFAULT false,
  recent boolean DEFAULT true,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAFT')),
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 4. SIMPLE_LINKS (Links simples de repositório)
CREATE TABLE IF NOT EXISTS public.simple_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  type text DEFAULT 'link',
  date date DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- 5. CONTENT_VIEWS (Métricas de visualização)
CREATE TABLE IF NOT EXISTS public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  content_type text,
  org_unit_id uuid,
  org_top_level_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

-- 6. CONTENT_RATINGS (Avaliações de conteúdo)
CREATE TABLE IF NOT EXISTS public.content_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  org_unit_id uuid,
  org_top_level_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, content_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_repositories_company_id ON public.repositories(company_id);
CREATE INDEX IF NOT EXISTS idx_repositories_status ON public.repositories(status);
CREATE INDEX IF NOT EXISTS idx_repositories_deleted_at ON public.repositories(deleted_at);

CREATE INDEX IF NOT EXISTS idx_categories_repository_id ON public.categories(repository_id);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at);

CREATE INDEX IF NOT EXISTS idx_contents_company_id ON public.contents(company_id);
CREATE INDEX IF NOT EXISTS idx_contents_repository_id ON public.contents(repository_id);
CREATE INDEX IF NOT EXISTS idx_contents_category_id ON public.contents(category_id);
CREATE INDEX IF NOT EXISTS idx_contents_deleted_at ON public.contents(deleted_at);

CREATE INDEX IF NOT EXISTS idx_simple_links_company_id ON public.simple_links(company_id);
CREATE INDEX IF NOT EXISTS idx_simple_links_repository_id ON public.simple_links(repository_id);
CREATE INDEX IF NOT EXISTS idx_simple_links_deleted_at ON public.simple_links(deleted_at);

CREATE INDEX IF NOT EXISTS idx_content_views_user_id ON public.content_views(user_id);
CREATE INDEX IF NOT EXISTS idx_content_views_repository_id ON public.content_views(repository_id);
CREATE INDEX IF NOT EXISTS idx_content_views_company_id ON public.content_views(company_id);

CREATE INDEX IF NOT EXISTS idx_content_ratings_user_id ON public.content_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_ratings_repository_id ON public.content_ratings(repository_id);
CREATE INDEX IF NOT EXISTS idx_content_ratings_company_id ON public.content_ratings(company_id);

-- ============================================================================
-- RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repositories_select_by_company" ON public.repositories FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "repositories_insert_admin" ON public.repositories FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "repositories_update_admin" ON public.repositories FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "repositories_delete_admin" ON public.repositories FOR DELETE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (repository_id IN (SELECT id FROM public.repositories WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "categories_insert_admin" ON public.categories FOR INSERT WITH CHECK (repository_id IN (SELECT id FROM public.repositories WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))));
CREATE POLICY "categories_update_admin" ON public.categories FOR UPDATE USING (repository_id IN (SELECT id FROM public.repositories WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))));
CREATE POLICY "categories_delete_admin" ON public.categories FOR DELETE USING (repository_id IN (SELECT id FROM public.repositories WHERE company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN'))));

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contents_select_by_company" ON public.contents FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "contents_insert_admin" ON public.contents FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "contents_update_admin" ON public.contents FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "contents_delete_admin" ON public.contents FOR DELETE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

ALTER TABLE public.simple_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "simple_links_select_by_company" ON public.simple_links FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "simple_links_insert_admin" ON public.simple_links FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "simple_links_update_admin" ON public.simple_links FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));
CREATE POLICY "simple_links_delete_admin" ON public.simple_links FOR DELETE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_views_select_by_company" ON public.content_views FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "content_views_insert_authenticated" ON public.content_views FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE public.content_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_ratings_select_by_company" ON public.content_ratings FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'SUPER_ADMIN'));
CREATE POLICY "content_ratings_insert_authenticated" ON public.content_ratings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "content_ratings_update_own" ON public.content_ratings FOR UPDATE USING (user_id = auth.uid());
