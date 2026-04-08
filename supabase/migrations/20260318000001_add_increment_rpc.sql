-- Função para incrementar XP e Moedas de forma atômica e segura
CREATE OR REPLACE FUNCTION public.increment_user_stats(
  user_id_param UUID,
  xp_to_add INTEGER,
  coins_to_add INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users
  SET 
    xp_total = COALESCE(xp_total, 0) + xp_to_add,
    coins_total = COALESCE(coins_total, 0) + coins_to_add,
    updated_at = NOW()
  WHERE id = user_id_param;
END;
$$;
