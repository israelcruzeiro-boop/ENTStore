import { z } from 'zod';

// ============================================================================
// ENUMS
// ============================================================================

export const surveyStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export type SurveyStatus = z.infer<typeof surveyStatusSchema>;

export const surveyAccessTypeSchema = z.enum(['ALL', 'RESTRICTED']);
export type SurveyAccessType = z.infer<typeof surveyAccessTypeSchema>;

export const surveyQuestionTypeSchema = z.enum([
  'SHORT_TEXT',
  'LONG_TEXT',
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'RATING',
  'NPS',
  'DATE',
  'NUMBER',
  'YES_NO',
]);
export type SurveyQuestionType = z.infer<typeof surveyQuestionTypeSchema>;

// ============================================================================
// QUESTION CONFIGURATIONS (discriminated union por question_type)
// ============================================================================

export const choiceOptionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1, 'Texto da opção é obrigatório'),
});
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export const shortTextConfigSchema = z.object({
  type: z.literal('SHORT_TEXT'),
  placeholder: z.string().optional(),
  max_length: z.number().int().positive().optional(),
});

export const longTextConfigSchema = z.object({
  type: z.literal('LONG_TEXT'),
  placeholder: z.string().optional(),
  max_length: z.number().int().positive().optional(),
});

export const singleChoiceConfigSchema = z.object({
  type: z.literal('SINGLE_CHOICE'),
  options: z.array(choiceOptionSchema).min(2, 'Inclua pelo menos 2 opções'),
  allow_other: z.boolean().default(false),
});

export const multipleChoiceConfigSchema = z.object({
  type: z.literal('MULTIPLE_CHOICE'),
  options: z.array(choiceOptionSchema).min(2, 'Inclua pelo menos 2 opções'),
  allow_other: z.boolean().default(false),
  min_selections: z.number().int().min(0).optional(),
  max_selections: z.number().int().positive().optional(),
});

export const ratingConfigSchema = z.object({
  type: z.literal('RATING'),
  max: z.number().int().min(3).max(10).default(5),
  icon: z.enum(['STAR', 'HEART', 'THUMB']).default('STAR'),
  low_label: z.string().optional(),
  high_label: z.string().optional(),
});

export const npsConfigSchema = z.object({
  type: z.literal('NPS'),
  low_label: z.string().default('Nada provável'),
  high_label: z.string().default('Extremamente provável'),
});

export const dateConfigSchema = z.object({
  type: z.literal('DATE'),
  min_date: z.string().optional(),
  max_date: z.string().optional(),
});

export const numberConfigSchema = z.object({
  type: z.literal('NUMBER'),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  unit: z.string().optional(),
});

export const yesNoConfigSchema = z.object({
  type: z.literal('YES_NO'),
  yes_label: z.string().default('Sim'),
  no_label: z.string().default('Não'),
});

export const questionConfigurationSchema = z.discriminatedUnion('type', [
  shortTextConfigSchema,
  longTextConfigSchema,
  singleChoiceConfigSchema,
  multipleChoiceConfigSchema,
  ratingConfigSchema,
  npsConfigSchema,
  dateConfigSchema,
  numberConfigSchema,
  yesNoConfigSchema,
]);
export type QuestionConfiguration = z.infer<typeof questionConfigurationSchema>;

// ============================================================================
// ANSWER VALUES (discriminated union)
// ============================================================================

export const shortTextAnswerSchema = z.object({
  type: z.literal('SHORT_TEXT'),
  text: z.string(),
});

export const longTextAnswerSchema = z.object({
  type: z.literal('LONG_TEXT'),
  text: z.string(),
});

export const singleChoiceAnswerSchema = z.object({
  type: z.literal('SINGLE_CHOICE'),
  option_id: z.string().min(1),
  other_text: z.string().optional(),
});

export const multipleChoiceAnswerSchema = z.object({
  type: z.literal('MULTIPLE_CHOICE'),
  option_ids: z.array(z.string().min(1)),
  other_text: z.string().optional(),
});

export const ratingAnswerSchema = z.object({
  type: z.literal('RATING'),
  value: z.number().int().min(0),
});

export const npsAnswerSchema = z.object({
  type: z.literal('NPS'),
  value: z.number().int().min(0).max(10),
});

export const dateAnswerSchema = z.object({
  type: z.literal('DATE'),
  date: z.string().min(1),
});

export const numberAnswerSchema = z.object({
  type: z.literal('NUMBER'),
  value: z.number(),
});

export const yesNoAnswerSchema = z.object({
  type: z.literal('YES_NO'),
  value: z.boolean(),
});

export const answerValueSchema = z.discriminatedUnion('type', [
  shortTextAnswerSchema,
  longTextAnswerSchema,
  singleChoiceAnswerSchema,
  multipleChoiceAnswerSchema,
  ratingAnswerSchema,
  npsAnswerSchema,
  dateAnswerSchema,
  numberAnswerSchema,
  yesNoAnswerSchema,
]);
export type AnswerValue = z.infer<typeof answerValueSchema>;

