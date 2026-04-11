


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_user_email_exists"("lookup_email" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users WHERE email = lookup_email
  );
END;
$$;


ALTER FUNCTION "public"."check_user_email_exists"("lookup_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_company_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.users WHERE id = auth.uid();
  RETURN v_company_id;
END;
$$;


ALTER FUNCTION "public"."get_auth_user_company_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auth_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$;


ALTER FUNCTION "public"."get_auth_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_provisioned_user"("lookup_email" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT name, role INTO v_user
  FROM public.users
  WHERE email = lookup_email
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('name', v_user.name, 'role', v_user.role);
  ELSE
    RETURN NULL;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_provisioned_user"("lookup_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_user_id UUID;
BEGIN
  -- Procura se já existe um perfil provisionado (pelo admin) com este e-mail
  SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email LIMIT 1;

  IF existing_user_id IS NOT NULL THEN
    -- MÁGICA: Atualiza o registro existente com o novo ID do Auth
    -- Tudo o que estiver ligado a este usuário (empresa, unidades, etc) será mantido
    UPDATE public.users 
    SET id = NEW.id,
        name = COALESCE(NEW.raw_user_meta_data->>'name', name),
        role = COALESCE(NEW.raw_user_meta_data->>'role', role),
        updated_at = NOW()
    WHERE id = existing_user_id;
  ELSE
    -- Se não existir, cria um novo perfil do zero como antes
    INSERT INTO public.users (id, name, email, role, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), 
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'USER'),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_user_stats"("user_id_param" "uuid", "xp_to_add" integer, "coins_to_add" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."increment_user_stats"("user_id_param" "uuid", "xp_to_add" integer, "coins_to_add" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('ADMIN', 'SUPER_ADMIN')
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'SUPER_ADMIN'
  );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "repository_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "order_index" integer DEFAULT 0,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "value" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "action_plan" "text",
    "assigned_user_id" "uuid",
    "photo_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "action_plan_due_date" timestamp with time zone,
    "action_plan_status" "text" DEFAULT 'PENDING'::"text",
    "action_plan_created_by" "uuid"
);


ALTER TABLE "public"."checklist_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_folders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#2563EB'::"text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."checklist_folders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "type" "text" NOT NULL,
    "required" boolean DEFAULT true,
    "order_index" integer DEFAULT 0,
    "config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "section_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "checklist_questions_type_check" CHECK (("type" = ANY (ARRAY['COMPLIANCE'::"text", 'DATE'::"text", 'TIME'::"text", 'NUMBER'::"text", 'TEXT'::"text", 'RATING'::"text", 'CHECK'::"text"])))
);


ALTER TABLE "public"."checklist_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."checklist_sections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklist_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "checklist_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "org_unit_id" "uuid",
    "status" "text" DEFAULT 'IN_PROGRESS'::"text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "checklist_submissions_status_check" CHECK (("status" = ANY (ARRAY['IN_PROGRESS'::"text", 'COMPLETED'::"text"])))
);


ALTER TABLE "public"."checklist_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "access_type" "text" DEFAULT 'ALL'::"text",
    "allowed_user_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "allowed_region_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "allowed_store_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "excluded_user_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "status" "text" DEFAULT 'DRAFT'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "folder_id" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "checklists_access_type_check" CHECK (("access_type" = ANY (ARRAY['ALL'::"text", 'RESTRICTED'::"text"]))),
    CONSTRAINT "checklists_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'DRAFT'::"text", 'ARCHIVED'::"text"])))
);


ALTER TABLE "public"."checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "link_name" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "theme" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "logo_url" "text",
    "hero_image" "text",
    "hero_title" "text",
    "hero_subtitle" "text",
    "org_levels" "jsonb",
    "org_top_level_name" "text",
    "org_unit_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hero_position" integer DEFAULT 50,
    "hero_brightness" integer DEFAULT 100,
    "public_bio" "text",
    "landing_page_active" boolean DEFAULT false,
    "landing_page_layout" character varying(50) DEFAULT 'classic'::character varying,
    "landing_page_enabled" boolean DEFAULT true,
    "checklists_enabled" boolean DEFAULT false
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_ratings" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "repository_id" "uuid" NOT NULL,
    "rating" integer NOT NULL,
    "org_unit_id" "uuid",
    "org_top_level_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "content_ratings_rating_check" CHECK ((("rating" >= 0) AND ("rating" <= 10)))
);


