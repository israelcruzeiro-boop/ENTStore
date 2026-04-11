-- 1. Habilitar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- TABELAS BASE (Tenant e Organograma)
-- ==========================================

-- Companies (Tenants)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  link_name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  theme JSONB DEFAULT '{}'::jsonb NOT NULL,
  logo_url TEXT,
  hero_image TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  org_levels JSONB,
  org_top_level_name TEXT,
  org_unit_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org Top Levels (Ex: Diretorias, Regionais)
CREATE TABLE public.org_top_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  level_id TEXT,
  parent_id UUID REFERENCES public.org_top_levels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Org Units (Ex: Lojas, Filiais)
CREATE TABLE public.org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.org_top_levels(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- USUÁRIOS E AUTENTICAÇÃO
-- ==========================================

-- Users (Estendendo auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER')),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
  org_top_level_id UUID REFERENCES public.org_top_levels(id) ON DELETE SET NULL,
  avatar_url TEXT,
  active BOOLEAN DEFAULT true,
  first_access BOOLEAN DEFAULT true,
  status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_SETUP')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gatilho para criar/atualizar um perfil automaticamente quando um auth.user for criado
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- CONTEÚDO (Repositórios, Categorias, Links)
-- ==========================================

CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  banner_image TEXT,
  featured BOOLEAN DEFAULT false,
  type TEXT NOT NULL CHECK (type IN ('FULL', 'SIMPLE')),
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DRAFT')),
  access_type TEXT CHECK (access_type IN ('ALL', 'RESTRICTED')),
  allowed_user_ids UUID[],
  allowed_region_ids UUID[],
  allowed_store_ids UUID[],
  excluded_user_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('PDF', 'VIDEO', 'DOCUMENT', 'LINK')),
  url TEXT,
  embed_url TEXT,
  featured BOOLEAN DEFAULT false,
  recent BOOLEAN DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'DRAFT')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.simple_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  date TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- MÉTRICAS E AVALIAÇÕES
-- ==========================================

CREATE TABLE public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL, -- Pode ser simple_links ou contents
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id UUID  NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  content_type TEXT,
  org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
  org_top_level_id UUID REFERENCES public.org_top_levels(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.content_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 10),
  org_unit_id UUID REFERENCES public.org_units(id) ON DELETE SET NULL,
  org_top_level_id UUID REFERENCES public.org_top_levels(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==========================================
-- ROW LEVEL SECURITY (RLS) BASIS
-- ==========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_top_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_links ENABLE ROW LEVEL SECURITY;

-- Políticas Iniciais Simplificadas (A serem restringidas severamente na Etapa 5)
-- TODO: Ajustar visualização cruzada de companhias na fase final.

CREATE POLICY "Acesso Livre Companhias" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Admins alteram Companhias" ON public.companies FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Usuários leem seus times" ON public.org_top_levels FOR SELECT USING (true);
CREATE POLICY "Admins cuidam dos times" ON public.org_top_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Usuários leem suas units" ON public.org_units FOR SELECT USING (true);
CREATE POLICY "Admins cuidam das units" ON public.org_units FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Autenticados leem Colegas" ON public.users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Autenticados alteram proprio perfil" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Para RLS de conteúdos e admin
CREATE POLICY "Leitura de Repositorios Ativos" ON public.repositories FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins editam repositorios" ON public.repositories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Leitura das Categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins editam Categorias" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Leitura de Conteúdos" ON public.contents FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins editam Conteudos" ON public.contents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

CREATE POLICY "Leitura de Links simples" ON public.simple_links FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins editam Links" ON public.simple_links FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('ADMIN', 'SUPER_ADMIN'))
);

-- BUCKET DE IMAGENS
-- Crie manualmente o "assets" caso a query falhe, ou deixe o Supabase gerenciar no Storage.
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT DO NOTHING;
