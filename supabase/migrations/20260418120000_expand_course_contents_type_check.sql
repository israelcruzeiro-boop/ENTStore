-- Expande a CHECK constraint de course_contents.type para incluir DOCUMENT e HTML,
-- alinhando o DB ao schema TS/Zod já em uso pela aplicação.

ALTER TABLE public.course_contents
  DROP CONSTRAINT IF EXISTS course_contents_type_check;

ALTER TABLE public.course_contents
  ADD CONSTRAINT course_contents_type_check
  CHECK (type = ANY (ARRAY['PDF'::text, 'IMAGE'::text, 'AUDIO'::text, 'VIDEO'::text, 'DOCUMENT'::text, 'HTML'::text]));

NOTIFY pgrst, 'reload schema';