ALTER TABLE "public"."content_ratings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "repository_id" "uuid" NOT NULL,
    "content_type" "text",
    "org_unit_id" "uuid",
    "org_top_level_id" "uuid",
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "repository_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "type" "text" NOT NULL,
    "url" "text",
    "embed_url" "text",
    "featured" boolean DEFAULT false,
    "recent" boolean DEFAULT false,
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "contents_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'DRAFT'::"text"]))),
    CONSTRAINT "contents_type_check" CHECK (("type" = ANY (ARRAY['PDF'::"text", 'VIDEO'::"text", 'DOCUMENT'::"text", 'LINK'::"text", 'MUSIC'::"text", 'QUIZ'::"text"])))
);


ALTER TABLE "public"."contents" OWNER TO "postgres";


COMMENT ON TABLE "public"."contents" IS 'Auditado em 09/04/2026: Isolamento de Tenant aplicado.';



CREATE TABLE IF NOT EXISTS "public"."course_answers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "enrollment_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "selected_option_id" "uuid",
    "is_correct" boolean DEFAULT false NOT NULL,
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "complex_answer" "jsonb"
);


ALTER TABLE "public"."course_answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_contents" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "file_path" "text",
    "size_bytes" bigint,
    "duration_seconds" integer,
    "processing_status" "text" DEFAULT 'PENDING'::"text",
    "extracted_text" "text",
    "transcription" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "course_contents_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['PENDING'::"text", 'PROCESSING'::"text", 'COMPLETED'::"text", 'FAILED'::"text"]))),
    CONSTRAINT "course_contents_type_check" CHECK (("type" = ANY (ARRAY['PDF'::"text", 'IMAGE'::"text", 'AUDIO'::"text", 'VIDEO'::"text"])))
);


ALTER TABLE "public"."course_contents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_enrollments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "company_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'IN_PROGRESS'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "score_percent" integer,
    "total_correct" integer DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "time_spent_seconds" integer,
    "current_module_id" "uuid",
    "current_content_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_enrollments_status_check" CHECK (("status" = ANY (ARRAY['IN_PROGRESS'::"text", 'COMPLETED'::"text"])))
);


ALTER TABLE "public"."course_enrollments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_modules" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_id" "uuid",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."course_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_phase_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "module_id" "uuid",
    "question_text" "text" NOT NULL,
    "explanation" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "question_type" "text" DEFAULT 'MULTIPLE_CHOICE'::"text",
    "configuration" "jsonb" DEFAULT '{}'::"jsonb",
    "image_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "course_phase_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['MULTIPLE_CHOICE'::"text", 'WORD_SEARCH'::"text", 'ORDERING'::"text", 'HOTSPOT'::"text"])))
);


ALTER TABLE "public"."course_phase_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_question_options" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "question_id" "uuid",
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "order_index" integer DEFAULT 0,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."course_question_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "access_type" "text" DEFAULT 'ALL'::"text",
    "allowed_user_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "allowed_region_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "allowed_store_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "excluded_user_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "target_audience" "jsonb" DEFAULT '[]'::"jsonb",
    "passing_score" integer DEFAULT 70,
    "diploma_template" "text" DEFAULT 'azul'::"text",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "courses_access_type_check" CHECK (("access_type" = ANY (ARRAY['ALL'::"text", 'RESTRICTED'::"text"]))),
    CONSTRAINT "courses_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'DRAFT'::"text", 'ARCHIVED'::"text"])))
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON TABLE "public"."courses" IS 'Tabela auditada em 22/03/2026 para reforço de RLS e Performance.';



COMMENT ON COLUMN "public"."courses"."access_type" IS 'Define se o curso é aberto para todos (ALL) ou apenas para grupos específicos (RESTRICTED)';



COMMENT ON COLUMN "public"."courses"."target_audience" IS 'Lista de perfis/roles (ex: ["ADMIN", "VENDAS"]) - Mantido para compatibilidade de roles';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'UNREAD'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_top_levels" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "level_id" "text",
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."org_top_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_units" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."org_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_attempts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "score" integer NOT NULL,
    "passed" boolean NOT NULL,
    "answers" "jsonb",
    "completed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_options" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "is_correct" boolean DEFAULT false,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quiz_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quiz_questions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "quiz_id" "uuid" NOT NULL,
    "question_text" "text" NOT NULL,
    "explanation" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "question_type" "text" DEFAULT 'OBJECTIVE'::"text",
    "difficulty" "text" DEFAULT 'Médio'::"text",
    "topic" "text",
    "source_excerpt" "text",
    "correct_answer_text" "text",
    CONSTRAINT "quiz_questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['OBJECTIVE'::"text", 'DISCURSIVE'::"text"])))
);


