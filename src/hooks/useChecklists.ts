import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { 
  Checklist, 
  ChecklistSection,
  ChecklistQuestion, 
  ChecklistSubmission, 
  ChecklistAnswer,
  ChecklistFolder
} from '../types';

const fetcher = async <T>(queryFn: () => PromiseLike<{ data: T | null; error: unknown }>) => {
  const { data, error } = await queryFn();
  if (error) throw error;
  return data;
};

/**
 * Hook para buscar checklists disponíveis para a empresa.
 */
export function useChecklists(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Checklist[]>(
    companyId ? `checklists_${companyId}` : null,
    () => fetcher(() => supabase
      .from('checklists')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    )
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
    () => fetcher(() => supabase
      .from('checklist_folders')
      .select('*')
      .eq('company_id', companyId)
      .order('order_index', { ascending: true })
    )
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
    () => fetcher(() => supabase
      .from('checklist_questions')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('order_index', { ascending: true })
    )
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
    () => fetcher(() => supabase
      .from('checklist_questions')
      .select('*, checklists!inner(company_id)')
      .eq('checklists.company_id', companyId)
    )
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
    () => fetcher(() => supabase
      .from('checklist_sections')
      .select('*')
      .eq('checklist_id', checklistId)
      .order('order_index', { ascending: true })
    )
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
    () => fetcher(() => supabase
      .from('checklist_submissions')
      .select('*, checklist:checklists(title)')
      .eq('id', submissionId)
      .single()
    ),
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
      .select('*')
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
    () => fetcher(() => supabase
      .from('checklist_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('status', 'IN_PROGRESS')
    )
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
    () => fetcher(() => supabase
      .from('checklist_submissions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    )
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
    () => fetcher(() => supabase
      .from('checklist_answers')
      .select('*, checklist_submissions!inner(company_id, status)')
      .eq('checklist_submissions.company_id', companyId)
      .eq('checklist_submissions.status', 'COMPLETED')
    )
  );

  return {
    answers: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar TODOS os Planos de Ação de uma empresa (Admin Dashboard).
 */
export function useAllActionPlans(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    companyId ? `all_action_plans_${companyId}` : null,
    () => fetcher(async () => {
      return supabase
        .from('checklist_answers')
        .select(`
          *,
          checklist_submissions!inner(
            id, status, checklist_id, user_id, company_id, created_at,
            checklists(title)
          ),
          checklist_questions!inner(text)
        `)
        .not('action_plan', 'is', null)
        .eq('checklist_submissions.company_id', companyId)
        .order('created_at', { ascending: false });
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
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    userId ? `action_plans_received_${userId}` : null,
    () => fetcher(async () => {
      return supabase
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
  const { data, error, isLoading, mutate } = useSWR<any[]>(
    userId ? `action_plans_sent_${userId}` : null,
    () => fetcher(async () => {
      return supabase
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
      .select('*')
      .eq('checklist_id', checklistId)
      .eq('user_id', userId)
      .eq('status', 'IN_PROGRESS')
      .maybeSingle();

    if (existing) return existing;

    // 2. Cria uma nova
    const { data: created, error } = await supabase
      .from('checklist_submissions')
      .insert({
        checklist_id: checklistId,
        user_id: userId,
        company_id: companyId,
        org_unit_id: orgUnitId,
        status: 'IN_PROGRESS'
      })
      .select()
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

    const { error } = await supabase
      .from('checklist_answers')
      .upsert(payload, {
        onConflict: 'submission_id,question_id'
      });

    if (error) throw error;
  },

  /**
   * Finaliza o checklist.
   */
  async completeSubmission(submissionId: string) {
    const { error } = await supabase
      .from('checklist_submissions')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (error) throw error;
  },

  /**
   * Resolve um plano de ação
   */
  async resolveActionPlan(answerId: string) {
    const { error } = await supabase
      .from('checklist_answers')
      .update({
        action_plan_status: 'RESOLVED',
        updated_at: new Date().toISOString()
      })
      .eq('id', answerId);

    if (error) throw error;
  },

  /**
   * --- CRUD DE PASTAS (ADMIN) ---
   */

  async createFolder(data: Partial<ChecklistFolder>) {
    const { data: created, error } = await supabase
      .from('checklist_folders')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateFolder(id: string, data: Partial<ChecklistFolder>) {
    const { error } = await supabase
      .from('checklist_folders')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteFolder(id: string) {
    const { error } = await supabase
      .from('checklist_folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorderFolders(folders: { id: string, order_index: number }[]) {
    const updates = folders.map(f => 
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
    const { data: created, error } = await supabase
      .from('checklists')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateChecklist(id: string, data: Partial<Checklist>) {
    const { error } = await supabase
      .from('checklists')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteChecklist(id: string) {
    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- CRUD DE SEÇÕES (ADMIN) ---
   */

  async createSection(checklistId: string, title: string, orderIndex: number) {
    const { data: created, error } = await supabase
      .from('checklist_sections')
      .insert({ checklist_id: checklistId, title, order_index: orderIndex })
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateSection(id: string, data: Partial<ChecklistSection>) {
    const { error } = await supabase
      .from('checklist_sections')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteSection(id: string) {
    const { error } = await supabase
      .from('checklist_sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- CRUD DE PERGUNTAS (ADMIN) ---
   */

  async createQuestion(data: Partial<ChecklistQuestion>) {
    const { data: created, error } = await supabase
      .from('checklist_questions')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return created;
  },

  async updateQuestion(id: string, data: Partial<ChecklistQuestion>) {
    const { error } = await supabase
      .from('checklist_questions')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async deleteQuestion(id: string) {
    const { error } = await supabase
      .from('checklist_questions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * --- REORDENAÇÃO (BULT UPDATE) ---
   */

  async reorderQuestions(questions: { id: string, order_index: number, section_id?: string | null }[]) {
    // Supabase não tem bulk update nativo simples via JS client sem RPC
    // Vamos fazer um loop ou sugerir um RPC. Para MVP com poucos itens, loop Promise.all resolve
    const updates = questions.map(q => 
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
    const updates = sections.map(s => 
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
