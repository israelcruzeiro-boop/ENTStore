import { api } from './client';
import type { SubmitSurveyResponsePayload } from '../../types/surveys';

export interface SubmitSurveyResponseResult {
  responseId: string;
}

/**
 * HTTP wrapper for the legacy `submit_survey_response` database RPC.
 *
 * The backend route (`POST /api/surveys/:id/responses`) is authenticated. Tenant
 * isolation is enforced server-side: the current user's `companyId` and
 * `userId` are stamped on the persisted response, so the client never has to
 * supply them.
 */
export const surveyResponsesService = {
  submit: (payload: SubmitSurveyResponsePayload) =>
    api.post<SubmitSurveyResponseResult>(
      `/surveys/${encodeURIComponent(payload.survey_id)}/responses`,
      {
        started_at: payload.started_at ?? null,
        answers: payload.answers,
      },
    ),
};