ALTER TABLE "public"."quiz_questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quizzes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "content_id" "uuid",
    "passing_score" integer DEFAULT 70,
    "time_limit" integer,
    "points_reward" integer DEFAULT 10,
    "shuffle_questions" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "course_content_id" "uuid"
);


ALTER TABLE "public"."quizzes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repositories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_image" "text",
    "banner_image" "text",
    "featured" boolean DEFAULT false,
    "type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "access_type" "text",
    "allowed_user_ids" "uuid"[],
    "allowed_region_ids" "uuid"[],
    "allowed_store_ids" "uuid"[],
    "excluded_user_ids" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "banner_position" integer DEFAULT 50,
    "banner_brightness" integer DEFAULT 100,
    "show_in_landing" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "repositories_access_type_check" CHECK (("access_type" = ANY (ARRAY['ALL'::"text", 'RESTRICTED'::"text"]))),
    CONSTRAINT "repositories_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'DRAFT'::"text"]))),
    CONSTRAINT "repositories_type_check" CHECK (("type" = ANY (ARRAY['FULL'::"text", 'SIMPLE'::"text", 'PLAYLIST'::"text", 'VIDEO_PLAYLIST'::"text"])))
);


ALTER TABLE "public"."repositories" OWNER TO "postgres";


COMMENT ON TABLE "public"."repositories" IS 'Auditado em 09/04/2026: Isolamento de Tenant aplicado.';



