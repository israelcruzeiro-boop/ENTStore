import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  SurveyAnswer,
  SubmitSurveyResponsePayload,
} from '../types/surveys';
import {
  surveySchema,
  surveyQuestionSchema,
} from '../types/surveys';
import { Logger } from '../utils/logger';
import { surveyResponsesService, surveysApiService } from './api';
import type {
  ApiSurvey,
  ApiSurveyAnswer,
  ApiSurveyQuestion,
  ApiSurveyResponse,
} from './api/types';

type SurveyWithCount = Survey & { question_count?: number };

const mapSurvey = (survey: ApiSurvey): SurveyWithCount => ({
  id: survey.id,
  company_id: survey.companyId,
  title: survey.title,
  description: survey.description,
  status: survey.status,
  access_type: survey.accessType,
  allowed_user_ids: survey.allowedUserIds,
  allowed_region_ids: survey.allowedRegionIds,
  allowed_store_ids: survey.allowedStoreIds,
  excluded_user_ids: survey.excludedUserIds,
  allow_multiple_responses: survey.allowMultipleResponses,
  anonymous: survey.anonymous,
  starts_at: survey.startsAt,
  ends_at: survey.endsAt,
  cover_image: survey.coverImage,
  created_by: survey.createdBy,
  created_at: survey.createdAt,
  updated_at: survey.updatedAt,
  question_count: survey.questionCount ?? 0,
});

const mapQuestion = (question: ApiSurveyQuestion): SurveyQuestion => ({
  id: question.id,
  survey_id: question.surveyId,
  question_text: question.questionText,
  description: question.description,
  question_type: question.questionType,
  configuration: question.configuration as SurveyQuestion['configuration'],
  required: question.required,
  order_index: question.orderIndex,
  created_at: question.createdAt,
  updated_at: question.updatedAt,
});

const mapResponse = (response: ApiSurveyResponse): SurveyResponse & {
  users?: { name?: string; email?: string; avatar_url?: string | null; org_unit_id?: string | null } | null;
  org_unit?: { id?: string; name?: string } | null;
  org_top_level?: { id?: string; name?: string } | null;
} => ({
  id: response.id,
  survey_id: response.surveyId,
  company_id: response.companyId,
  user_id: response.userId,
  org_unit_id: response.orgUnitId,
  org_top_level_id: response.orgTopLevelId,
  started_at: response.startedAt,
  completed_at: response.completedAt,
  created_at: response.createdAt,
  updated_at: response.updatedAt,
  users: response.user
    ? {
        name: response.user.name,
        email: response.user.email,
        avatar_url: response.user.avatarUrl,
        org_unit_id: response.user.orgUnitId,
      }
    : null,
  org_unit: response.orgUnit,
  org_top_level: response.orgTopLevel,
});

const mapAnswer = (answer: ApiSurveyAnswer): SurveyAnswer => ({
  id: answer.id,
  response_id: answer.responseId,
  question_id: answer.questionId,
  value: answer.value as SurveyAnswer['value'],
  created_at: answer.createdAt,
});

export const surveyService = {
  // --- READ OPERATIONS ---

  async getSurveys(_companyId: string): Promise<Survey[]> {
    const surveys = await surveysApiService.listSurveys();
    return surveys.map(mapSurvey);
  },

  async getSurveyById(id: string): Promise<Survey | null> {
    try {
      return mapSurvey(await surveysApiService.getSurvey(id));
    } catch (error) {
      Logger.error('Error fetching survey by id:', error);
      throw error;
    }
  },

  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const questions = await surveysApiService.listQuestions(surveyId);
    return questions.map(mapQuestion);
  },

  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const responses = await surveysApiService.listResponses(surveyId);
    return responses.map(mapResponse);
  },

  async getUserResponses(_userId: string): Promise<SurveyResponse[]> {
    const responses = await surveysApiService.listUserResponses();
    return responses.map(mapResponse);
  },

  async getSurveyAnswers(surveyId: string): Promise<SurveyAnswer[]> {
    const answers = await surveysApiService.listAnswers(surveyId);
    return answers.map(mapAnswer);
  },

  // --- MUTATION OPERATIONS (Admin) ---

  async createSurvey(payload: Partial<Survey>) {
    const validated = surveySchema.partial().parse(payload);
    return mapSurvey(await surveysApiService.createSurvey(validated));
  },

  async updateSurvey(id: string, payload: Partial<Survey>) {
    const validated = surveySchema.partial().parse(payload);
    return mapSurvey(await surveysApiService.updateSurvey(id, validated));
  },

  async deleteSurvey(id: string) {
    await surveysApiService.deleteSurvey(id);
  },

  async saveSurveyQuestion(question: Partial<SurveyQuestion>) {
    const validated = surveyQuestionSchema.partial().parse(question);
    if (validated.id) {
      return mapQuestion(await surveysApiService.updateQuestion(validated.id, validated));
    }
    if (!validated.survey_id) {
      throw new Error('survey_id is required to create a survey question.');
    }
    return mapQuestion(await surveysApiService.createQuestion(validated.survey_id, validated));
  },

  async deleteSurveyQuestion(id: string) {
    await surveysApiService.deleteQuestion(id);
  },

  async reorderSurveyQuestions(updates: { id: string, order_index: number }[]) {
    await surveysApiService.reorderQuestions(updates);
  },

  // --- MUTATION OPERATIONS (User) ---

  async submitResponse(payload: SubmitSurveyResponsePayload) {
    try {
      const result = await surveyResponsesService.submit(payload);
      return result.responseId;
    } catch (error) {
      Logger.error('Error submitting survey response:', error);
      throw error;
    }
  }
};
