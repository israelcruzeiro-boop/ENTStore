import { supabase } from '../lib/supabaseClient';
import { 
  Survey, 
  SurveyQuestion, 
  SurveyResponse, 
  SurveyAnswer,
  SubmitSurveyResponsePayload
} from '../types/surveys';
import { 
  surveySchema, 
  surveyQuestionSchema 
} from '../types/surveys';
import { Logger } from '../utils/logger';

export const surveyService = {
  // --- READ OPERATIONS ---

  async getSurveys(companyId: string): Promise<Survey[]> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*, survey_questions(count)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error('Error fetching surveys:', error);
      throw error;
    }
    
    // Process question count
    type SurveyRow = Survey & { survey_questions?: { count: number }[]; question_count?: number };
    const processed = ((data || []) as SurveyRow[]).map(s => ({
      ...s,
      question_count: s.survey_questions?.[0]?.count ?? 0
    }));

    return processed as Survey[];
  },

  async getSurveyById(id: string): Promise<Survey | null> {
    const { data, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
       Logger.error('Error fetching survey by id:', error);
       throw error;
    }
    return data as Survey | null;
  },

  async getSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
    const { data, error } = await supabase
      .from('survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) {
      Logger.error('Error fetching survey questions:', error);
      throw error;
    }
    return data as SurveyQuestion[];
  },

  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('*, users(name, email, avatar_url, org_unit_id), org_unit:org_units(id, name), org_top_level:org_top_levels(id, name)')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false });

    if (error) {
      Logger.error('Error fetching survey responses:', error);
      throw error;
    }
    return data as SurveyResponse[];
  },

  async getUserResponses(userId: string): Promise<SurveyResponse[]> {
     const { data, error } = await supabase
       .from('survey_responses')
       .select('*')
       .eq('user_id', userId)
       .order('created_at', { ascending: false });

     if (error) {
       Logger.error('Error fetching user responses:', error);
       throw error;
     }
     return data as SurveyResponse[];
  },

  async getSurveyAnswers(surveyId: string): Promise<SurveyAnswer[]> {
     const { data, error } = await supabase
       .from('survey_answers')
       .select('*, survey_responses!inner(survey_id)')
       .eq('survey_responses.survey_id', surveyId);
     
     if (error) {
       Logger.error('Error fetching survey answers:', error);
       throw error;
     }
     return data as SurveyAnswer[];
  },

  // --- MUTATION OPERATIONS (Admin) ---

  async createSurvey(payload: Partial<Survey>) {
    const validated = surveySchema.partial().parse(payload);
    const { data, error } = await supabase
      .from('surveys')
      .insert(validated)
      .select()
      .single();

    if (error) {
      Logger.error('Error creating survey:', error);
      throw error;
    }
    return data as Survey;
  },

  async updateSurvey(id: string, payload: Partial<Survey>) {
    const validated = surveySchema.partial().parse(payload);
    // Explicitly update only what's needed, deleted_at and updated_at might be handled automatically/manually
    const { data, error } = await supabase
      .from('surveys')
      .update({
        ...validated,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      Logger.error('Error updating survey:', error);
      throw error;
    }
    return data as Survey;
  },

  async deleteSurvey(id: string) {
    const { error } = await supabase
      .from('surveys')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
       Logger.error('Error deleting survey:', error);
       throw error;
    }
  },

  async saveSurveyQuestion(question: Partial<SurveyQuestion>) {
    const validated = surveyQuestionSchema.partial().parse(question);
    const { data, error } = await supabase
      .from('survey_questions')
      .upsert({
         ...validated,
         updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
       Logger.error('Error saving survey question:', error);
       throw error;
    }
    return data as SurveyQuestion;
  },

  async deleteSurveyQuestion(id: string) {
    const { error } = await supabase
      .from('survey_questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
       Logger.error('Error deleting survey question:', error);
       throw error;
    }
  },

  async reorderSurveyQuestions(updates: { id: string, order_index: number }[]) {
     const { error } = await supabase
      .from('survey_questions')
      .upsert(updates.map(u => ({ id: u.id, order_index: u.order_index })));

     if (error) {
       Logger.error('Error reordering survey questions:', error);
       throw error;
     }
  },

  // --- MUTATION OPERATIONS (User) ---

  async submitResponse(payload: SubmitSurveyResponsePayload) {
    const { data, error } = await supabase.rpc('submit_survey_response', {
      p_payload: payload
    });

    if (error) {
      Logger.error('Error submitting survey response:', error);
      throw error;
    }
    
    return data; // Returns the new response uuid
  }
};
