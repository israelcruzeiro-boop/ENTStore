-- Adicionar colunas de gamificação à tabela de usuários
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins_total INTEGER DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN public.users.xp_total IS 'Total de pontos de experiência acumulados pelo usuário';
COMMENT ON COLUMN public.users.coins_total IS 'Total de moedas/créditos acumulados pelo usuário';
