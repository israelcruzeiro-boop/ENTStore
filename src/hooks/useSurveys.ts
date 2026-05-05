import useSWR from 'swr';
import { surveyService } from '../services/surveys.service';
import { Survey, SurveyQuestion, SurveyResponse } from '../types/surveys';
import type { AdminSurveysQuery } from '../services/api/surveys.service';

const EMPTY_SURVEYS: Survey[] = [];

export function useSurveys(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Survey[]>(
    companyId ? `surveys_${companyId}` : null,
    () => surveyService.getSurveys(companyId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    surveys: data || EMPTY_SURVEYS,
    isLoading,
    isError: error,
    mutate
  };
}

export function usePaginatedSurveys(companyId?: string, query: AdminSurveysQuery = {}) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 12;
  const search = query.search?.trim() || undefined;
  const status = query.status ?? 'ALL';

  const { data, error, isLoading, mutate } = useSWR(
    companyId ? ['surveys_paginated', companyId, page, limit, search ?? '', status] : null,
    () => surveyService.getPaginatedSurveys(companyId!, { page, limit, search, status }),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    surveys: data?.surveys || EMPTY_SURVEYS,
    meta: data?.meta ?? null,
    isLoading,
    isError: error,
    mutate
  };
}

export function useSurvey(surveyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Survey | null>(
    surveyId ? `survey_${surveyId}` : null,
    () => surveyService.getSurveyById(surveyId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    survey: data,
    isLoading,
    isError: error,
    mutate
  };
}

const EMPTY_QUESTIONS: SurveyQuestion[] = [];

export function useSurveyQuestions(surveyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<SurveyQuestion[]>(
    surveyId ? `survey_questions_${surveyId}` : null,
    () => surveyService.getSurveyQuestions(surveyId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    questions: data || EMPTY_QUESTIONS,
    isLoading,
    isError: error,
    mutate
  };
}

const EMPTY_RESPONSES: SurveyResponse[] = [];

export function useSurveyResponses(surveyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<SurveyResponse[]>(
    surveyId ? `survey_responses_${surveyId}` : null,
    () => surveyService.getSurveyResponses(surveyId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    responses: data || EMPTY_RESPONSES,
    isLoading,
    isError: error,
    mutate
  };
}

export function useUserSurveyResponses(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<SurveyResponse[]>(
    userId ? `user_survey_responses_${userId}` : null,
    () => surveyService.getUserResponses(userId!),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    responses: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useSurveyAnswers(surveyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    surveyId ? `survey_answers_${surveyId}` : null,
    () => surveyService.getSurveyAnswers(surveyId!),
    { revalidateOnFocus: false }
  );

  return {
    answers: data || [],
    isLoading,
    isError: error,
    mutate
  };
}
