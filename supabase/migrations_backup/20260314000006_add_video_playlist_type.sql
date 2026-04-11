-- ====================================================================================
-- MIGRATION: ADICIONAR TIPO VIDEO_PLAYLIST AO CHECK CONSTRAINT DOS REPOSITÓRIOS
-- ====================================================================================

-- 1. Atualizar o check constraint da tabela repositories para incluir VIDEO_PLAYLIST
ALTER TABLE public.repositories DROP CONSTRAINT IF EXISTS repositories_type_check;

ALTER TABLE public.repositories ADD CONSTRAINT repositories_type_check 
  CHECK (type IN ('FULL', 'SIMPLE', 'PLAYLIST', 'VIDEO_PLAYLIST'));
