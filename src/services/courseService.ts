import {
  coursesService,
  mapApiCourseAnswerToFrontend,
  mapApiCourseContentToFrontend,
  mapApiCourseEnrollmentToFrontend,
  mapApiCourseModuleToFrontend,
  mapApiCourseQuestionToFrontend,
  mapApiCourseToFrontend,
  mapApiQuizAttemptToFrontend,
  mapApiQuizQuestionToFrontend,
  mapApiQuizToFrontend,
  type CourseContentPayload,
  type CoursePayload,
  type CourseQuestionPayload,
} from './api';
import type {
  Course,
  CourseAnswer,
  CourseContent,
  CourseEnrollment,
  CourseModule,
  CoursePhaseQuestion,
  QuizAttempt,
} from '../types';

function toCoursePayload(course: Partial<Course>): Partial<CoursePayload> {
  return {
    title: course.title,
    description: course.description,
    thumbnailUrl: course.thumbnail_url ?? course.image_url ?? course.cover_image ?? null,
    coverImage: course.cover_image ?? null,
    imageUrl: course.image_url ?? course.thumbnail_url ?? null,
    status: course.status,
    accessType: course.access_type,
    allowedUserIds: course.allowed_user_ids,
    allowedRegionIds: course.allowed_region_ids,
    allowedStoreIds: course.allowed_store_ids,
    excludedUserIds: course.excluded_user_ids,
    targetAudience: course.target_audience,
    passingScore: course.passing_score,
    diplomaTemplate: course.diploma_template,
  };
}

function toModulePayload(module: Partial<CourseModule>) {
  return {
    title: module.title ?? '',
    orderIndex: module.order_index ?? 0,
  };
}

function toContentPayload(content: Partial<CourseContent>): Partial<CourseContentPayload> {
  return {
    title: content.title,
    description: content.description,
    type: content.type,
    url: content.url ?? content.content_url ?? '',
    contentUrl: content.content_url ?? content.url ?? null,
    filePath: content.file_path ?? null,
    sizeBytes: content.size_bytes ?? null,
    htmlContent: content.html_content ?? null,
    orderIndex: content.order_index,
  };
}

function toQuestionPayload(question: Partial<CoursePhaseQuestion>, options?: Array<Partial<{ id: string; option_text: string; is_correct: boolean; order_index: number }>>): Partial<CourseQuestionPayload> {
  return {
    questionText: question.question_text,
    questionType: question.question_type,
    configuration: question.configuration,
    imageUrl: question.image_url ?? null,
    explanation: question.explanation ?? null,
    orderIndex: question.order_index,
    options: options?.map((option, index) => ({
      id: option.id ?? null,
      optionText: option.option_text ?? '',
      isCorrect: option.is_correct ?? false,
      orderIndex: option.order_index ?? index,
    })),
  };
}

