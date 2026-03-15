-- ==========================================
-- CONFIGURAÇÃO DE STORAGE - BUCKET ASSETS
-- ==========================================

-- 1. CRIAÇÃO DO BUCKET (Se não existir)
INSERT INTO storage.buckets (id, name, public)
SELECT 'assets', 'assets', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'assets'
);

-- 2. POLÍTICAS DE RLS PARA O STORAGE
-- Remover políticas antigas para evitar duplicidade
DROP POLICY IF EXISTS "Permitir upload para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir visualização pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir remoção pelo dono" ON storage.objects;

-- Política de Inserção (Upload)
CREATE POLICY "Permitir upload para usuários autenticados"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'assets');

-- Política de Visualização (Leitura Pública)
CREATE POLICY "Permitir visualização pública"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'assets');

-- Política de Atualização (Sobrescrever)
CREATE POLICY "Permitir atualização pelo dono"
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'assets' AND auth.uid()::text = owner::text);

-- Política de Remoção (Delete)
CREATE POLICY "Permitir remoção pelo dono"
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'assets' AND auth.uid()::text = owner::text);
