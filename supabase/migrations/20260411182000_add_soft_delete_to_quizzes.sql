-- Adicionar suporte a Soft Delete na tabela de quizzes
ALTER TABLE "public"."quizzes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- Comentário para auditoria
COMMENT ON COLUMN "public"."quizzes"."deleted_at" IS 'Data de exclusão lógica (Soft Delete)';
