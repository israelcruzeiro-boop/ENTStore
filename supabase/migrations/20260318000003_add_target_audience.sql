-- Adiciona colunas para controle de acesso estrutural na tabela de cursos (Igual aos Repositórios)
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'ALL' CHECK (access_type IN ('ALL', 'RESTRICTED')),
ADD COLUMN IF NOT EXISTS allowed_user_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_region_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allowed_store_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS excluded_user_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.courses.access_type IS 'Define se o curso é aberto para todos (ALL) ou apenas para grupos específicos (RESTRICTED)';
COMMENT ON COLUMN public.courses.target_audience IS 'Lista de perfis/roles (ex: ["ADMIN", "VENDAS"]) - Mantido para compatibilidade de roles';

-- Atualiza políticas de RLS para garantir que o SELECT filtre por estrutura organizacional
DROP POLICY IF EXISTS "Users view active courses" ON public.courses;

CREATE POLICY "Users view active courses" ON public.courses FOR SELECT USING (
  status = 'ACTIVE' AND (
    access_type = 'ALL' OR 
    (
      -- Não está na lista de exclusão
      NOT (excluded_user_ids @> ARRAY[auth.uid()]) AND 
      (
        -- Permissão direta por ID
        allowed_user_ids @> ARRAY[auth.uid()] OR 
        -- Permissão por Unidade (Loja) ou Região (Macro)
        EXISTS (
          SELECT 1 FROM public.users u 
          WHERE u.id = auth.uid() AND (
            allowed_store_ids @> ARRAY[u.org_unit_id] OR 
            allowed_region_ids @> ARRAY[u.org_top_level_id] OR
            u.role IN ('admin', 'editor')
          )
        )
      )
    )
  )
);