// ============================================================================
// SURVEY
// ============================================================================

export const surveySchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  status: surveyStatusSchema.default('DRAFT'),
  access_type: surveyAccessTypeSchema.default('ALL'),
  allowed_user_ids: z.array(z.string().uuid()).default([]),
  allowed_region_ids: z.array(z.string().uuid()).default([]),
  allowed_store_ids: z.array(z.string().uuid()).default([]),
  excluded_user_ids: z.array(z.string().uuid()).default([]),
  allow_multiple_responses: z.boolean().default(false),
  anonymous: z.boolean().default(false),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  cover_image: z.string().url().or(z.string().length(0)).nullable().optional(),
  created_by: z.string().uuid().nullable().optional(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});
export type Survey = z.infer<typeof surveySchema>;

// ============================================================================
// SURVEY QUESTION
// ============================================================================

export const surveyQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  survey_id: z.string().uuid(),
  question_text: z.string().min(1, 'Enunciado é obrigatório'),
  description: z.string().optional().nullable(),
  question_type: surveyQuestionTypeSchema,
  configuration: questionConfigurationSchema,
  required: z.boolean().default(true),
  order_index: z.number().int().min(0).default(0),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});
export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

// ============================================================================
// SURVEY RESPONSE
// ============================================================================

export const surveyResponseSchema = z.object({
  id: z.string().uuid().optional(),
  survey_id: z.string().uuid(),
  company_id: z.string().uuid(),
  user_id: z.string().uuid().nullable().optional(),
  org_unit_id: z.string().uuid().nullable().optional(),
  org_top_level_id: z.string().uuid().nullable().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
});
export type SurveyResponse = z.infer<typeof surveyResponseSchema>;

// ============================================================================
// SURVEY ANSWER
// ============================================================================

export const surveyAnswerSchema = z.object({
  id: z.string().uuid().optional(),
  response_id: z.string().uuid(),
  question_id: z.string().uuid(),
  value: answerValueSchema,
  created_at: z.string().optional().nullable(),
});
export type SurveyAnswer = z.infer<typeof surveyAnswerSchema>;

// ============================================================================
// RPC - submit_survey_response payload
// ============================================================================

export const submitSurveyAnswerInputSchema = z.object({
  question_id: z.string().uuid(),
  value: answerValueSchema,
});
export type SubmitSurveyAnswerInput = z.infer<typeof submitSurveyAnswerInputSchema>;

export const submitSurveyResponsePayloadSchema = z.object({
  survey_id: z.string().uuid(),
  started_at: z.string().datetime().nullable().optional(),
  answers: z.array(submitSurveyAnswerInputSchema).min(1, 'Envie ao menos uma resposta'),
});
export type SubmitSurveyResponsePayload = z.infer<typeof submitSurveyResponsePayloadSchema>;

// ============================================================================
// HELPERS - construir configuração default por tipo
// ============================================================================

export function buildDefaultQuestionConfig(type: SurveyQuestionType): QuestionConfiguration {
  switch (type) {
    case 'SHORT_TEXT':
      return { type: 'SHORT_TEXT' };
    case 'LONG_TEXT':
      return { type: 'LONG_TEXT' };
    case 'SINGLE_CHOICE':
      return {
        type: 'SINGLE_CHOICE',
        options: [
          { id: crypto.randomUUID(), label: 'Opção 1' },
          { id: crypto.randomUUID(), label: 'Opção 2' },
        ],
        allow_other: false,
      };
    case 'MULTIPLE_CHOICE':
      return {
        type: 'MULTIPLE_CHOICE',
        options: [
          { id: crypto.randomUUID(), label: 'Opção 1' },
          { id: crypto.randomUUID(), label: 'Opção 2' },
        ],
        allow_other: false,
      };
    case 'RATING':
      return { type: 'RATING', max: 5, icon: 'STAR' };
    case 'NPS':
      return {
        type: 'NPS',
        low_label: 'Nada provável',
        high_label: 'Extremamente provável',
      };
    case 'DATE':
      return { type: 'DATE' };
    case 'NUMBER':
      return { type: 'NUMBER' };
    case 'YES_NO':
      return { type: 'YES_NO', yes_label: 'Sim', no_label: 'Não' };
  }
}

// ============================================================================
// LABELS (PT-BR) para uso em selects / títulos
// ============================================================================

export const SURVEY_QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  SHORT_TEXT: 'Texto curto',
  LONG_TEXT: 'Texto longo',
  SINGLE_CHOICE: 'Escolha única',
  MULTIPLE_CHOICE: 'Múltipla escolha',
  RATING: 'Avaliação (estrelas)',
  NPS: 'NPS (0 a 10)',
  DATE: 'Data',
  NUMBER: 'Número',
  YES_NO: 'Sim / Não',
};

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  ARCHIVED: 'Arquivada',
};
