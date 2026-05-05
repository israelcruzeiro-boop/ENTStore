-- StorePage storage hardening.
-- Uploads must go through the backend service-role endpoint, which validates
-- purpose, role, tenant path, file type, extension, size and signature.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('uploads', 'uploads', true),
  ('assets', 'assets', true),
  ('course-materials', 'course-materials', true),
  ('checklist-photos', 'checklist-photos', true),
  ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$
DECLARE
  storage_policy record;
BEGIN
  FOR storage_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        coalesce(qual, '') ILIKE ANY (ARRAY[
          '%bucket_id = ''uploads''%',
          '%bucket_id = ''assets''%',
          '%bucket_id = ''course-materials''%',
          '%bucket_id = ''checklist-photos''%',
          '%bucket_id = ''company-assets''%'
        ])
        OR coalesce(with_check, '') ILIKE ANY (ARRAY[
          '%bucket_id = ''uploads''%',
          '%bucket_id = ''assets''%',
          '%bucket_id = ''course-materials''%',
          '%bucket_id = ''checklist-photos''%',
          '%bucket_id = ''company-assets''%'
        ])
      )
      AND policyname ILIKE ANY (ARRAY[
        '%asset%',
        '%atualiza%',
        '%checklist%',
        '%dono%',
        '%foto%',
        '%material%',
        '%photo%',
        '%public%',
        '%remo%',
        '%storage%',
        '%upload%'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', storage_policy.policyname);
  END LOOP;
END $$;

CREATE POLICY "StorePage storage public read"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id IN ('uploads', 'assets', 'course-materials', 'checklist-photos', 'company-assets')
);

COMMENT ON POLICY "StorePage storage public read" ON storage.objects
IS 'Read-only public serving for StorePage storage buckets. Direct writes are intentionally absent; uploads use backend service_role validation.';

NOTIFY pgrst, 'reload schema';
