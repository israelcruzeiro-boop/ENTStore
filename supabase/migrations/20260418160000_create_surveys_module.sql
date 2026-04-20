-- ============================================================================
-- MIGRATION: Criar módulo de Pesquisas (Surveys)
-- Tabelas: surveys, survey_questions, survey_responses, survey_answers
-- Triggers: handle_updated_at em todas, enforce_survey_response_uniqueness
-- RPC: submit_survey_response(p_payload jsonb)
-- ============================================================================

-- ============================================================================
-- 1. SURVEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED')),
  access_type text NOT NULL DEFAULT 'ALL' CHECK (access_type IN ('ALL', 'RESTRICTED')),
  allowed_user_ids uuid[] NOT NULL DEFAULT '{}',
  allowed_region_ids uuid[] NOT NULL DEFAULT '{}',
  allowed_store_ids uuid[] NOT NULL DEFAULT '{}',
  excluded_user_ids uuid[] NOT NULL DEFAULT '{}',
  allow_multiple_responses boolean NOT NULL DEFAULT false,
  anonymous boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  cover_image text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 2. SURVEY_QUESTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  description text,
  question_type text NOT NULL CHECK (question_type IN (
    'SHORT_TEXT', 'LONG_TEXT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE',
    'RATING', 'NPS', 'DATE', 'NUMBER', 'YES_NO'
  )),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  required boolean NOT NULL DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================================================
