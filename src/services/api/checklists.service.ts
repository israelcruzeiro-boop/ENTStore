import { api } from './client';
import type {
  ApiActionPlanStatus,
  ApiChecklist,
  ApiChecklistAnswer,
  ApiChecklistDashboard,
  ApiChecklistDetail,
  ApiChecklistFolder,
  ApiChecklistQuestion,
  ApiChecklistSection,
  ApiChecklistSubmission,
  ApiChecklistSubmissionDetail,
} from './types';

type SnakeChecklistPayload = Record<string, unknown>;

const compact = <T extends Record<string, unknown>>(payload: T): T => {
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });
  return payload;
};

const toChecklistPayload = (data: SnakeChecklistPayload) => compact({
  title: data.title,
  description: data.description ?? null,
  folderId: data.folder_id ?? null,
  status: data.status,
  accessType: data.access_type,
  allowedUserIds: data.allowed_user_ids,
  allowedRegionIds: data.allowed_region_ids,
  allowedStoreIds: data.allowed_store_ids,
  excludedUserIds: data.excluded_user_ids,
});

const toFolderPayload = (data: SnakeChecklistPayload) => compact({
  name: data.name,
  color: data.color ?? null,
  orderIndex: data.order_index,
});

const toSectionPayload = (data: SnakeChecklistPayload) => compact({
  title: data.title,
  description: data.description ?? null,
  orderIndex: data.order_index,
});

const toQuestionPayload = (data: SnakeChecklistPayload) => compact({
  questionText: data.text ?? data.questionText,
  questionType: data.type ?? data.questionType,
  required: data.required,
  orderIndex: data.order_index,
  configuration: data.config ?? data.configuration,
});

export interface SaveChecklistAnswerPayload {
  value: string;
  note?: string | null;
  actionPlan?: string | null;
  assignedUserId?: string | null;
  photoUrls?: string[];
  actionPlanDueDate?: string | null;
  actionPlanCreatedBy?: string | null;
}

const toAnswerPayload = (payload: SaveChecklistAnswerPayload) => compact({
  value: payload.value,
  note: payload.note ?? null,
  notes: payload.note ?? null,
  actionPlan: payload.actionPlan ?? null,
  assignedUserId: payload.assignedUserId ?? null,
  photoUrls: payload.photoUrls ?? [],
  actionPlanDueDate: payload.actionPlanDueDate ?? null,
  actionPlanCreatedBy: payload.actionPlanCreatedBy ?? null,
  conformity:
    payload.value === 'C' || payload.value === 'CHECKED'
      ? 'CONFORMING'
      : payload.value === 'NC'
        ? 'NON_CONFORMING'
        : payload.value === 'NA'
          ? 'NOT_APPLICABLE'
          : undefined,
});

