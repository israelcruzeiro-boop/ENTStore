import useSWR from 'swr';
import {
  checklistsService,
  mapApiChecklistAnswerToFrontend,
  mapApiChecklistFolderToFrontend,
  mapApiChecklistQuestionToFrontend,
  mapApiChecklistSectionToFrontend,
  mapApiChecklistSubmissionToFrontend,
  mapApiChecklistToFrontend,
} from '../services/api';
import type {
  Checklist,
  ChecklistAnswer,
  ChecklistFolder,
  ChecklistQuestion,
  ChecklistSection,
  ChecklistSubmission,
} from '../types';
import type { ApiChecklist, ApiChecklistDetail, ApiChecklistSubmission, ApiChecklistSubmissionDetail } from '../services/api';

type ActionPlan = ChecklistAnswer & {
  checklist_submissions?: {
    id: string;
    status: string;
    checklist_id: string;
    user_id: string;
    company_id?: string;
    created_at: string;
    checklists?: {
      title: string;
    };
  };
  checklist_questions?: {
    text: string;
  };
};

type DetailedAnswer = ChecklistAnswer & {
  checklist_questions: {
    text: string;
    type?: string;
    section_id?: string | null;
    checklist_id?: string;
  } | null;
  checklist_submissions: {
    id: string;
    user_id: string;
    checklist_id: string;
    org_unit_id?: string | null;
    status: string;
    completed_at?: string | null;
    created_at?: string;
    checklist?: { title: string } | Array<{ title: string }> | null;
  } | null;
};

interface UserChecklistEntry {
  id: string;
  checklist_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  org_unit_id: string | null;
  created_at: string;
  checklists: { title: string } | Array<{ title: string }> | null;
}

const isChecklistDetail = (value: ApiChecklist | ApiChecklistDetail): value is ApiChecklistDetail =>
  'checklist' in value;

const isSubmissionDetail = (
  value: ApiChecklistSubmission | ApiChecklistSubmissionDetail,
): value is ApiChecklistSubmissionDetail => 'submission' in value;

const mapSubmissionList = (items: ApiChecklistSubmission[] | undefined): ChecklistSubmission[] =>
  (items ?? []).map(mapApiChecklistSubmissionToFrontend);

type ChecklistDashboardPayload = Awaited<ReturnType<typeof checklistsService.getDashboard>>;

const dashboardSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
};

function useChecklistDashboardApiData(companyId?: string) {
  return useSWR<ChecklistDashboardPayload>(
    companyId ? `checklist_dashboard_${companyId}` : null,
    async () => checklistsService.getDashboard(),
    dashboardSwrOptions,
  );
}

const loadChecklistDetail = async (checklistId: string): Promise<ApiChecklistDetail> => {
  const detail = await checklistsService.getChecklist(checklistId);
  if (isChecklistDetail(detail)) return detail;
  return { checklist: detail, sections: [], questions: [] };
};

