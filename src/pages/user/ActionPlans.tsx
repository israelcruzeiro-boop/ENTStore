import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActionPlansReceived, useActionPlansSent, checklistActions } from '@/hooks/useChecklists';
import { useUsers } from '@/hooks/usePlatformData';
import { AlertTriangle, CheckCircle2, Clock, Check, ChevronRight, Inbox, Send, User as UserIcon } from 'lucide-react';
import { format, isPast, isToday, addDays, differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { ChecklistAnswer } from '@/types';

type PlanTab = 'RECEIVED' | 'SENT';

interface ActionPlan extends ChecklistAnswer {
  checklist_submissions?: {
    user_id: string;
    checklists?: {
      title: string;
    };
  };
  checklist_questions?: {
    text: string;
  };
}

export const ActionPlans = () => {
  const { user, company } = useAuth();
  const { actionPlans: received, isLoading: loadR, mutate: mutateR } = useActionPlansReceived(user?.id);
  const { actionPlans: sent, isLoading: loadS, mutate: mutateS } = useActionPlansSent(user?.id);
  const { users } = useUsers(company?.id);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PlanTab>('RECEIVED');

  const getUserName = (id?: string) => {
    if (!id) return 'Não informado';
    const u = users.find(u => u.id === id);
    return u?.name || 'Usuário';
  };

  const isLoading = loadR || loadS;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--c-primary)]"></div>
      </div>
    );
  }

  const handleResolve = async (id: string) => {
    try {
      setResolvingId(id);
      await checklistActions.resolveActionPlan(id);
      toast.success('Plano de Ação resolvido com sucesso!');
      mutateR();
      mutateS();
    } catch (err) {
      toast.error('Erro ao resolver plano de ação.');
    } finally {
      setResolvingId(null);
    }
  };

  const getStatusInfo = (plan: ActionPlan) => {
    if (plan.action_plan_status === 'RESOLVED') {
      return {
        label: 'Resolvido',
        color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        icon: <CheckCircle2 size={12} />,
        priority: 4
      };
    }

    if (!plan.action_plan_due_date) {
      return {
        label: 'Sem Prazo',
        color: 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
        icon: <Clock size={12} />,
        priority: 2
      };
    }

    const dueDate = new Date(plan.action_plan_due_date);
    const in1Day = addDays(new Date(), 1);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return {
        label: 'Atrasado',
        color: 'text-red-400 bg-red-400/10 border-red-400/20',
        icon: <AlertTriangle size={12} />,
        priority: 0
      };
    } else if (isToday(dueDate) || dueDate <= in1Day) {
      return {
        label: 'Vence em breve',
        color: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        icon: <Clock size={12} className="animate-pulse" />,
        priority: 1
      };
    } else {
      const daysLeft = differenceInDays(dueDate, new Date());
      return {
        label: `No Prazo (${daysLeft}d)`,
        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        icon: <Check size={12} />,
        priority: 3
      };
    }
  };

  const currentPlans = activeTab === 'RECEIVED' ? received : sent;

  // Ordenar por prioridade (atrasado primeiro, depois vence em breve, etc.)
  const sortedPlans = [...currentPlans].sort((a, b) => {
    const sA = getStatusInfo(a);
    const sB = getStatusInfo(b);
    return sA.priority - sB.priority;
  });

  const pendingReceivedCount = received.filter(p => p.action_plan_status !== 'RESOLVED').length;
  const pendingSentCount = sent.filter(p => p.action_plan_status !== 'RESOLVED').length;

  const renderPlanCard = (plan: ActionPlan) => {
    const status = getStatusInfo(plan);
    const isResolved = plan.action_plan_status === 'RESOLVED';
    const creatorName = getUserName(plan.action_plan_created_by || plan.checklist_submissions?.user_id);
    const assigneeName = getUserName(plan.assigned_user_id);
    
    return (
      <div key={plan.id} className={`p-4 rounded-xl border transition-all ${isResolved ? 'bg-white/5 border-white/5 opacity-50' : 'bg-[#111] border-white/10 hover:border-white/20'}`}>
        <div className="flex justify-between items-start mb-3">
          <div className="space-y-1.5 flex-1">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex w-fit items-center gap-1.5 border ${status.color}`}>
              {status.icon} {status.label}
            </span>
            <h3 className="text-sm font-bold text-white leading-tight">
              {plan.checklist_submissions?.checklists?.title || 'Checklist'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium leading-snug">
              📋 {plan.checklist_questions?.text || 'Pergunta'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-black/40 rounded-lg border border-white/5 mb-3">
          <p className="text-xs text-zinc-300">
            <span className="font-bold text-zinc-500 mr-2 uppercase text-[9px] tracking-widest">O que fazer:</span>
            {plan.action_plan}
          </p>
        </div>

        {/* Metadados: Criador, Responsável, Data */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px] text-zinc-500 font-medium mb-3">
          <div className="flex items-center gap-1.5">
            <UserIcon size={10} className="text-zinc-600" />
            <span>Criado por: <span className="text-zinc-300">{creatorName}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserIcon size={10} className="text-blue-500" />
            <span>Responsável: <span className="text-zinc-300">{assigneeName}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={10} />
            <span>Prazo: <span className="text-zinc-300">{plan.action_plan_due_date ? format(new Date(plan.action_plan_due_date), 'dd/MM/yyyy') : 'N/A'}</span></span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-white/5">
          {activeTab === 'RECEIVED' && !isResolved && (
            <Button 
              size="sm" 
              onClick={() => handleResolve(plan.id)}
              disabled={resolvingId === plan.id}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] tracking-widest uppercase h-8 px-4"
            >
              {resolvingId === plan.id ? 'Resolvendo...' : '✓ Marcar Resolvido'}
            </Button>
          )}
          {activeTab === 'SENT' && (
            <span className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${status.color}`}>
              {status.icon} {isResolved ? 'Concluído' : 'Aguardando Resolução'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-[1600px] w-full pb-8">
      {/* Sub-tabs */}
      <div className="flex gap-2">
        <button 
          onClick={() => setActiveTab('RECEIVED')}
          className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${
            activeTab === 'RECEIVED' 
              ? 'bg-white/10 text-white border-white/20' 
              : 'text-zinc-500 border-white/5 hover:bg-white/5'
          }`}
        >
          <Inbox size={14} /> Para Mim
          {pendingReceivedCount > 0 && (
            <span className="bg-rose-500 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center ml-1">
              {pendingReceivedCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('SENT')}
          className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all flex items-center gap-2 border ${
            activeTab === 'SENT' 
              ? 'bg-white/10 text-white border-white/20' 
              : 'text-zinc-500 border-white/5 hover:bg-white/5'
          }`}
        >
          <Send size={14} /> Enviados por Mim
          {pendingSentCount > 0 && (
            <span className="bg-amber-500 text-black text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center ml-1">
              {pendingSentCount}
            </span>
          )}
        </button>
      </div>

      {/* Lista de Planos */}
      <div className="grid gap-3">
        {sortedPlans.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white/5 rounded-2xl border border-white/5 border-dashed">
            <CheckCircle2 className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {activeTab === 'RECEIVED' ? 'Nenhum plano pendente para você' : 'Você não criou nenhum plano ainda'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              {activeTab === 'RECEIVED' 
                ? 'Quando alguém atribuir um plano de ação a você, ele aparecerá aqui.' 
                : 'Quando você criar um plano de ação em um checklist, poderá acompanhar o status aqui.'}
            </p>
          </div>
        ) : (
          sortedPlans.map(plan => renderPlanCard(plan))
        )}
      </div>
    </div>
  );
};