CREATE TABLE IF NOT EXISTS "public"."simple_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "repository_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "url" "text" NOT NULL,
    "type" "text",
    "date" "text",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    CONSTRAINT "simple_links_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."simple_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "cpf" "text",
    "role" "text" NOT NULL,
    "company_id" "uuid",
    "org_unit_id" "uuid",
    "org_top_level_id" "uuid",
    "avatar_url" "text",
    "active" boolean DEFAULT true,
    "first_access" boolean DEFAULT true,
    "status" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "xp_total" integer DEFAULT 0,
    "coins_total" integer DEFAULT 0,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "users_role_check" CHECK (("role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ADMIN'::"text", 'USER'::"text"]))),
    CONSTRAINT "users_status_check" CHECK (("status" = ANY (ARRAY['ACTIVE'::"text", 'INACTIVE'::"text", 'PENDING_SETUP'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_submission_id_question_id_key" UNIQUE ("submission_id", "question_id");



ALTER TABLE ONLY "public"."checklist_folders"
    ADD CONSTRAINT "checklist_folders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_questions"
    ADD CONSTRAINT "checklist_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_sections"
    ADD CONSTRAINT "checklist_sections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklist_submissions"
    ADD CONSTRAINT "checklist_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_link_name_key" UNIQUE ("link_name");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contents"
    ADD CONSTRAINT "contents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_answers"
    ADD CONSTRAINT "course_answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_contents"
    ADD CONSTRAINT "course_contents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_phase_questions"
    ADD CONSTRAINT "course_phase_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_question_options"
    ADD CONSTRAINT "course_question_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_top_levels"
    ADD CONSTRAINT "org_top_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_units"
    ADD CONSTRAINT "org_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_content_id_key" UNIQUE ("content_id");



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repositories"
    ADD CONSTRAINT "repositories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simple_links"
    ADD CONSTRAINT "simple_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_answers"
    ADD CONSTRAINT "unique_answer" UNIQUE ("enrollment_id", "question_id");



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "unique_enrollment" UNIQUE ("course_id", "user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_cpf_key" UNIQUE ("cpf");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_checklists_deleted_at" ON "public"."checklists" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_course_answers_enrollment" ON "public"."course_answers" USING "btree" ("enrollment_id");



CREATE INDEX "idx_course_contents_company_id" ON "public"."course_contents" USING "btree" ("company_id");



CREATE INDEX "idx_course_enrollments_company" ON "public"."course_enrollments" USING "btree" ("company_id");



CREATE INDEX "idx_course_enrollments_course_user" ON "public"."course_enrollments" USING "btree" ("course_id", "user_id");



CREATE INDEX "idx_course_modules_course_id" ON "public"."course_modules" USING "btree" ("course_id");



CREATE INDEX "idx_course_phase_questions_module_id" ON "public"."course_phase_questions" USING "btree" ("module_id");



CREATE INDEX "idx_course_question_options_question_id" ON "public"."course_question_options" USING "btree" ("question_id");



CREATE INDEX "idx_courses_company_id" ON "public"."courses" USING "btree" ("company_id");



CREATE INDEX "idx_courses_deleted_at" ON "public"."courses" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_quiz_attempts_quiz" ON "public"."quiz_attempts" USING "btree" ("quiz_id");



CREATE INDEX "idx_quiz_attempts_user" ON "public"."quiz_attempts" USING "btree" ("user_id");



CREATE INDEX "idx_quiz_options_question" ON "public"."quiz_options" USING "btree" ("question_id");



CREATE INDEX "idx_quiz_questions_quiz" ON "public"."quiz_questions" USING "btree" ("quiz_id");



CREATE INDEX "idx_quizzes_company" ON "public"."quizzes" USING "btree" ("company_id");



CREATE INDEX "idx_quizzes_content" ON "public"."quizzes" USING "btree" ("content_id");



CREATE INDEX "idx_repositories_company_id" ON "public"."repositories" USING "btree" ("company_id");



CREATE INDEX "idx_repositories_deleted_at" ON "public"."repositories" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_deleted_at" ON "public"."users" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE OR REPLACE TRIGGER "set_checklist_answers_updated_at" BEFORE UPDATE ON "public"."checklist_answers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_checklist_questions_updated_at" BEFORE UPDATE ON "public"."checklist_questions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_checklist_sections_updated_at" BEFORE UPDATE ON "public"."checklist_sections" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_checklist_submissions_updated_at" BEFORE UPDATE ON "public"."checklist_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "set_checklists_updated_at" BEFORE UPDATE ON "public"."checklists" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_action_plan_created_by_fkey" FOREIGN KEY ("action_plan_created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."checklist_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_answers"
    ADD CONSTRAINT "checklist_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."checklist_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_folders"
    ADD CONSTRAINT "checklist_folders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_questions"
    ADD CONSTRAINT "checklist_questions_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_questions"
    ADD CONSTRAINT "checklist_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_sections"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."checklist_sections"
    ADD CONSTRAINT "checklist_sections_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_submissions"
    ADD CONSTRAINT "checklist_submissions_checklist_id_fkey" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_submissions"
    ADD CONSTRAINT "checklist_submissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklist_submissions"
    ADD CONSTRAINT "checklist_submissions_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id");



ALTER TABLE ONLY "public"."checklist_submissions"
    ADD CONSTRAINT "checklist_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checklists"
    ADD CONSTRAINT "checklists_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "public"."checklist_folders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_org_top_level_id_fkey" FOREIGN KEY ("org_top_level_id") REFERENCES "public"."org_top_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ratings"
    ADD CONSTRAINT "content_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_org_top_level_id_fkey" FOREIGN KEY ("org_top_level_id") REFERENCES "public"."org_top_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_views"
    ADD CONSTRAINT "content_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contents"
    ADD CONSTRAINT "contents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contents"
    ADD CONSTRAINT "contents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contents"
    ADD CONSTRAINT "contents_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_answers"
    ADD CONSTRAINT "course_answers_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_answers"
    ADD CONSTRAINT "course_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."course_phase_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_answers"
    ADD CONSTRAINT "course_answers_selected_option_id_fkey" FOREIGN KEY ("selected_option_id") REFERENCES "public"."course_question_options"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."course_contents"
    ADD CONSTRAINT "course_contents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_contents"
    ADD CONSTRAINT "course_contents_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_enrollments"
    ADD CONSTRAINT "course_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_phase_questions"
    ADD CONSTRAINT "course_phase_questions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_question_options"
    ADD CONSTRAINT "course_question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."course_phase_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_top_levels"
    ADD CONSTRAINT "org_top_levels_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_top_levels"
    ADD CONSTRAINT "org_top_levels_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."org_top_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_units"
    ADD CONSTRAINT "org_units_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_units"
    ADD CONSTRAINT "org_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."org_top_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_attempts"
    ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_options"
    ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quiz_questions"
    ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "public"."quizzes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."contents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quizzes"
    ADD CONSTRAINT "quizzes_course_content_id_fkey" FOREIGN KEY ("course_content_id") REFERENCES "public"."course_contents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repositories"
    ADD CONSTRAINT "repositories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_links"
    ADD CONSTRAINT "simple_links_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_links"
    ADD CONSTRAINT "simple_links_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_top_level_id_fkey" FOREIGN KEY ("org_top_level_id") REFERENCES "public"."org_top_levels"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "public"."org_units"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can delete checklist folders" ON "public"."checklist_folders" FOR DELETE USING ((("company_id" = "public"."get_auth_user_company_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))))));



CREATE POLICY "Admins can insert checklist folders" ON "public"."checklist_folders" FOR INSERT WITH CHECK ((("company_id" = "public"."get_auth_user_company_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))))));



CREATE POLICY "Admins can manage checklists" ON "public"."checklists" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ADMIN'::"text") AND ("u"."company_id" = "checklists"."company_id")))))));



CREATE POLICY "Admins can manage options" ON "public"."quiz_options" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))) AND ("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Admins can manage questions" ON "public"."checklist_questions" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ADMIN'::"text") AND ("u"."company_id" = ( SELECT "checklists"."company_id"
           FROM "public"."checklists"
          WHERE ("checklists"."id" = "checklist_questions"."checklist_id")))))))));



