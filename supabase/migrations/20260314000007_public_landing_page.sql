-- ====================================================================================
-- MIGRATION: MINI LANDING PAGE PÚBLICA E OTIMIZAÇÃO DE ZERO EGRESS
-- ====================================================================================

-- 1. Alterar entidade Companies para suportar o texto de Landing Page, Ativador Master e Seletor de Layout
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS public_bio TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS landing_page_active BOOLEAN DEFAULT FALSE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS landing_page_layout VARCHAR(50) DEFAULT 'classic';

-- 2. Alterar entidade Repositories para carregar a Flag Publica
ALTER TABLE public.repositories ADD COLUMN IF NOT EXISTS show_in_landing BOOLEAN DEFAULT FALSE;

-- 3. Inserir Políticas de Segurança de Nível de Linha (RLS) para Repositórios no ambiente Público

-- A Política Antiga "Leitura de Repositorios Ativos" do RLS do Supabase que foca no ambiente Authenticado 
-- não afeta a nossa querry pública, nós adicionaremos uma NOVA política focada na role `anon`.

-- Habilita leitura para QUALQUER role (autenticado ou anônimo) para repós com show_in_landing
DROP POLICY IF EXISTS "Leitura Pública de Landing Page" ON public.repositories;
CREATE POLICY "Leitura Pública de Landing Page"
ON public.repositories 
FOR SELECT 
USING (status = 'ACTIVE' AND show_in_landing = true);

-- Garante que se um repositório é show_in_landing, a capa dos seus public_contents (Vídeos/PDF) possam surgir?
-- Não! A arquitetura definiu Zero Egress, a Landing Page listará apenas a capa da Biblioteca,
-- não a tabela contents completa por trás dela. Nenhuma RLS anon adicional é necessária para Contents.

-- NOTA: `companies` já possui policy "Leitura pública de empresas" permitindo SELECT.
