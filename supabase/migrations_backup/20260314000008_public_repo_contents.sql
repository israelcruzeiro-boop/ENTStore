-- ====================================================================================
-- MIGRATION: RLS PARA CONTEÚDOS DE REPOSITÓRIOS PÚBLICOS NA LANDING PAGE
-- ====================================================================================

-- 1. Habilita leitura na tabela contents para a rule 'anon' (Visitantes Não Autenticados)
-- A condição é: O conteúdo DEVE estar ACTIVE e o Repositório "Pai" DEVE estar marcado 
-- com show_in_landing = TRUE e também estar ACTIVE.

DROP POLICY IF EXISTS "Leitura Pública de Conteúdos da Landing Page" ON public.contents;
CREATE POLICY "Leitura Pública de Conteúdos da Landing Page"
ON public.contents 
FOR SELECT 
USING (
    status = 'ACTIVE' 
    AND repository_id IN (
        SELECT id FROM public.repositories 
        WHERE show_in_landing = true AND status = 'ACTIVE'
    )
);

-- 2. Habilita leitura na tabela simple_links para a rule 'anon' (Visitantes Não Autenticados)
DROP POLICY IF EXISTS "Leitura Pública de Links Simples da Landing Page" ON public.simple_links;
CREATE POLICY "Leitura Pública de Links Simples da Landing Page"
ON public.simple_links 
FOR SELECT 
USING (
    status = 'ACTIVE' 
    AND repository_id IN (
        SELECT id FROM public.repositories 
        WHERE show_in_landing = true AND status = 'ACTIVE'
    )
);