CREATE POLICY "Admins can manage questions" ON "public"."quiz_questions" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))) AND ("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Admins can manage quizzes" ON "public"."quizzes" USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))) AND ("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Admins can manage sections" ON "public"."checklist_sections" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ADMIN'::"text") AND ("u"."company_id" = ( SELECT "checklists"."company_id"
           FROM "public"."checklists"
          WHERE ("checklists"."id" = "checklist_sections"."checklist_id")))))))));



CREATE POLICY "Admins can update checklist folders" ON "public"."checklist_folders" FOR UPDATE USING ((("company_id" = "public"."get_auth_user_company_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))))));



CREATE POLICY "Admins can view all attempts from their company" ON "public"."quiz_attempts" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND ("users"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))) AND ("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())))));



CREATE POLICY "Admins criam usuários" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK ((((("auth"."jwt"() -> 'user_metadata'::"text") ->> 'role'::"text") = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) OR ("role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))));



CREATE POLICY "Admins cuidam das units" ON "public"."org_units" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))));



CREATE POLICY "Admins cuidam dos times" ON "public"."org_top_levels" USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"]))))));



CREATE POLICY "Admins editam Categorias" ON "public"."categories" TO "authenticated" USING (((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."repositories" "r"
  WHERE (("r"."id" = "categories"."repository_id") AND ("r"."company_id" = "public"."get_auth_user_company_id"()))))) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Admins editam Conteudos" ON "public"."contents" TO "authenticated" USING (((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Admins editam Links" ON "public"."simple_links" TO "authenticated" USING (((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Admins editam repositorios" ON "public"."repositories" TO "authenticated" USING (((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Admins gerenciam usuarios da mesma empresa" ON "public"."users" TO "authenticated" USING ((("public"."get_auth_user_role"() = 'ADMIN'::"text") AND ("public"."get_auth_user_company_id"() = "company_id")));



CREATE POLICY "Admins manage company enrollments" ON "public"."course_enrollments" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("company_id" = "public"."get_auth_user_company_id"())));



CREATE POLICY "Admins manage course contents" ON "public"."course_contents" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("public"."get_auth_user_company_id"() = "company_id")));



CREATE POLICY "Admins manage course questions" ON "public"."course_phase_questions" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "course_phase_questions"."module_id") AND ("c"."company_id" = "public"."get_auth_user_company_id"())))))) WITH CHECK ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "course_phase_questions"."module_id") AND ("c"."company_id" = "public"."get_auth_user_company_id"()))))));



CREATE POLICY "Admins manage courses" ON "public"."courses" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND ("public"."get_auth_user_company_id"() = "company_id")));



CREATE POLICY "Admins manage modules" ON "public"."course_modules" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_modules"."course_id") AND ("c"."company_id" = "public"."get_auth_user_company_id"()))))));



