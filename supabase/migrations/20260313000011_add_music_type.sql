-- ==========================================
-- ADICIONAR TIPO MUSIC AO CHECK CONSTRAINT + ORDER_INDEX NAS CATEGORIAS
-- ==========================================

-- 1. Atualizar o check constraint da tabela contents para incluir MUSIC
ALTER TABLE public.contents DROP CONSTRAINT IF EXISTS contents_type_check;
ALTER TABLE public.contents ADD CONSTRAINT contents_type_check 
  CHECK (type IN ('PDF', 'VIDEO', 'DOCUMENT', 'LINK', 'MUSIC'));

-- 2. Adicionar coluna order_index à tabela categories (para ordenação futura)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='order_index') THEN
    ALTER TABLE public.categories ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;
END $$;
