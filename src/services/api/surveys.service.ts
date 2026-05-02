import { api } from './client';
import type {
  ApiSurvey,
  ApiSurveyAnswer,
  ApiSurveyQuestion,
  ApiSurveyResponse,
} from './types';

type SurveyPayload = Record<string, unknown>;

const compact = <T extends Record<string, unknown>>(payload: T): T => {
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });
  return payload;
};

const toSurveyPayload = (payload: SurveyPayload) => compact({
  title: payload.title,
  description: payload.description ?? null,
  status: payload.status,
  accessType: payload.access_type ?? payload.accessType,
  allowedUserIds: payload.allowed_user_ids ?? payload.allowedUserIds,
  allowedRegionIds: payload.allowed_region_ids ?? payload.allowedRegionIds,
  allowedStoreIds: payload.allowed_store_ids ?? payload.allowedStoreIds,
  excludedUserIds: payload.excluded_user_ids ?? payload.excludedUserIds,
  allowMultipleResponses: payload.allow_multiple_responses ?? payload.allowMultipleResponses,
  anonymous: payload.anonymous,
  startsAt: payload.starts_at ?? payload.startsAt ?? null,
  endsAt: payload.ends_at ?? payload.endsAt ?? null,
  coverImage: payload.cover_image ?? payload.coverImage ?? null,
});

const toQuestionPayload = (payload: SurveyPayload, options?: { includeIdentity?: boolean }) => compact({
  id: options?.includeIdentity ? payload.id : undefined,
  surveyId: payload.survey_id ?? payload.surveyId,
  questionText: payload.question_text ?? payload.questionText,
  description: payload.description,
  questionType: payload.question_type ?? payload.questionType,
  configuration: payload.configuration,
  required: payload.required,
  orderIndex: payload.order_index ?? payload.orderIndex,
});

export const surveysApiService = {
  listSurveys: () => api.get<ApiSurvey[]>('/surveys'),
  getSurvey: (id: string) => api.get<ApiSurvey>(`/surveys/${encodeURIComponent(id)}`),
  listQuestions: (surveyId: string) =>
    api.get<ApiSurveyQuestion[]>(`/surveys/${encodeURIComponent(surveyId)}/questions`),
  listResponses: (surveyId: string) =>
    api.get<ApiSurveyResponse[]>(`/surveys/${encodeURIComponent(surveyId)}/responses`),
  listUserResponses: () => api.get<ApiSurveyResponse[]>('/users/me/survey-responses'),
  listAnswers: (surveyId: string) =>
    api.get<ApiSurveyAnswer[]>(`/surveys/${encodeURIComponent(surveyId)}/answers`),

  createSurvey: (payload: SurveyPayload) =>
    api.post<ApiSurvey>('/admin/surveys', toSurveyPayload(payload)),
  updateSurvey: (id: string, payload: SurveyPayload) =>
    api.put<ApiSurvey>(`/admin/surveys/${encodeURIComponent(id)}`, toSurveyPayload(payload)),
  deleteSurvey: (id: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/surveys/${encodeURIComponent(id)}`),

  createQuestion: (surveyId: string, payload: SurveyPayload) =>
    api.post<ApiSurveyQuestion>(`/admin/surveys/${encodeURIComponent(surveyId)}/questions`, toQuestionPayload(payload, { includeIdentity: true })),
  updateQuestion: (id: string, payload: SurveyPayload) =>
    api.put<ApiSurveyQuestion>(`/admin/survey-questions/${encodeURIComponent(id)}`, toQuestionPayload(payload)),
  deleteQuestion: (id: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/survey-questions/${encodeURIComponent(id)}`),
  reorderQuestions: (updates: Array<{ id: string; order_index: number }>) =>
    api.post<{ updated: number }>('/admin/survey-questions/reorder', {
      items: updates.map((update) => ({ id: update.id, orderIndex: update.order_index })),
    }),
};