CREATE POLICY "Admins manage question options" ON "public"."course_question_options" TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM (("public"."course_phase_questions" "q"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "q"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("q"."id" = "course_question_options"."question_id") AND ("c"."company_id" = "public"."get_auth_user_company_id"())))))) WITH CHECK ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM (("public"."course_phase_questions" "q"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "q"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("q"."id" = "course_question_options"."question_id") AND ("c"."company_id" = "public"."get_auth_user_company_id"()))))));



CREATE POLICY "Admins view company answers" ON "public"."course_answers" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "e"
  WHERE (("e"."id" = "course_answers"."enrollment_id") AND ("e"."company_id" = "public"."get_auth_user_company_id"()))))));



CREATE POLICY "Autenticados alteram proprio perfil" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Checklists visible to correct users" ON "public"."checklists" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND (("u"."role" = 'SUPER_ADMIN'::"text") OR (("u"."role" = 'ADMIN'::"text") AND ("u"."company_id" = "checklists"."company_id")) OR (("u"."company_id" = "checklists"."company_id") AND ("checklists"."status" = 'ACTIVE'::"text") AND (NOT ("u"."id" = ANY ("checklists"."excluded_user_ids"))) AND (("checklists"."access_type" = 'ALL'::"text") OR (("checklists"."access_type" = 'RESTRICTED'::"text") AND (("u"."id" = ANY ("checklists"."allowed_user_ids")) OR ("u"."org_unit_id" = ANY ("checklists"."allowed_store_ids")) OR ("u"."org_top_level_id" = ANY ("checklists"."allowed_region_ids")))))))))));



CREATE POLICY "Gestão de empresas por Admins" ON "public"."companies" TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Inserção de visualizações" ON "public"."content_views" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Inserção/Edição de avaliações" ON "public"."content_ratings" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Leitura Pública de Conteúdos da Landing Page" ON "public"."contents" FOR SELECT USING ((("status" = 'ACTIVE'::"text") AND ("repository_id" IN ( SELECT "repositories"."id"
   FROM "public"."repositories"
  WHERE (("repositories"."show_in_landing" = true) AND ("repositories"."status" = 'ACTIVE'::"text"))))));



CREATE POLICY "Leitura Pública de Landing Page" ON "public"."repositories" FOR SELECT USING ((("status" = 'ACTIVE'::"text") AND ("show_in_landing" = true)));



CREATE POLICY "Leitura Pública de Links Simples da Landing Page" ON "public"."simple_links" FOR SELECT USING ((("status" = 'ACTIVE'::"text") AND ("repository_id" IN ( SELECT "repositories"."id"
   FROM "public"."repositories"
  WHERE (("repositories"."show_in_landing" = true) AND ("repositories"."status" = 'ACTIVE'::"text"))))));



CREATE POLICY "Leitura das Categorias" ON "public"."categories" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."repositories" "r"
  WHERE (("r"."id" = "categories"."repository_id") AND ("r"."company_id" = "public"."get_auth_user_company_id"())))) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Leitura de Conteúdos" ON "public"."contents" FOR SELECT TO "authenticated" USING (((("status" = 'ACTIVE'::"text") AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Leitura de Links simples" ON "public"."simple_links" FOR SELECT TO "authenticated" USING (((("status" = 'ACTIVE'::"text") AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Leitura de Repositorios Ativos" ON "public"."repositories" FOR SELECT TO "authenticated" USING (((("status" = 'ACTIVE'::"text") AND ("company_id" = "public"."get_auth_user_company_id"())) OR ("public"."get_auth_user_role"() = 'SUPER_ADMIN'::"text")));



CREATE POLICY "Leitura de avaliações" ON "public"."content_ratings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Leitura de visualizações" ON "public"."content_views" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Leitura pública de empresas" ON "public"."companies" FOR SELECT USING (true);



CREATE POLICY "Questions visible if checklist is visible" ON "public"."checklist_questions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."checklists" "c"
  WHERE ("c"."id" = "checklist_questions"."checklist_id"))));



CREATE POLICY "Questions visible to authenticated" ON "public"."checklist_questions" FOR SELECT USING (true);



CREATE POLICY "Sections visible if checklist is visible" ON "public"."checklist_sections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."checklists" "c"
  WHERE ("c"."id" = "checklist_sections"."checklist_id"))));