-- 3. SURVEY_RESPONSES (uma resposta = uma submissão do usuário)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  org_unit_id uuid,
  org_top_level_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. SURVEY_ANSWERS (cada resposta individual por pergunta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_surveys_company_id ON public.surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON public.surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_deleted_at ON public.surveys(deleted_at);
CREATE INDEX IF NOT EXISTS idx_surveys_dates ON public.surveys(starts_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id ON public.survey_questions(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_questions_deleted_at ON public.survey_questions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_survey_questions_order ON public.survey_questions(survey_id, order_index);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON public.survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_user_id ON public.survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_company_id ON public.survey_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_user ON public.survey_responses(survey_id, user_id);

CREATE INDEX IF NOT EXISTS idx_survey_answers_response_id ON public.survey_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_survey_answers_question_id ON public.survey_answers(question_id);

-- ============================================================================
-- TRIGGERS - updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_surveys_updated_at ON public.surveys;
CREATE TRIGGER trg_surveys_updated_at BEFORE UPDATE ON public.surveys
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_survey_questions_updated_at ON public.survey_questions;
CREATE TRIGGER trg_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trg_survey_responses_updated_at ON public.survey_responses;
CREATE TRIGGER trg_survey_responses_updated_at BEFORE UPDATE ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TRIGGER - impedir resposta duplicada quando allow_multiple_responses = false
-- (substitui partial unique index que não pode referenciar outra tabela)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.enforce_survey_response_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $SURVEY_TRIG$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.surveys
    WHERE id = NEW.survey_id AND allow_multiple_responses = true
  ) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.survey_responses
    WHERE survey_id = NEW.survey_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Este usuário já respondeu esta pesquisa'
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$SURVEY_TRIG$;

ALTER FUNCTION public.enforce_survey_response_uniqueness() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_enforce_survey_response_uniqueness ON public.survey_responses;
CREATE TRIGGER trg_enforce_survey_response_uniqueness
  BEFORE INSERT ON public.survey_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_survey_response_uniqueness();

-- ============================================================================
-- RPC - submit_survey_response
-- Payload esperado:
-- {
--   "survey_id": "uuid",
--   "started_at": "iso-timestamp" | null,
--   "answers": [
--     { "question_id": "uuid", "value": <jsonb> }
--   ]
-- }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_survey_response(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $SURVEY_RPC$
DECLARE
  v_caller_id          uuid;
  v_target_survey_id   uuid;
  v_started_ts         timestamptz;
  v_survey_company_id  uuid;
  v_survey_status      text;
  v_survey_starts_at   timestamptz;
  v_survey_ends_at     timestamptz;
  v_caller_company_id  uuid;
  v_caller_org_unit_id uuid;
  v_caller_org_top_id  uuid;
  v_new_response_id    uuid;
  v_answer             jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  v_target_survey_id := (p_payload->>'survey_id')::uuid;
  IF v_target_survey_id IS NULL THEN
    RAISE EXCEPTION 'survey_id é obrigatório' USING ERRCODE = '22023';
  END IF;

  v_started_ts := COALESCE(NULLIF(p_payload->>'started_at', '')::timestamptz, now());

  -- Atribuição via subquery escalar (evita o padrão SELECT INTO que falha no editor Supabase)
  v_survey_company_id := (
    SELECT company_id FROM public.surveys
    WHERE id = v_target_survey_id AND deleted_at IS NULL
    LIMIT 1
  );

  IF v_survey_company_id IS NULL THEN
    RAISE EXCEPTION 'Pesquisa não encontrada' USING ERRCODE = 'P0002';
  END IF;

  v_survey_status    := (SELECT status    FROM public.surveys WHERE id = v_target_survey_id LIMIT 1);
  v_survey_starts_at := (SELECT starts_at FROM public.surveys WHERE id = v_target_survey_id LIMIT 1);
  v_survey_ends_at   := (SELECT ends_at   FROM public.surveys WHERE id = v_target_survey_id LIMIT 1);

  IF v_survey_status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Pesquisa não está ativa' USING ERRCODE = '22023';
  END IF;

  IF v_survey_starts_at IS NOT NULL AND now() < v_survey_starts_at THEN
    RAISE EXCEPTION 'Pesquisa ainda não iniciou' USING ERRCODE = '22023';
  END IF;

  IF v_survey_ends_at IS NOT NULL AND now() > v_survey_ends_at THEN
    RAISE EXCEPTION 'Pesquisa já encerrou' USING ERRCODE = '22023';
  END IF;

  v_caller_company_id  := (SELECT company_id       FROM public.users WHERE id = v_caller_id LIMIT 1);
  v_caller_org_unit_id := (SELECT org_unit_id      FROM public.users WHERE id = v_caller_id LIMIT 1);
  v_caller_org_top_id  := (SELECT org_top_level_id FROM public.users WHERE id = v_caller_id LIMIT 1);

  IF v_caller_company_id IS NULL OR v_caller_company_id <> v_survey_company_id THEN
    RAISE EXCEPTION 'Usuário não pertence à empresa desta pesquisa' USING ERRCODE = '42501';
  END IF;

  v_new_response_id := gen_random_uuid();

  INSERT INTO public.survey_responses (
    id, survey_id, company_id, user_id, org_unit_id, org_top_level_id,
    started_at, completed_at
  ) VALUES (
    v_new_response_id, v_target_survey_id, v_survey_company_id, v_caller_id,
    v_caller_org_unit_id, v_caller_org_top_id,
    v_started_ts, now()
  );

  FOR v_answer IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'answers', '[]'::jsonb))
  LOOP
    INSERT INTO public.survey_answers (response_id, question_id, value)
    VALUES (
      v_new_response_id,
      (v_answer->>'question_id')::uuid,
      v_answer->'value'
    );
  END LOOP;

  RETURN v_new_response_id;
END;
$SURVEY_RPC$;

ALTER FUNCTION public.submit_survey_response(jsonb) OWNER TO postgres;

-- ============================================================================
-- RLS - SURVEYS
-- ============================================================================
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surveys_select" ON public.surveys;
CREATE POLICY "surveys_select" ON public.surveys
  FOR SELECT USING (
    company_id = public.get_auth_user_company_id()
    OR public.get_auth_user_role() = 'SUPER_ADMIN'
  );

DROP POLICY IF EXISTS "surveys_insert_admin" ON public.surveys;
CREATE POLICY "surveys_insert_admin" ON public.surveys
  FOR INSERT WITH CHECK (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
  );

DROP POLICY IF EXISTS "surveys_update_admin" ON public.surveys;
CREATE POLICY "surveys_update_admin" ON public.surveys
  FOR UPDATE USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
  );