export function useChecklists(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Checklist[]>(
    companyId ? `checklists_${companyId}` : null,
    async () => (await checklistsService.listChecklists()).map(mapApiChecklistToFrontend),
    dashboardSwrOptions,
  );

  return {
    checklists: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useChecklistFolders(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistFolder[]>(
    companyId ? `checklist_folders_${companyId}` : null,
    async () => (await checklistsService.listFolders()).map(mapApiChecklistFolderToFrontend),
  );

  return {
    folders: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useReadableChecklistFolders(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistFolder[]>(
    companyId ? `readable_checklist_folders_${companyId}` : null,
    async () => (await checklistsService.listReadableFolders()).map(mapApiChecklistFolderToFrontend),
  );

  return {
    folders: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useChecklistQuestions(checklistId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistQuestion[]>(
    checklistId ? `checklist_questions_${checklistId}` : null,
    async () => {
      const detail = await loadChecklistDetail(checklistId as string);
      return detail.questions.map(mapApiChecklistQuestionToFrontend);
    },
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAllCompanyQuestions(companyId?: string) {
  const { data, error, isLoading } = useChecklistDashboardApiData(companyId);

  return {
    questions: data?.questions.map(mapApiChecklistQuestionToFrontend) || [],
    isLoading,
    isError: error,
  };
}

export function useChecklistSections(checklistId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSection[]>(
    checklistId ? `checklist_sections_${checklistId}` : null,
    async () => {
      const detail = await loadChecklistDetail(checklistId as string);
      return detail.sections.map(mapApiChecklistSectionToFrontend);
    },
  );

  return {
    sections: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useChecklistSubmission(submissionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSubmission>(
    submissionId ? `submission_${submissionId}` : null,
    async () => {
      const detail = await checklistsService.getSubmission(submissionId as string);
      return mapApiChecklistSubmissionToFrontend(isSubmissionDetail(detail) ? detail.submission : detail);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    submission: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useChecklistAnswers(submissionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistAnswer[]>(
    submissionId ? `answers_${submissionId}` : null,
    async () => {
      const detail = await checklistsService.getSubmission(submissionId as string);
      if (!isSubmissionDetail(detail)) return [];
      return detail.answers.map(mapApiChecklistAnswerToFrontend);
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    answers: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAdminChecklistSubmissionDetail(submissionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiChecklistSubmissionDetail>(
    submissionId ? `admin_submission_detail_${submissionId}` : null,
    async () => {
      const detail = await checklistsService.getAdminSubmission(submissionId as string);
      if (isSubmissionDetail(detail)) return detail;
      return { submission: detail, answers: [], sections: [], questions: [] };
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  return {
    submission: data?.submission ? mapApiChecklistSubmissionToFrontend(data.submission) : undefined,
    checklist: data?.checklist ? mapApiChecklistToFrontend(data.checklist) : undefined,
    sections: data?.sections?.map(mapApiChecklistSectionToFrontend) ?? [],
    questions: data?.questions?.map(mapApiChecklistQuestionToFrontend) ?? [],
    answers: data?.answers.map(mapApiChecklistAnswerToFrontend) ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useUserSubmissions(userId?: string, companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSubmission[]>(
    userId && companyId ? `user_submissions_${userId}_${companyId}` : null,
    async () => mapSubmissionList(await checklistsService.listUserSubmissions({ status: 'IN_PROGRESS', userId, companyId })),
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useOwnChecklistSubmissions(userId?: string, companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSubmission[]>(
    userId && companyId ? `own_checklist_submissions_${userId}_${companyId}` : null,
    async () => mapSubmissionList(await checklistsService.listUserSubmissions({ userId, companyId })),
    { revalidateOnFocus: false },
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAllSubmissions(companyId?: string) {
  const { data, error, isLoading } = useSWR<ChecklistSubmission[]>(
    companyId ? `all_submissions_${companyId}` : null,
    async () => mapSubmissionList(await checklistsService.listAdminSubmissions({ companyId })),
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error,
  };
}

export function useAllAnswers(companyId?: string) {
  const { data, error, isLoading } = useChecklistDashboardApiData(companyId);

  return {
    answers: data?.answers.map(mapApiChecklistAnswerToFrontend) || [],
    isLoading,
    isError: error,
  };
}

export function useAllActionPlans(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    companyId ? `all_action_plans_${companyId}` : null,
    async () =>
      (await checklistsService.listActionPlans({ scope: 'all', companyId })).map(mapApiChecklistAnswerToFrontend) as ActionPlan[],
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useActionPlansReceived(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    userId ? `action_plans_received_${userId}` : null,
    async () =>
      (await checklistsService.listActionPlans({ scope: 'received', userId })).map(mapApiChecklistAnswerToFrontend) as ActionPlan[],
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useActionPlansSent(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    userId ? `action_plans_sent_${userId}` : null,
    async () =>
      (await checklistsService.listActionPlans({ scope: 'sent', userId })).map(mapApiChecklistAnswerToFrontend) as ActionPlan[],
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export const checklistActions = {
  async startSubmission(checklistId: string, _userId: string, _companyId: string, orgUnitId?: string) {
    const submission = await checklistsService.startSubmission(checklistId, {
      orgUnitId: orgUnitId ?? null,
    });
    return mapApiChecklistSubmissionToFrontend(submission);
  },

  async saveAnswer(
    submissionId: string,
    questionId: string,
    value: string,
    note?: string,
    actionPlan?: string,
    assignedUserId?: string,
    photoUrls?: string[],
    actionPlanDueDate?: string,
    currentUserId?: string,
  ) {
    await checklistsService.saveAnswer(submissionId, questionId, {
      value,
      note: note || null,
      actionPlan: actionPlan || null,
      assignedUserId: assignedUserId || null,
      photoUrls: photoUrls || [],
      actionPlanDueDate: actionPlanDueDate || null,
      actionPlanCreatedBy: actionPlan && currentUserId ? currentUserId : null,
    });
  },

  async completeSubmission(submissionId: string) {
    await checklistsService.completeSubmission(submissionId);
  },

  async resolveActionPlan(answerId: string) {
    await checklistsService.updateActionPlan(answerId, { actionPlanStatus: 'RESOLVED' });
  },

  async createFolder(data: Partial<ChecklistFolder>) {
    return mapApiChecklistFolderToFrontend(await checklistsService.createFolder(data));
  },

  async updateFolder(id: string, data: Partial<ChecklistFolder>) {
    await checklistsService.updateFolder(id, data);
  },

  async deleteFolder(id: string) {
    await checklistsService.deleteFolder(id);
  },

  async reorderFolders(folders: { id: string; order_index: number }[]) {
    await checklistsService.reorderFolders(folders);
  },

  async createChecklist(data: Partial<Checklist>) {
    return mapApiChecklistToFrontend(await checklistsService.createChecklist(data));
  },

  async updateChecklist(id: string, data: Partial<Checklist>) {
    await checklistsService.updateChecklist(id, data);
  },

  async deleteChecklist(id: string) {
    await checklistsService.deleteChecklist(id);
  },

  async createSection(checklistId: string, title: string, orderIndex: number) {
    return mapApiChecklistSectionToFrontend(
      await checklistsService.createSection(checklistId, {
        title,
        order_index: orderIndex,
      }),
    );
  },

  async updateSection(id: string, data: Partial<ChecklistSection>) {
    await checklistsService.updateSection(id, data);
  },

  async deleteSection(id: string) {
    await checklistsService.deleteSection(id);
  },

  async createQuestion(data: Partial<ChecklistQuestion>) {
    let sectionId = data.section_id;
    if (!sectionId && data.checklist_id) {
      const section = await checklistsService.createSection(data.checklist_id, {
        title: 'Geral',
        order_index: 0,
      });
      sectionId = section.id;
    }
    if (!sectionId) throw new Error('Checklist section is required to create a question.');
    return mapApiChecklistQuestionToFrontend(await checklistsService.createQuestion(sectionId, data));
  },

  async updateQuestion(id: string, data: Partial<ChecklistQuestion>) {
    await checklistsService.updateQuestion(id, data);
  },

  async deleteQuestion(id: string) {
    await checklistsService.deleteQuestion(id);
  },

  async reorderQuestions(questions: { id: string; order_index: number; section_id?: string | null }[]) {
    await checklistsService.reorderQuestions(questions);
  },

  async reorderSections(sections: { id: string; order_index: number }[]) {
    await checklistsService.reorderSections(sections);
  },
};

export function useChecklistDetailedAnswers(companyId?: string) {
  const { data, error, isLoading } = useChecklistDashboardApiData(companyId);

  return {
    detailedAnswers: (data?.detailedAnswers.map(mapApiChecklistAnswerToFrontend) as DetailedAnswer[]) || [],
    isLoading,
    isError: error,
  };
}

export function useUserChecklistHistory(userId?: string, companyId?: string) {
  const { data, error, isLoading } = useSWR<UserChecklistEntry[]>(
    userId && companyId ? `user_cl_history_${userId}_${companyId}` : null,
    async () =>
      mapSubmissionList(await checklistsService.listAdminSubmissions({ userId, companyId })).map((submission) => ({
        id: submission.id,
        checklist_id: submission.checklist_id,
        status: submission.status,
        started_at: submission.started_at,
        completed_at: submission.completed_at ?? null,
        org_unit_id: submission.org_unit_id ?? null,
        created_at: submission.created_at ?? submission.started_at,
        checklists: submission.checklist ?? null,
      })),
  );

  return {
    history: data || [],
    isLoading,
    isError: error,
  };
}
