import useSWR from 'swr';
import { z } from 'zod';
import { supabase, fetcher } from '../lib/supabaseClient';
import { 
  Checklist, 
  ChecklistSection,
  ChecklistQuestion, 
  ChecklistSubmission, 
  ChecklistAnswer,
  ChecklistFolder
} from '../types';

// ============================================================================

import { 
  checklistSubmissionSchema, 
  checklistAnswerSchema,
  checklistFolderSchema,
  checklistSchema,
  checklistSectionSchema,
  checklistQuestionSchema,
  reorderListSchema
} from '../types/schemas';

/**
 * Hook para buscar checklists disponíveis para a empresa.
 */
export function useChecklists(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Checklist[]>(
    companyId ? `checklists_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklists')
        .select('id, company_id, folder_id, title, description, access_type, status, created_at')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (result.data) {
        result.data = z.array(checklistSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    checklists: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar as pastas (folders) de checklists de uma empresa.
 */
export function useChecklistFolders(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistFolder[]>(
    companyId ? `checklist_folders_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_folders')
        .select('id, company_id, name, color, order_index, created_at')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (result.data) {
        result.data = z.array(checklistFolderSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    folders: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar perguntas de um checklist específico.
 */
export function useChecklistQuestions(checklistId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistQuestion[]>(
    checklistId ? `checklist_questions_${checklistId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_questions')
        .select('id, checklist_id, section_id, text, type, required, order_index, description, config')
        .eq('checklist_id', checklistId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (result.data) {
        result.data = z.array(checklistQuestionSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar TODAS as perguntas de todos os checklists de uma empresa (Dashboard Admin).
 */
export function useAllCompanyQuestions(companyId?: string) {
  const { data, error, isLoading } = useSWR<ChecklistQuestion[]>(
    companyId ? `all_company_questions_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_questions')
        .select('id, checklist_id, section_id, text, type, required, order_index, description, config, checklists!inner(company_id)')
        .eq('checklists.company_id', companyId)
        .is('deleted_at', null);
      
      if (result.data) {
        result.data = z.array(checklistQuestionSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    questions: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar seções de um checklist específico.
 */
export function useChecklistSections(checklistId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSection[]>(
    checklistId ? `checklist_sections_${checklistId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_sections')
        .select('id, checklist_id, title, description, order_index')
        .eq('checklist_id', checklistId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (result.data) {
        result.data = z.array(checklistSectionSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    sections: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para gerenciar/recuperar submissões (Ativas ou Finalizadas).
 */
export function useChecklistSubmission(submissionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSubmission>(
    submissionId ? `submission_${submissionId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_submissions')
        .select('id, checklist_id, user_id, company_id, org_unit_id, status, started_at, completed_at, checklist:checklists(title)')
        .eq('id', submissionId)
        .single();
      
      if (result.data) {
        result.data = checklistSubmissionSchema.partial().parse(result.data) as any;
      }
      return result;
    }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  return {
    submission: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para recuperar as respostas de uma submissão.
 */
export function useChecklistAnswers(submissionId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistAnswer[]>(
    submissionId ? `answers_${submissionId}` : null,
    () => fetcher(() => supabase
      .from('checklist_answers')
      .select('id, submission_id, question_id, value, note, action_plan, assigned_user_id, photo_urls, action_plan_due_date, action_plan_status')
      .eq('submission_id', submissionId)
    ),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false
    }
  );

  return {
    answers: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar todas as submissões EM ANDAMENTO de um usuário.
 */
export function useUserSubmissions(userId?: string, companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ChecklistSubmission[]>(
    userId && companyId ? `user_submissions_${userId}_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_submissions')
        .select('id, checklist_id, user_id, company_id, status, started_at, completed_at')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('status', 'IN_PROGRESS');
      
      if (result.data) {
        result.data = z.array(checklistSubmissionSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar todas as submissões de uma empresa (para Dashboard).
 */
export function useAllSubmissions(companyId?: string) {
  const { data, error, isLoading } = useSWR<ChecklistSubmission[]>(
    companyId ? `all_submissions_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_submissions')
        .select('id, checklist_id, user_id, company_id, org_unit_id, status, started_at, completed_at, created_at')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (result.data) {
        result.data = z.array(checklistSubmissionSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar todas as respostas de uma empresa (para Dashboard).
 * Filtra apenas submissões finalizadas para garantir integridade dos dados.
 */
export function useAllAnswers(companyId?: string) {
  const { data, error, isLoading } = useSWR<ChecklistAnswer[]>(
    companyId ? `all_answers_${companyId}` : null,
    async () => {
      // 1. Primeiro buscamos os IDs das submissões finalizadas desta empresa
      const { data: subs, error: subErr } = await supabase
        .from('checklist_submissions')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED');
      
      if (subErr) throw subErr;
      if (!subs || subs.length === 0) return [];

      const submissionIds = subs.map(s => s.id);

      // 2. Buscamos todas as respostas dessas submissões
      // Nota: Supabase tem um limite de itens em queries 'in'. 
      // Para dashboards muito grandes (>1000 submissões), pode ser necessário paginar ou usar RPC.
      const { data: answers, error: ansErr } = await supabase
        .from('checklist_answers')
        .select('id, submission_id, question_id, value, note, action_plan, assigned_user_id, photo_urls, action_plan_due_date, action_plan_status, created_at')
        .in('submission_id', submissionIds);
      
      if (ansErr) throw ansErr;
      return answers || [];
    }
  );

  return {
    answers: data || [],
    isLoading,
    isError: error
  };
}

interface ActionPlan extends ChecklistAnswer {
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
}

/**
 * Hook para buscar TODOS os Planos de Ação de uma empresa (Admin Dashboard).
 */
export function useAllActionPlans(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    companyId ? `all_action_plans_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_answers')
        .select(`
          id, submission_id, question_id, value, note, action_plan, assigned_user_id, photo_urls, action_plan_due_date, action_plan_status, created_at,
          checklist_submissions!inner(
            id, status, checklist_id, user_id, company_id, created_at,
            checklists(title)
          ),
          checklist_questions!inner(text)
        `)
        .not('action_plan', 'is', null)
        .eq('checklist_submissions.company_id', companyId)
        .order('created_at', { ascending: false });
        
      if (result.data) {
        // Validação parcial do ActionPlan baseada nos schemas existentes
        result.data = z.array(checklistAnswerSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Planos de Ação RECEBIDOS (atribuídos a mim).
 */
export function useActionPlansReceived(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    userId ? `action_plans_received_${userId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_answers')
        .select(`
          *,
          checklist_submissions!inner(
            id, status, checklist_id, user_id, created_at,
            checklists(title)
          ),
          checklist_questions!inner(text)
        `)
        .not('action_plan', 'is', null)
        .eq('assigned_user_id', userId)
        .order('created_at', { ascending: false });
        
      if (result.data) {
        result.data = z.array(checklistAnswerSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Planos de Ação ENVIADOS (que eu criei para outros resolverem).
 */
export function useActionPlansSent(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ActionPlan[]>(
    userId ? `action_plans_sent_${userId}` : null,
    () => fetcher(async () => {
      const result = await supabase
        .from('checklist_answers')
        .select(`
          *,
          checklist_submissions!inner(
            id, status, checklist_id, user_id, created_at,
            checklists(title)
          ),
          checklist_questions!inner(text)
        `)
        .not('action_plan', 'is', null)
        .eq('action_plan_created_by', userId)
        .order('created_at', { ascending: false });
        
      if (result.data) {
        result.data = z.array(checklistAnswerSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    actionPlans: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Funções de Ação (Mutation) para Checklists
 */
export const checklistActions = {
  /**
   * Inicia ou recupera uma submissão em progresso.
   */
  async startSubmission(checklistId: string, userId: string, companyId: string, orgUnitId?: string) {
    // 1. Verifica se já existe uma em progresso
    const { data: existing } = await supabase
      .from('checklist_submissions')
      .select('id, checklist_id, user_id, status')
      .eq('checklist_id', checklistId)
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .maybeSingle();

    if (existing) return existing;

    // Validação com Zod
    const validation = checklistSubmissionSchema.safeParse({
      checklist_id: checklistId,
      user_id: userId,
      company_id: companyId,
      org_unit_id: orgUnitId,
      status: 'IN_PROGRESS'
    });

    if (!validation.success) {
      throw new Error("Dados de submissão inválidos: " + validation.error.message);
    }

    // 2. Cria uma nova
    const { data: created, error } = await supabase
      .from('checklist_submissions')
      .insert(validation.data)
      .select('id')
      .single();

    if (error) throw error;
    return created;
  },

  /**
   * Salva ou atualiza uma resposta individual (Auto-save).
   */
  async saveAnswer(
    submissionId: string, 
    question_id: string, 
    value: string, 
    note?: string, 
    action_plan?: string,
    assigned_user_id?: string,
    photo_urls?: string[],
    action_plan_due_date?: string,
    currentUserId?: string
  ) {
    const payload: Record<string, unknown> = {
      submission_id: submissionId,
      question_id: question_id,
      value: value,
      note: note || null,
      action_plan: action_plan || null,
      assigned_user_id: assigned_user_id || null,
      photo_urls: photo_urls || [],
      action_plan_due_date: action_plan_due_date || null,
      updated_at: new Date().toISOString()
    };

    // Grava quem criou o plano de ação (apenas quando há plano preenchido)
    if (action_plan && currentUserId) {
      payload.action_plan_created_by = currentUserId;
      // Se tem plano mas status não existe ainda, inicializa
      payload.action_plan_status = 'PENDING';
    }

    // Validação com Zod
    const validation = checklistAnswerSchema.safeParse(payload);
    if (!validation.success) {
      throw new Error("Dados de resposta inválidos: " + validation.error.message);
    }

    const { error } = await supabase
      .from('checklist_answers')
      .upsert(validation.data, {
        onConflict: 'submission_id,question_id'
      });

    if (error) throw error;
  },

  /**
   * Finaliza o checklist.
   */
  async completeSubmission(submissionId: string) {
    const payload = {
      status: 'COMPLETED' as const,
      completed_at: new Date().toISOString()
    };

    const validation = checklistSubmissionSchema.partial().safeParse(payload);
    if (!validation.success) throw new Error("Falha na validação de conclusão: " + validation.error.message);

    const { error } = await supabase
      .from('checklist_submissions')
      .update(validation.data)
      .eq('id', submissionId);

    if (error) throw error;
  },

  /**
   * Resolve um plano de ação
   */
  async resolveActionPlan(answerId: string) {
    const payload = {
      action_plan_status: 'RESOLVED',
      updated_at: new Date().toISOString()
    };

    const validation = checklistAnswerSchema.partial().safeParse(payload);
    if (!validation.success) throw new Error("Falha na validação da resolução: " + validation.error.message);

    const { error } = await supabase
      .from('checklist_answers')
      .update(validation.data)
      .eq('id', answerId);

    if (error) throw error;
  },

  /**
   * --- CRUD DE PASTAS (ADMIN) ---
   */

  async createFolder(data: Partial<ChecklistFolder>) {
    const validation = checklistFolderSchema.safeParse(data);
    if (!validation.success) throw new Error("Dados da pasta inválidos: " + validation.error.message);

    const { data: created, error } = await supabase
      .from('checklist_folders')
      .insert(validation.data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateFolder(id: string, data: Partial<ChecklistFolder>) {
    const validation = checklistFolderSchema.partial().safeParse(data);
    if (!validation.success) throw new Error("Dados de atualização da pasta inválidos: " + validation.error.message);

    const { error } = await supabase
      .from('checklist_folders')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteFolder(id: string) {
    const { error } = await supabase
      .from('checklist_folders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  async reorderFolders(folders: { id: string, order_index: number }[]) {
    const validation = reorderListSchema.safeParse(folders);
    if (!validation.success) throw new Error("Dados de reordenação inválidos: " + validation.error.message);

    const updates = validation.data.map(f => 
      supabase
        .from('checklist_folders')
        .update({ order_index: f.order_index })
        .eq('id', f.id)
    );
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) throw firstError.error;
  },

  /**
   * --- CRUD DE TEMPLATES (ADMIN) ---
   */

  async createChecklist(data: Partial<Checklist>) {
    const validation = checklistSchema.safeParse(data);
    if (!validation.success) throw new Error("Dados do checklist inválidos: " + validation.error.message);

    const { data: created, error } = await supabase
      .from('checklists')
      .insert(validation.data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateChecklist(id: string, data: Partial<Checklist>) {
    const validation = checklistSchema.partial().safeParse(data);
    if (!validation.success) throw new Error("Dados de atualização do checklist inválidos: " + validation.error.message);

    const { error } = await supabase
      .from('checklists')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteChecklist(id: string) {
    const { error } = await supabase
      .from('checklists')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- CRUD DE SEÇÕES (ADMIN) ---
   */

  async createSection(checklistId: string, title: string, orderIndex: number) {
    const payload = { checklist_id: checklistId, title, order_index: orderIndex };
    const validation = checklistSectionSchema.safeParse(payload);
    if (!validation.success) throw new Error("Dados da seção inválidos: " + validation.error.message);

    const { data: created, error } = await supabase
      .from('checklist_sections')
      .insert(validation.data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateSection(id: string, data: Partial<ChecklistSection>) {
    const validation = checklistSectionSchema.partial().safeParse(data);
    if (!validation.success) throw new Error("Dados de atualização da seção inválidos: " + validation.error.message);

    const { error } = await supabase
      .from('checklist_sections')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSection(id: string) {
    const { error } = await supabase
      .from('checklist_sections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- CRUD DE PERGUNTAS (ADMIN) ---
   */

  async createQuestion(data: Partial<ChecklistQuestion>) {
    const validation = checklistQuestionSchema.safeParse(data);
    if (!validation.success) throw new Error("Dados da pergunta inválidos: " + validation.error.message);

    const { data: created, error } = await supabase
      .from('checklist_questions')
      .insert(validation.data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateQuestion(id: string, data: Partial<ChecklistQuestion>) {
    const validation = checklistQuestionSchema.partial().safeParse(data);
    if (!validation.success) throw new Error("Dados de atualização da pergunta inválidos: " + validation.error.message);

    const { error } = await supabase
      .from('checklist_questions')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteQuestion(id: string) {
    const { error } = await supabase
      .from('checklist_questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- REORDENAÇÃO (BULT UPDATE) ---
   */

  async reorderQuestions(questions: { id: string, order_index: number, section_id?: string | null }[]) {
    const validation = reorderListSchema.safeParse(questions);
    if (!validation.success) throw new Error("Dados de reordenação de perguntas inválidos: " + validation.error.message);

    const updates = validation.data.map(q => 
      supabase
        .from('checklist_questions')
        .update({ order_index: q.order_index, section_id: q.section_id })
        .eq('id', q.id)
    );
    
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) throw firstError.error;
  },

  async reorderSections(sections: { id: string, order_index: number }[]) {
    const validation = reorderListSchema.safeParse(sections);
    if (!validation.success) throw new Error("Dados de reordenação de seções inválidos: " + validation.error.message);

    const updates = validation.data.map(s => 
      supabase
        .from('checklist_sections')
        .update({ order_index: s.order_index })
        .eq('id', s.id)
    );
    
    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error);
    if (firstError) throw firstError.error;
  }
};

// ============================================================================
// HOOKS AVANÇADOS PARA DASHBOARD
// ============================================================================

interface DetailedAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  value: string;
  note: string | null;
  action_plan: string | null;
  assigned_user_id: string | null;
  action_plan_status: string | null;
  action_plan_due_date: string | null;
  action_plan_created_by: string | null;
  photo_urls: string[];
  created_at: string;
  checklist_questions: {
    text: string;
    type: string;
    section_id: string | null;
    checklist_id: string;
  } | null;
  checklist_submissions: {
    id: string;
    user_id: string;
    checklist_id: string;
    org_unit_id: string | null;
    status: string;
    completed_at: string | null;
    created_at: string;
  } | null;
}

/**
 * Hook para buscar respostas detalhadas com JOINs 
 * (pergunta, submissão, usuário) — para tabela analítica no dashboard.
 */
export function useChecklistDetailedAnswers(companyId?: string) {
  const { data, error, isLoading } = useSWR<DetailedAnswer[]>(
    companyId ? `detailed_answers_${companyId}` : null,
    async () => {
      // 1. Buscamos todas as submissões finalizadas da empresa
      const { data: subs, error: subErr } = await supabase
        .from('checklist_submissions')
        .select('id, company_id, status, user_id, checklist_id, org_unit_id, created_at, completed_at')
        .eq('company_id', companyId)
        .eq('status', 'COMPLETED');
      
      if (subErr) throw subErr;
      if (!subs || subs.length === 0) return [];

      const submissionIds = subs.map(s => s.id);

      // 2. Buscamos todas as respostas dessas submissões
      const { data: answers, error: ansErr } = await supabase
        .from('checklist_answers')
        .select(`
          id, submission_id, question_id, value, note, action_plan, assigned_user_id, photo_urls, action_plan_due_date, action_plan_status, created_at,
          checklist_questions(text, type, section_id, checklist_id)
        `)
        .in('submission_id', submissionIds);
      
      if (ansErr) throw ansErr;

      // 3. Mapeamos as submissões de volta para as respostas
      const detailedAnswers = (answers || []).map(ans => ({
        ...ans,
        checklist_submissions: subs.find(s => s.id === ans.submission_id) || null
      }));

      return detailedAnswers as DetailedAnswer[];
    }
  );

  return {
    detailedAnswers: (data || []) as DetailedAnswer[],
    isLoading,
    isError: error
  };
}

interface UserChecklistEntry {
  id: string;
  checklist_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  org_unit_id: string | null;
  created_at: string;
  checklists: { title: string } | null;
}

/**
 * Hook para buscar o histórico completo de checklists de um usuário específico.
 */
export function useUserChecklistHistory(userId?: string, companyId?: string) {
  const { data, error, isLoading } = useSWR<UserChecklistEntry[]>(
    userId && companyId ? `user_cl_history_${userId}_${companyId}` : null,
    () => fetcher(() => supabase
      .from('checklist_submissions')
      .select('id, checklist_id, user_id, company_id, status, started_at, completed_at, created_at, checklists(title)')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    )
  );

  return {
    history: (data || []) as UserChecklistEntry[],
    isLoading,
    isError: error
  };
}