CREATE POLICY "Sections visible to authenticated" ON "public"."checklist_sections" FOR SELECT USING (true);



CREATE POLICY "Super Admins gerenciam tudo" ON "public"."users" TO "authenticated" USING (("public"."is_super_admin"() OR ("id" = "auth"."uid"())));



CREATE POLICY "Users can delete notifications" ON "public"."notifications" FOR DELETE TO "authenticated" USING ((("public"."get_auth_user_company_id"() = "company_id") AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))));



CREATE POLICY "Users can insert notifications" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("public"."get_auth_user_company_id"() = "company_id"));



CREATE POLICY "Users can insert their own attempts" ON "public"."quiz_attempts" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage answers of their submissions" ON "public"."checklist_answers" USING ((EXISTS ( SELECT 1
   FROM "public"."checklist_submissions" "s"
  WHERE (("s"."id" = "checklist_answers"."submission_id") AND (("s"."user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."users" "u"
          WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ADMIN'::"text"])) AND ("u"."company_id" = "s"."company_id")))))))));



CREATE POLICY "Users can manage their own submissions" ON "public"."checklist_submissions" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['SUPER_ADMIN'::"text", 'ADMIN'::"text"])) AND ("u"."company_id" = "checklist_submissions"."company_id"))))));



CREATE POLICY "Users can update notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("public"."get_auth_user_company_id"() = "company_id") AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))));



CREATE POLICY "Users can view checklist folders of their company" ON "public"."checklist_folders" FOR SELECT USING (("company_id" = "public"."get_auth_user_company_id"()));



CREATE POLICY "Users can view notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_company_id"() = "company_id") AND (("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("public"."get_auth_user_role"() = ANY (ARRAY['ADMIN'::"text", 'SUPER_ADMIN'::"text"])))));



CREATE POLICY "Users can view options from their company" ON "public"."quiz_options" FOR SELECT USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view questions from their company" ON "public"."quiz_questions" FOR SELECT USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view quizzes from their company" ON "public"."quizzes" FOR SELECT USING (("company_id" = ( SELECT "users"."company_id"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own attempts" ON "public"."quiz_attempts" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users manage own answers" ON "public"."course_answers" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "e"
  WHERE (("e"."id" = "course_answers"."enrollment_id") AND ("e"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."course_enrollments" "e"
  WHERE (("e"."id" = "course_answers"."enrollment_id") AND ("e"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users manage own enrollment" ON "public"."course_enrollments" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users view active courses" ON "public"."courses" FOR SELECT TO "authenticated" USING ((("status" = 'ACTIVE'::"text") AND ("public"."get_auth_user_company_id"() = "company_id")));



CREATE POLICY "Users view contents of active courses" ON "public"."course_contents" FOR SELECT TO "authenticated" USING ((("public"."get_auth_user_company_id"() = "company_id") AND (EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "course_contents"."module_id") AND ("c"."status" = 'ACTIVE'::"text"))))));



CREATE POLICY "Users view modules of active courses" ON "public"."course_modules" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_modules"."course_id") AND ("c"."status" = 'ACTIVE'::"text") AND ("c"."company_id" = "public"."get_auth_user_company_id"())))));



CREATE POLICY "Users view options of active courses" ON "public"."course_question_options" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."course_phase_questions" "q"
     JOIN "public"."course_modules" "m" ON (("m"."id" = "q"."module_id")))
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("q"."id" = "course_question_options"."question_id") AND ("c"."status" = 'ACTIVE'::"text") AND ("c"."company_id" = "public"."get_auth_user_company_id"())))));



CREATE POLICY "Users view questions of active courses" ON "public"."course_phase_questions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."course_modules" "m"
     JOIN "public"."courses" "c" ON (("c"."id" = "m"."course_id")))
  WHERE (("m"."id" = "course_phase_questions"."module_id") AND ("c"."status" = 'ACTIVE'::"text") AND ("c"."company_id" = "public"."get_auth_user_company_id"())))));



CREATE POLICY "Usuários atualizam próprio perfil" ON "public"."users" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Usuários leem seus times" ON "public"."org_top_levels" FOR SELECT USING (true);



