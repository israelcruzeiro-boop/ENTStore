-- ==========================================
-- POLÍTICAS DE ACESSO - SUPABASE STORAGE
-- ==========================================
-- (REMOVIDO "ALTER TABLE" PARA EVITAR ERRO DE PERMISSÃO)

-- 1. Limpa políticas antigas caso existam (para evitar erros de duplicação)
DROP POLICY IF EXISTS "Permite leitura publica de assets" ON storage.objects;
DROP POLICY IF EXISTS "Permite insercao publica em assets" ON storage.objects;
DROP POLICY IF EXISTS "Permite atualizacao publica em assets" ON storage.objects;
DROP POLICY IF EXISTS "Permite delecao publica em assets" ON storage.objects;

-- 2. Permite acesso de Leitura global (SELECT)
CREATE POLICY "Permite leitura publica de assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- 3. Permite uploads anônimos/públicos (INSERT)
CREATE POLICY "Permite insercao publica em assets"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'assets');

-- 4. Permite atualização do arquivo (UPDATE)
CREATE POLICY "Permite atualizacao publica em assets"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'assets');

-- 5. Permite deleção livre (DELETE)
CREATE POLICY "Permite delecao publica em assets"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'assets');