export const checklistsService = {
  listChecklists: () => api.get<ApiChecklist[]>('/checklists'),
  listReadableFolders: () => api.get<ApiChecklistFolder[]>('/checklist-folders'),
  getChecklist: (id: string) => api.get<ApiChecklistDetail | ApiChecklist>(`/checklists/${id}`),

  startSubmission: (checklistId: string, payload?: { orgUnitId?: string | null }) =>
    api.post<ApiChecklistSubmission>(`/checklists/${checklistId}/submissions`, payload ?? {}),
  getSubmission: (submissionId: string) =>
    api.get<ApiChecklistSubmissionDetail | ApiChecklistSubmission>(`/checklists/submissions/${submissionId}`),
  saveAnswer: (submissionId: string, questionId: string, payload: SaveChecklistAnswerPayload) =>
    api.put<ApiChecklistAnswer>(`/checklists/submissions/${submissionId}/answers/${questionId}`, toAnswerPayload(payload)),
  completeSubmission: (submissionId: string) =>
    api.post<ApiChecklistSubmission>(`/checklists/submissions/${submissionId}/complete`),

  listUserSubmissions: (query?: { status?: string; userId?: string; companyId?: string }) =>
    api.get<ApiChecklistSubmission[]>('/checklists/submissions', {
      query: {
        status: query?.status,
        userId: query?.userId,
        companyId: query?.companyId,
      },
    }),

  listActionPlans: (query?: { scope?: 'all' | 'received' | 'sent'; userId?: string; companyId?: string }) =>
    api.get<ApiChecklistAnswer[]>('/action-plans', {
      query: {
        scope: query?.scope,
        userId: query?.userId,
        companyId: query?.companyId,
      },
    }),
  createActionPlan: (payload: SaveChecklistAnswerPayload & { submissionId: string; questionId: string }) =>
    api.post<ApiChecklistAnswer>('/action-plans', payload),
  updateActionPlan: (id: string, payload: { actionPlanStatus?: ApiActionPlanStatus }) =>
    api.put<ApiChecklistAnswer>(`/action-plans/${id}`, {
      status: payload.actionPlanStatus === 'RESOLVED' ? 'DONE' : 'OPEN',
    }),

  listAdminChecklists: () => api.get<ApiChecklist[]>('/admin/checklists'),
  createChecklist: (payload: SnakeChecklistPayload) =>
    api.post<ApiChecklist>('/admin/checklists', toChecklistPayload(payload)),
  updateChecklist: (id: string, payload: SnakeChecklistPayload) =>
    api.put<ApiChecklist>(`/admin/checklists/${id}`, toChecklistPayload(payload)),
  deleteChecklist: (id: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/checklists/${id}`),

  listFolders: () => api.get<ApiChecklistFolder[]>('/admin/checklist-folders'),
  createFolder: (payload: SnakeChecklistPayload) =>
    api.post<ApiChecklistFolder>('/admin/checklist-folders', toFolderPayload(payload)),
  updateFolder: (id: string, payload: SnakeChecklistPayload) =>
    api.put<ApiChecklistFolder>(`/admin/checklist-folders/${id}`, toFolderPayload(payload)),
  deleteFolder: (id: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/checklist-folders/${id}`),
  reorderFolders: (folders: Array<{ id: string; order_index: number }>) =>
    Promise.all(folders.map((folder) => checklistsService.updateFolder(folder.id, { order_index: folder.order_index }))),

  listSections: (checklistId: string) => api.get<ApiChecklistSection[]>(`/admin/checklists/${checklistId}/sections`),
  createSection: (checklistId: string, payload: SnakeChecklistPayload) =>
    api.post<ApiChecklistSection>(`/admin/checklists/${checklistId}/sections`, toSectionPayload(payload)),
  updateSection: (id: string, payload: SnakeChecklistPayload) =>
    api.put<ApiChecklistSection>(`/admin/checklist-sections/${id}`, toSectionPayload(payload)),
  deleteSection: (id: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/checklist-sections/${id}`),
  reorderSections: (sections: Array<{ id: string; order_index: number }>) =>
    api.post<{ updated: number }>('/admin/checklist-sections/reorder', {
      items: sections.map((section) => ({ id: section.id, orderIndex: section.order_index })),
    }),

  listQuestions: (checklistId: string) => api.get<ApiChecklistQuestion[]>(`/checklists/${checklistId}/questions`),
  listSectionQuestions: (sectionId: string) =>
    api.get<ApiChecklistQuestion[]>(`/admin/checklist-sections/${sectionId}/questions`),
  createQuestion: (sectionId: string, payload: SnakeChecklistPayload) =>
    api.post<ApiChecklistQuestion>(`/admin/checklist-sections/${sectionId}/questions`, toQuestionPayload(payload)),
  updateQuestion: (id: string, payload: SnakeChecklistPayload) =>
    api.put<ApiChecklistQuestion>(`/admin/checklist-questions/${id}`, toQuestionPayload(payload)),
  deleteQuestion: (id: string) => api.delete<{ deleted: boolean; id: string }>(`/admin/checklist-questions/${id}`),
  reorderQuestions: (questions: Array<{ id: string; order_index: number; section_id?: string | null }>) =>
    api.post<{ updated: number }>('/admin/checklist-questions/reorder', {
      items: questions.map((question) => ({
        id: question.id,
        orderIndex: question.order_index,
        sectionId: question.section_id ?? null,
      })),
    }),

  getDashboard: () => api.get<ApiChecklistDashboard>('/admin/checklists/dashboard'),
  listAdminSubmissions: (query?: { userId?: string; companyId?: string; status?: string }) =>
    api.get<ApiChecklistSubmission[]>('/admin/checklists/submissions', {
      query: {
        userId: query?.userId,
        companyId: query?.companyId,
        status: query?.status,
      },
    }),
  getAdminSubmission: (id: string) =>
    api.get<ApiChecklistSubmissionDetail | ApiChecklistSubmission>(`/admin/checklists/submissions/${id}`),
};
