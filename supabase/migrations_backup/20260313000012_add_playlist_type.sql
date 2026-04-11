-- ==========================================
-- ADICIONAR TIPO PLAYLIST AO CHECK CONSTRAINT DOS REPOSITÓRIOS
-- ==========================================

-- 1. Atualizar o check constraint da tabela repositories para incluir PLAYLIST
ALTER TABLE public.repositories DROP CONSTRAINT IF EXISTS repositories_type_check;
ALTER TABLE public.repositories ADD CONSTRAINT repositories_type_check 
  CHECK (type IN ('FULL', 'SIMPLE', 'PLAYLIST'));
