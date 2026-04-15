-- ============================================================================
-- FIX: Adicionar coluna 'description' na tabela checklist_questions
-- Causa: O hook useChecklistQuestions faz select com 'description' mas a coluna 
-- não existe no banco, causando erro 400 do PostgREST.
-- Banco validado: ntkkzxycufnbcusuywfs (StorePage - DEV)
-- ============================================================================

ALTER TABLE public.checklist_questions ADD COLUMN IF NOT EXISTS description text;

-- Forçar reload do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