CREATE POLICY "Usuários leem suas units" ON "public"."org_units" FOR SELECT USING (true);



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_folders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_sections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklist_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checklists" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_ratings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_answers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_contents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_enrollments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_phase_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."course_question_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_top_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_attempts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quiz_questions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quizzes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repositories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simple_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."checklist_folders";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_user_email_exists"("lookup_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."check_user_email_exists"("lookup_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_user_email_exists"("lookup_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_company_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_company_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_company_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_auth_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_provisioned_user"("lookup_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_provisioned_user"("lookup_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_provisioned_user"("lookup_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_user_stats"("user_id_param" "uuid", "xp_to_add" integer, "coins_to_add" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("user_id_param" "uuid", "xp_to_add" integer, "coins_to_add" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_user_stats"("user_id_param" "uuid", "xp_to_add" integer, "coins_to_add" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";


















GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_answers" TO "anon";
GRANT ALL ON TABLE "public"."checklist_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_answers" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_folders" TO "anon";
GRANT ALL ON TABLE "public"."checklist_folders" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_folders" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_questions" TO "anon";
GRANT ALL ON TABLE "public"."checklist_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_questions" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_sections" TO "anon";
GRANT ALL ON TABLE "public"."checklist_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_sections" TO "service_role";



GRANT ALL ON TABLE "public"."checklist_submissions" TO "anon";
GRANT ALL ON TABLE "public"."checklist_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."checklist_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."checklists" TO "anon";
GRANT ALL ON TABLE "public"."checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."checklists" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."content_ratings" TO "anon";
GRANT ALL ON TABLE "public"."content_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."content_ratings" TO "service_role";



GRANT ALL ON TABLE "public"."content_views" TO "anon";
GRANT ALL ON TABLE "public"."content_views" TO "authenticated";
GRANT ALL ON TABLE "public"."content_views" TO "service_role";



GRANT ALL ON TABLE "public"."contents" TO "anon";
GRANT ALL ON TABLE "public"."contents" TO "authenticated";
GRANT ALL ON TABLE "public"."contents" TO "service_role";



GRANT ALL ON TABLE "public"."course_answers" TO "anon";
GRANT ALL ON TABLE "public"."course_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."course_answers" TO "service_role";



GRANT ALL ON TABLE "public"."course_contents" TO "anon";
GRANT ALL ON TABLE "public"."course_contents" TO "authenticated";
GRANT ALL ON TABLE "public"."course_contents" TO "service_role";



GRANT ALL ON TABLE "public"."course_enrollments" TO "anon";
GRANT ALL ON TABLE "public"."course_enrollments" TO "authenticated";
GRANT ALL ON TABLE "public"."course_enrollments" TO "service_role";



GRANT ALL ON TABLE "public"."course_modules" TO "anon";
GRANT ALL ON TABLE "public"."course_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."course_modules" TO "service_role";



GRANT ALL ON TABLE "public"."course_phase_questions" TO "anon";
GRANT ALL ON TABLE "public"."course_phase_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."course_phase_questions" TO "service_role";



GRANT ALL ON TABLE "public"."course_question_options" TO "anon";
GRANT ALL ON TABLE "public"."course_question_options" TO "authenticated";
GRANT ALL ON TABLE "public"."course_question_options" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."org_top_levels" TO "anon";
GRANT ALL ON TABLE "public"."org_top_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."org_top_levels" TO "service_role";



GRANT ALL ON TABLE "public"."org_units" TO "anon";
GRANT ALL ON TABLE "public"."org_units" TO "authenticated";
GRANT ALL ON TABLE "public"."org_units" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_attempts" TO "anon";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_options" TO "anon";
GRANT ALL ON TABLE "public"."quiz_options" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_options" TO "service_role";



GRANT ALL ON TABLE "public"."quiz_questions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_questions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_questions" TO "service_role";



GRANT ALL ON TABLE "public"."quizzes" TO "anon";
GRANT ALL ON TABLE "public"."quizzes" TO "authenticated";
GRANT ALL ON TABLE "public"."quizzes" TO "service_role";



GRANT ALL ON TABLE "public"."repositories" TO "anon";
GRANT ALL ON TABLE "public"."repositories" TO "authenticated";
GRANT ALL ON TABLE "public"."repositories" TO "service_role";



GRANT ALL ON TABLE "public"."simple_links" TO "anon";
GRANT ALL ON TABLE "public"."simple_links" TO "authenticated";
GRANT ALL ON TABLE "public"."simple_links" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