DROP POLICY IF EXISTS "surveys_delete_admin" ON public.surveys;
CREATE POLICY "surveys_delete_admin" ON public.surveys
  FOR DELETE USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
  );

-- ============================================================================
-- RLS - SURVEY_QUESTIONS
-- ============================================================================
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_questions_select" ON public.survey_questions;
CREATE POLICY "survey_questions_select" ON public.survey_questions
  FOR SELECT USING (
    survey_id IN (
      SELECT id FROM public.surveys
      WHERE company_id = public.get_auth_user_company_id()
    )
    OR public.get_auth_user_role() = 'SUPER_ADMIN'
  );

DROP POLICY IF EXISTS "survey_questions_insert_admin" ON public.survey_questions;
CREATE POLICY "survey_questions_insert_admin" ON public.survey_questions
  FOR INSERT WITH CHECK (
    public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
    AND survey_id IN (
      SELECT id FROM public.surveys
      WHERE company_id = public.get_auth_user_company_id()
    )
  );

DROP POLICY IF EXISTS "survey_questions_update_admin" ON public.survey_questions;
CREATE POLICY "survey_questions_update_admin" ON public.survey_questions
  FOR UPDATE USING (
    public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
    AND survey_id IN (
      SELECT id FROM public.surveys
      WHERE company_id = public.get_auth_user_company_id()
    )
  );

DROP POLICY IF EXISTS "survey_questions_delete_admin" ON public.survey_questions;
CREATE POLICY "survey_questions_delete_admin" ON public.survey_questions
  FOR DELETE USING (
    public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
    AND survey_id IN (
      SELECT id FROM public.surveys
      WHERE company_id = public.get_auth_user_company_id()
    )
  );

-- ============================================================================
-- RLS - SURVEY_RESPONSES
-- SELECT: admin vê todas da empresa, usuário vê as próprias
-- INSERT: bloqueado diretamente (somente via RPC submit_survey_response)
-- ============================================================================
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_responses_select" ON public.survey_responses;
CREATE POLICY "survey_responses_select" ON public.survey_responses
  FOR SELECT USING (
    public.get_auth_user_role() = 'SUPER_ADMIN'
    OR (
      company_id = public.get_auth_user_company_id()
      AND (
        public.get_auth_user_role() = 'ADMIN'
        OR user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "survey_responses_delete_admin" ON public.survey_responses;
CREATE POLICY "survey_responses_delete_admin" ON public.survey_responses
  FOR DELETE USING (
    company_id = public.get_auth_user_company_id()
    AND public.get_auth_user_role() = ANY (ARRAY['ADMIN', 'SUPER_ADMIN'])
  );

-- ============================================================================
-- RLS - SURVEY_ANSWERS
-- SELECT segue a política da survey_responses (herda via join)
-- INSERT: bloqueado diretamente (somente via RPC)
-- ============================================================================
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey_answers_select" ON public.survey_answers;
CREATE POLICY "survey_answers_select" ON public.survey_answers
  FOR SELECT USING (
    response_id IN (
      SELECT id FROM public.survey_responses
      WHERE
        public.get_auth_user_role() = 'SUPER_ADMIN'
        OR (
          company_id = public.get_auth_user_company_id()
          AND (
            public.get_auth_user_role() = 'ADMIN'
            OR user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT SELECT, DELETE ON public.survey_responses TO authenticated;
GRANT SELECT ON public.survey_answers TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_survey_response(jsonb) TO authenticated;

-- Recarrega o schema do PostgREST para expor a RPC imediatamente
NOTIFY pgrst, 'reload schema';
