import { supabase } from '../lib/supabaseClient';
import { 
  Course, 
  CourseModule, 
  CourseContent, 
  CoursePhaseQuestion, 
  CourseEnrollment,
  CourseAnswer 
} from '../types';
import { 
  courseSchema, 
  courseModuleSchema, 
  courseContentSchema, 
  courseEnrollmentSchema, 
  courseAnswerSchema,
  coursePhaseQuestionSchema
} from '../types/schemas';
import { Logger } from '../utils/logger';

/**
 * Service to handle all Course-related operations.
 * Implements architectural robustness by centralizing Supabase calls and Zod validation.
 */
export const courseService = {
  // --- READ OPERATIONS ---

  async getCourses(companyId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, course_modules(count)')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Process module count
    const processed = (data || []).map((c: any) => ({
      ...c,
      module_count: c.course_modules?.[0]?.count ?? 0
    }));

    return processed as Course[];
  },

  async getModules(courseId: string): Promise<CourseModule[]> {
    const { data, error } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data as CourseModule[];
  },

  async getContents(moduleId: string): Promise<CourseContent[]> {
    const { data, error } = await supabase
      .from('course_contents')
      .select('*, quizzes(id)')
      .eq('module_id', moduleId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data as CourseContent[];
  },

  async getQuestions(moduleId: string): Promise<CoursePhaseQuestion[]> {
    const { data, error } = await supabase
      .from('course_phase_questions')
      .select('*, options:course_question_options(*)')
      .eq('module_id', moduleId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data as CoursePhaseQuestion[];
  },

  async getEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | null> {
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // --- MUTATION OPERATIONS (User) ---

  async startEnrollment(payload: { course_id: string; user_id: string; company_id: string }) {
    const validated = courseEnrollmentSchema.parse({
      ...payload,
      status: 'IN_PROGRESS',
      started_at: new Date().toISOString()
    });

    const { data, error } = await supabase
      .from('course_enrollments')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateProgress(enrollmentId: string, moduleId: string, contentId: string) {
    const { error } = await supabase
      .from('course_enrollments')
      .update({
        current_module_id: moduleId,
        current_content_id: contentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', enrollmentId);

    if (error) throw error;
  },

  async completeEnrollment(enrollmentId: string, correct: number, total: number, startedAt?: string) {
    const score = total > 0 ? Math.round((correct / total) * 100) : 100;
    const completedAt = new Date().toISOString();
    
    // Calculate time spent if startedAt is provided
    let timeSpent = 0;
    if (startedAt) {
      timeSpent = Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
    }

    const { error } = await supabase
      .from('course_enrollments')
      .update({
        status: 'COMPLETED',
        completed_at: completedAt,
        score_percent: score,
        total_correct: correct,
        total_questions: total,
        time_spent_seconds: timeSpent
      })
      .eq('id', enrollmentId);

    if (error) throw error;
  },

  async getAnswers(enrollmentId: string): Promise<CourseAnswer[]> {
    const { data, error } = await supabase
      .from('course_answers')
      .select('*')
      .eq('enrollment_id', enrollmentId);

    if (error) throw error;
    return data as CourseAnswer[];
  },

  async saveQuestion(question: any, options?: any[]) {
    const validated = coursePhaseQuestionSchema.parse(question);
    let questionId = question.id;

    if (questionId) {
      const { error } = await supabase.from('course_phase_questions').update(validated).eq('id', questionId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from('course_phase_questions').insert(validated).select('id').single();
      if (error) throw error;
      questionId = data.id;
    }

    if (question.question_type === 'MULTIPLE_CHOICE' && options) {
      if (question.id) {
        // Soft delete de opções antigas
        await supabase.from('course_question_options').update({ deleted_at: new Date().toISOString() }).eq('question_id', questionId);
      }
      const validatedOptions = options.map((opt, idx) => ({
        ...opt,
        question_id: questionId,
        order_index: idx
      }));
      const { error } = await supabase.from('course_question_options').insert(validatedOptions);
      if (error) throw error;
    }

    return questionId;
  },

  async deleteQuestion(id: string) {
    const { error } = await supabase.from('course_phase_questions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async submitAnswer(answer: any) {
    const validated = courseAnswerSchema.parse({
      ...answer,
      answered_at: new Date().toISOString()
    });

    const { error } = await supabase
      .from('course_answers')
      .upsert(validated, { onConflict: 'enrollment_id,question_id' });

    if (error) throw error;
  },

  // --- MUTATION OPERATIONS (Admin) ---

  async saveModule(module: Partial<CourseModule>) {
    const validated = courseModuleSchema.parse(module);
    const { data, error } = await supabase
      .from('course_modules')
      .upsert(validated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteModule(id: string) {
    const { error } = await supabase
      .from('course_modules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async saveContent(content: Partial<CourseContent>) {
    const validated = courseContentSchema.parse(content);
    const { data, error } = await supabase
      .from('course_contents')
      .upsert(validated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteContent(id: string) {
    const { error } = await supabase
      .from('course_contents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async saveCourse(id: string, payload: any) {
    const validated = courseSchema.partial().parse(payload);
    const { error } = await supabase
      .from('courses')
      .update(validated)
      .eq('id', id);
    
    if (error) throw error;
  },

  // Alias used by CourseDetails admin builder
  async updateCourse(id: string, payload: any) {
    const validated = courseSchema.partial().parse(payload);
    const { error } = await supabase
      .from('courses')
      .update(validated)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteCourse(id: string) {
    const { error } = await supabase
      .from('courses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async createModule(module: Partial<CourseModule>) {
    const validated = courseModuleSchema.parse(module);
    const { data, error } = await supabase
      .from('course_modules')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createContent(content: Partial<CourseContent>) {
    const validated = courseContentSchema.parse(content);
    const { data, error } = await supabase
      .from('course_contents')
      .insert(validated)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateModule(id: string, payload: Partial<CourseModule>) {
    const { error } = await supabase
      .from('course_modules')
      .update(payload)
      .eq('id', id);

    if (error) throw error;
  }
};
