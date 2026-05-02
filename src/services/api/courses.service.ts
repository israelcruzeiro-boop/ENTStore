import { api } from './client';
import type {
  ApiCourse,
  ApiCourseAnalytics,
  ApiCourseAnswer,
  ApiCourseContent,
  ApiCourseEnrollment,
  ApiCourseModule,
  ApiCourseModuleStats,
  ApiCoursePhaseQuestion,
  ApiCourseStats,
  ApiQuiz,
  ApiQuizAttempt,
  ApiQuizQuestion,
} from './types';

export interface CoursePayload {
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  status?: ApiCourse['status'];
  accessType?: ApiCourse['accessType'];
  allowedUserIds?: string[];
  allowedRegionIds?: string[];
  allowedStoreIds?: string[];
  excludedUserIds?: string[];
  targetAudience?: string[];
  passingScore?: number;
  diplomaTemplate?: string;
  layoutTemplate?: ApiCourse['layoutTemplate'];
}

export interface CourseModulePayload {
  title: string;
  orderIndex: number;
}

export interface CourseContentPayload {
  title: string;
  description?: string;
  type: ApiCourseContent['type'];
  url?: string;
  contentUrl?: string | null;
  filePath?: string | null;
  sizeBytes?: number | null;
  htmlContent?: string | null;
  orderIndex: number;
}

export interface CourseQuestionPayload {
  questionText: string;
  questionType: ApiCoursePhaseQuestion['questionType'];
  configuration?: unknown | null;
  imageUrl?: string | null;
  explanation?: string | null;
  orderIndex: number;
  options?: Array<{
    id?: string | null;
    optionText: string;
    isCorrect: boolean;
    orderIndex: number;
  }>;
}

export const coursesService = {
  listCourses: () => api.get<ApiCourse[]>('/courses'),
  getCourse: (courseId: string) => api.get<ApiCourse>(`/courses/${courseId}`),
  createCourse: (payload: CoursePayload) => api.post<ApiCourse>('/admin/courses', payload),
  updateCourse: (courseId: string, payload: Partial<CoursePayload>) => api.put<ApiCourse>(`/admin/courses/${courseId}`, payload),
  deleteCourse: (courseId: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/courses/${courseId}`),

  listModules: (courseId: string) => api.get<ApiCourseModule[]>(`/courses/${courseId}/modules`),
  createModule: (courseId: string, payload: CourseModulePayload) =>
    api.post<ApiCourseModule>(`/admin/courses/${courseId}/modules`, payload),
  updateModule: (moduleId: string, payload: Partial<CourseModulePayload>) =>
    api.put<ApiCourseModule>(`/admin/course-modules/${moduleId}`, payload),
  deleteModule: (moduleId: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/course-modules/${moduleId}`),

  listContents: (moduleId: string) => api.get<ApiCourseContent[]>(`/course-modules/${moduleId}/contents`),
  listContentsByModules: (moduleIds: string[]) =>
    api.get<ApiCourseContent[]>('/course-contents', { query: { moduleIds: moduleIds.join(',') } }),
  createContent: (moduleId: string, payload: CourseContentPayload) =>
    api.post<ApiCourseContent>(`/admin/course-modules/${moduleId}/contents`, payload),
  updateContent: (contentId: string, payload: Partial<CourseContentPayload>) =>
    api.put<ApiCourseContent>(`/admin/course-contents/${contentId}`, payload),
  deleteContent: (contentId: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/course-contents/${contentId}`),

  listQuestions: (moduleId: string) => api.get<ApiCoursePhaseQuestion[]>(`/course-modules/${moduleId}/questions`),
  listQuestionsByModules: (moduleIds: string[]) =>
    api.get<ApiCoursePhaseQuestion[]>('/course-questions', { query: { moduleIds: moduleIds.join(',') } }),
  createQuestion: (moduleId: string, payload: CourseQuestionPayload) =>
    api.post<ApiCoursePhaseQuestion>(`/admin/course-modules/${moduleId}/questions`, payload),
  updateQuestion: (questionId: string, payload: Partial<CourseQuestionPayload>) =>
    api.put<ApiCoursePhaseQuestion>(`/admin/course-questions/${questionId}`, payload),
  deleteQuestion: (questionId: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/course-questions/${questionId}`),

  getEnrollment: (courseId: string) => api.get<ApiCourseEnrollment | null>(`/courses/${courseId}/enrollment`),
  startEnrollment: (courseId: string) => api.post<ApiCourseEnrollment>(`/courses/${courseId}/enroll`),
  updateProgress: (enrollmentId: string, payload: { moduleId?: string | null; contentId?: string | null }) =>
    api.put<ApiCourseEnrollment>(`/courses/enrollments/${enrollmentId}/progress`, payload),
  listAnswers: (enrollmentId: string) => api.get<ApiCourseAnswer[]>(`/courses/enrollments/${enrollmentId}/answers`),
  submitAnswer: (
    enrollmentId: string,
    payload: { questionId: string; selectedOptionId?: string | null; complexAnswer?: unknown | null; isCorrect: boolean; finalize?: boolean },
  ) => api.post<ApiCourseAnswer>(`/courses/enrollments/${enrollmentId}/answers`, payload),
  completeEnrollment: (enrollmentId: string, payload: { totalCorrect: number; totalQuestions: number; startedAt?: string }) =>
    api.post<ApiCourseEnrollment>(`/courses/enrollments/${enrollmentId}/complete`, payload),

  getCourseStats: (courseId: string) => api.get<ApiCourseStats>(`/courses/${courseId}/stats`),
  getModuleStats: (courseId: string) => api.get<ApiCourseModuleStats>(`/courses/${courseId}/module-stats`),
  getDashboard: () => api.get<ApiCourseEnrollment[]>('/admin/courses/dashboard'),
  getAnalytics: () => api.get<ApiCourseAnalytics>('/admin/courses/analytics'),
  resetEnrollment: (courseId: string, userId: string) =>
    api.post<{ deleted: boolean; courseId: string; userId: string }>(`/admin/courses/${courseId}/reset-enrollment`, { userId }),
  getUserHistory: (userId: string) => api.get<ApiCourseEnrollment[]>(`/admin/courses/users/${userId}/history`),

  getQuiz: (params: { contentId?: string; courseContentId?: string }) => api.get<ApiQuiz>('/quizzes', { query: params }),
  listQuizQuestions: (quizId: string) => api.get<ApiQuizQuestion[]>(`/quizzes/${quizId}/questions`),
  submitQuizAttempt: (quizId: string, payload: { score: number; passed: boolean; answers: Record<string, string> }) =>
    api.post<ApiQuizAttempt>(`/quizzes/${quizId}/attempts`, payload),
};