export const courseService = {
  async getCourses(_companyId: string): Promise<Course[]> {
    const courses = await coursesService.listCourses();
    return courses.map(mapApiCourseToFrontend);
  },

  async getModules(courseId: string): Promise<CourseModule[]> {
    const modules = await coursesService.listModules(courseId);
    return modules.map(mapApiCourseModuleToFrontend);
  },

  async getContents(moduleId: string): Promise<(CourseContent & { quizzes?: Array<{ id: string }> })[]> {
    const contents = await coursesService.listContents(moduleId);
    return contents.map(mapApiCourseContentToFrontend);
  },

  async getQuestions(moduleId: string): Promise<CoursePhaseQuestion[]> {
    const questions = await coursesService.listQuestions(moduleId);
    return questions.map(mapApiCourseQuestionToFrontend);
  },

  async getEnrollment(courseId: string, _userId: string): Promise<CourseEnrollment | null> {
    const enrollment = await coursesService.getEnrollment(courseId);
    return enrollment ? mapApiCourseEnrollmentToFrontend(enrollment) : null;
  },

  async startEnrollment(payload: { course_id: string; user_id: string; company_id: string }) {
    const enrollment = await coursesService.startEnrollment(payload.course_id);
    return mapApiCourseEnrollmentToFrontend(enrollment);
  },

  async updateProgress(enrollmentId: string, moduleId: string | null, contentId: string | null) {
    const enrollment = await coursesService.updateProgress(enrollmentId, {
      moduleId: moduleId || null,
      contentId: contentId || null,
    });
    return mapApiCourseEnrollmentToFrontend(enrollment);
  },

  async completeEnrollment(enrollmentId: string, correct: number, total: number, startedAt?: string) {
    const enrollment = await coursesService.completeEnrollment(enrollmentId, {
      totalCorrect: correct,
      totalQuestions: total,
      startedAt,
    });
    return mapApiCourseEnrollmentToFrontend(enrollment);
  },

  async getAnswers(enrollmentId: string): Promise<CourseAnswer[]> {
    const answers = await coursesService.listAnswers(enrollmentId);
    return answers.map(mapApiCourseAnswerToFrontend);
  },

  async saveQuestion(question: Partial<CoursePhaseQuestion>, options?: Array<Partial<{ id: string; option_text: string; is_correct: boolean; order_index: number }>>) {
    const payload = toQuestionPayload(question, options);
    const saved = question.id
      ? await coursesService.updateQuestion(question.id, payload)
      : await coursesService.createQuestion(question.module_id ?? '', payload as CourseQuestionPayload);
    return saved.id;
  },

  async deleteQuestion(id: string) {
    await coursesService.deleteQuestion(id);
  },

  async submitAnswer(answer: Partial<CourseAnswer>) {
    await coursesService.submitAnswer(answer.enrollment_id ?? '', {
      questionId: answer.question_id ?? '',
      selectedOptionId: answer.selected_option_id ?? null,
      complexAnswer: answer.complex_answer ?? null,
      isCorrect: answer.is_correct ?? false,
    });
  },

  async saveModule(module: Partial<CourseModule>) {
    const payload = toModulePayload(module);
    const saved = module.id
      ? await coursesService.updateModule(module.id, payload)
      : await coursesService.createModule(module.course_id ?? '', payload);
    return mapApiCourseModuleToFrontend(saved);
  },

  async deleteModule(id: string) {
    await coursesService.deleteModule(id);
  },

  async saveContent(content: Partial<CourseContent>) {
    const payload = toContentPayload(content);
    const saved = content.id
      ? await coursesService.updateContent(content.id, payload)
      : await coursesService.createContent(content.module_id ?? '', payload as CourseContentPayload);
    return mapApiCourseContentToFrontend(saved);
  },

  async deleteContent(id: string) {
    await coursesService.deleteContent(id);
  },

  async saveCourse(id: string, payload: Partial<Course>) {
    await coursesService.updateCourse(id, toCoursePayload(payload));
  },

  async updateCourse(id: string, payload: Partial<Course>) {
    await coursesService.updateCourse(id, toCoursePayload(payload));
  },

  async createCourse(payload: Partial<Course>) {
    const saved = await coursesService.createCourse(toCoursePayload(payload) as CoursePayload);
    return mapApiCourseToFrontend(saved);
  },

  async deleteCourse(id: string) {
    await coursesService.deleteCourse(id);
  },

  async createModule(module: Partial<CourseModule>) {
    const saved = await coursesService.createModule(module.course_id ?? '', toModulePayload(module));
    return mapApiCourseModuleToFrontend(saved);
  },

  async createContent(content: Partial<CourseContent>) {
    const saved = await coursesService.createContent(content.module_id ?? '', toContentPayload(content) as CourseContentPayload);
    return mapApiCourseContentToFrontend(saved);
  },

  async updateModule(id: string, payload: Partial<CourseModule>) {
    await coursesService.updateModule(id, toModulePayload(payload));
  },

  async getQuiz(params: { contentId?: string; courseContentId?: string }) {
    return mapApiQuizToFrontend(await coursesService.getQuiz(params));
  },

  async getQuizQuestions(quizId: string) {
    return (await coursesService.listQuizQuestions(quizId)).map(mapApiQuizQuestionToFrontend);
  },

  async submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completed_at'>) {
    const saved = await coursesService.submitQuizAttempt(attempt.quiz_id, {
      score: attempt.score,
      passed: attempt.passed,
      answers: attempt.answers,
    });
    return mapApiQuizAttemptToFrontend(saved);
  },
};
