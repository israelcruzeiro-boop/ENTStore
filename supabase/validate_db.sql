-- Script de Validação de Ambiente - Marketplace (V8)
-- Execute este script no SQL Editor do Supabase para validar se o banco está pronto.

-- 1. Verificar Tabelas e RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('courses', 'course_modules', 'course_contents', 'users', 'companies', 'quizzes', 'quiz_questions', 'quiz_options')
  AND schemaname = 'public';

-- 2. Verificar Novos Índices (Performance)
SELECT 
    t.relname as table_name,
    i.relname as index_name,
    a.attname as column_name
FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
WHERE t.oid = ix.indrelid
  AND i.oid = ix.indexrelid
  AND a.attrelid = t.oid
  AND a.attnum = ANY(ix.indkey)
  AND t.relkind = 'r'
  AND i.relname LIKE 'idx_%'
ORDER BY t.relname;

-- 3. Verificar Políticas de Acesso (Segurança)
SELECT 
    tablename, 
    policyname, 
    cmd as operation,
    roles,
    qual as definition
FROM pg_policies 
WHERE tablename IN ('courses', 'course_modules', 'course_contents') 
ORDER BY tablename, cmd;

-- 4. Verificar Buckets de Storage
SELECT name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE name IN ('course-materials', 'assets');
