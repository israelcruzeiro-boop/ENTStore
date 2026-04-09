import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useChecklistSubmission, 
  useChecklistAnswers, 
  useChecklistQuestions,
  useChecklistSections 
} from '../../hooks/useChecklists';
import { useOrgStructure, useUsers } from '../../hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  User,
  MapPin,
  FileText,
  Camera,
  MessageSquare,
  Lightbulb,
  Check,
  Star,
  Minus,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function ChecklistSubmissionDetail() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  
  const { submission, isLoading: loadingSubmission } = useChecklistSubmission(submissionId);
  const { answers, isLoading: loadingAnswers } = useChecklistAnswers(submissionId);
  const { questions, isLoading: loadingQuestions } = useChecklistQuestions(submission?.checklist_id);
  const { sections, isLoading: loadingSections } = useChecklistSections(submission?.checklist_id);
  const { orgUnits } = useOrgStructure(submission?.company_id);
  const { users } = useUsers(submission?.company_id);

  const isLoading = loadingSubmission || loadingAnswers || loadingQuestions || loadingSections;

  const submissionUser = useMemo(() => 
    users.find(u => u.id === submission?.user_id), 
    [users, submission?.user_id]
  );
  
  const submissionUnit = useMemo(() => 
    orgUnits.find(u => u.id === submission?.org_unit_id), 
    [orgUnits, submission?.org_unit_id]
  );

  const groupedAnswers = useMemo(() => {
    if (!sections.length || !questions.length || !answers.length) return [];

    return sections.map(section => {
      const sectionQuestions = questions
        .filter(q => q.section_id === section.id)
        .sort((a, b) => a.order_index - b.order_index);

      const sectionDetails = sectionQuestions.map(q => {
        const answer = answers.find(a => a.question_id === q.id);
        return {
          question: q,
          answer: answer
        };
      });

      return {
        section,
        items: sectionDetails
      };
    }).filter(s => s.items.length > 0);
  }, [sections, questions, answers]);

  const stats = useMemo(() => {
    if (!answers.length) return { conforme: 0, naoConforme: 0, checkeds: 0, totalChecks: 0, total: 0, percentage: 0 };
    
    // Análise de Compliance
    const complianceAnswers = answers.filter(a => {
      const q = questions.find(que => que.id === a.question_id);
      return q?.type === 'COMPLIANCE';
    });

    const conforme = complianceAnswers.filter(a => a.value === 'C').length;
    const naoConforme = complianceAnswers.filter(a => a.value === 'NC').length;
    const totalComp = complianceAnswers.length;

    // Análise de Checagem (Checkboxes)
    const checkAnswers = answers.filter(a => {
      const q = questions.find(que => que.id === a.question_id);
      return q?.type === 'CHECK';
    });

    const checkeds = checkAnswers.filter(a => a.value === 'CHECKED').length;
    const totalChecks = checkAnswers.length;

    // Calcular Percentual Geral de Sucesso (Considera C e Checkeds como sucessos)
    const totalPossiblePoints = totalComp + totalChecks;
    const totalEarnedPoints = conforme + checkeds;
    const percentage = totalPossiblePoints > 0 ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) : 0;

    return { 
      conforme, 
      naoConforme, 
      checkeds,
      totalChecks,
      total: questions.length, 
      percentage 
    };
  }, [answers, questions]);

  const exportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    // Remove background do body para o print se quiser muito limpo
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#ffffff';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('report-content');
        if (el) {
           el.style.border = 'none';
           el.style.boxShadow = 'none';
        }
      }
    });

    document.body.style.backgroundColor = originalBg;
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`relatorio-${submission?.checklist?.title || 'auditoria'}-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40">
        <FileText className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-black text-slate-900 mb-2">Relatório inacessível</h2>
        <p className="text-slate-500 mb-6 text-sm">A submissão solicitada não foi encontrada ou foi removida do sistema.</p>
        <Button onClick={() => navigate(-1)} className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold hover:scale-105 transition-all">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  // --- COMPONENTES AUXILIARES DE RENDERIZAÇÃO DE RESPOSTAS ---

  const renderCompliance = (value: string) => {
    switch(value) {
      case 'C':
        return (
          <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center gap-2 border border-emerald-100 shadow-sm shadow-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> CONFORME
          </div>
        );
      case 'NC':
        return (
          <div className="px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 font-bold text-xs flex items-center gap-2 border border-rose-100 shadow-sm shadow-rose-50">
            <XCircle className="h-4 w-4 text-rose-500" /> NÃO CONFORME
          </div>
        );
      default:
        return (
          <div className="px-4 py-1.5 rounded-full bg-slate-100 text-slate-500 font-bold text-xs flex items-center gap-2 border border-slate-200">
            <Minus className="h-4 w-4" /> NÃO APLICÁVEL
          </div>
        );
    }
  };

  const renderCheck = (value: string) => {
    if (value === 'CHECKED') {
      return (
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border-2 border-emerald-500 shadow-sm shadow-emerald-100">
          <Check className="h-6 w-6 text-emerald-600 stroke-[3]" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border-2 border-slate-200 opacity-50">
        <Minus className="h-5 w-5 text-slate-400 stroke-[3]" />
      </div>
    );
  };

  const renderRating = (value: string) => {
    const num = parseInt(value, 10) || 0;
    return (
      <div className="flex items-center gap-1.5 bg-slate-50/80 px-4 py-2 rounded-2xl border border-slate-100">
        <div className="flex">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((_, i) => i < 5).map((star) => {
            // Adaptar 1-10 para 1-5 estrelas (2 pontos por estrela) visualmente, ou apenas mostrar nota
            const isActive = star * 2 <= num;
            return (
              <Star 
                key={star} 
                className={`h-4 w-4 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'}`} 
              />
            );
          })}
        </div>
        <span className="font-black text-slate-900 border-l border-slate-200 pl-2 ml-1">{num}<span className="text-slate-400 text-[10px]">/10</span></span>
      </div>
    );
  };

  const renderTextOrNumber = (value: string) => {
    if (!value) return <span className="text-slate-400 italic text-sm">Não preenchido</span>;
    return (
      <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium text-sm min-w-[120px] text-right">
        {value}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
      {/* Action Bar (No Print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 no-print bg-white p-4 rounded-3xl border border-slate-100 shadow-sm shadow-slate-100/50 sticky top-4 z-10">
        <Button onClick={() => navigate(-1)} variant="ghost" className="text-slate-600 hover:text-slate-900 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar Histórico
        </Button>
        <Button onClick={exportPDF} className="w-full sm:w-auto bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg shadow-black/10 transition-all font-bold px-6 h-11">
          <Download className="mr-2 h-4 w-4" /> Documento Oficial (PDF)
        </Button>
      </div>

      <div id="report-content" className="bg-white p-8 md:p-12 lg:p-16 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
        {/* Cabeçalho do Relatório - Senior Style */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10 pb-12 border-b border-slate-100">
          <div className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
               <Badge className="bg-slate-900 text-white border-transparent hover:bg-slate-800 uppercase tracking-widest text-[9px] font-black px-3 py-1 rounded-md">
                 AUDIT REPORT
               </Badge>
               <span className="text-slate-400 font-bold text-xs">ID: {submission.id.split('-')[0].toUpperCase()}</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {submission.checklist?.title}
            </h1>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs shrink-0">
                   {submissionUser?.name?.charAt(0) || 'U'}
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Avaliador</p>
                   <p className="font-bold text-slate-800 text-sm leading-tight">{submissionUser?.name || 'Sistema'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs shrink-0">
                   <MapPin size={14} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Unidade Operacional</p>
                   <p className="font-bold text-slate-800 text-sm leading-tight">{submissionUnit?.name || 'Geral'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                   <Calendar size={14} />
                </div>
                <div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Concluído em</p>
                   <p className="font-bold text-slate-800 text-sm leading-tight">
                     {submission.completed_at ? format(new Date(submission.completed_at), "dd MMM yyyy, HH:mm", { locale: ptBR }) : 'Pendente'}
                   </p>
                </div>
              </div>
            </div>
          </div>

          {/* Master Score Dial */}
          <div className="flex flex-col items-center justify-center bg-slate-50 p-6 rounded-3xl border border-slate-100 shrink-0">
             <div className="relative">
                <svg className="h-32 w-32 transform -rotate-90 drop-shadow-xl">
                  <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white" />
                  <circle 
                    cx="64" cy="64" r="54" 
                    stroke="url(#gradient-score)" 
                    strokeWidth="12" 
                    fill="transparent" 
                    strokeDasharray={339} 
                    strokeDashoffset={339 - (339 * stats.percentage) / 100} 
                    className="transition-all duration-1000" 
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="gradient-score" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={stats.percentage > 70 ? "#10b981" : stats.percentage > 40 ? "#f59e0b" : "#ef4444"} />
                      <stop offset="100%" stopColor={stats.percentage > 70 ? "#059669" : stats.percentage > 40 ? "#d97706" : "#b91c1c"} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white rounded-full m-3 shadow-inner">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{stats.percentage}<span className="text-lg text-slate-400 absolute ml-0.5 mt-0.5">%</span></span>
                </div>
             </div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-4">Índice Global</p>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 mb-16">
           <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100/50">
             <p className="text-[10px] font-black uppercase text-emerald-600/70 tracking-widest mb-1 flex items-center gap-1.5">
               <CheckCircle2 size={12} /> C. Positiva
             </p>
             <p className="text-3xl font-black text-emerald-900">{stats.conforme + stats.checkeds}</p>
           </div>
           
           <div className="bg-rose-50 rounded-2xl p-5 border border-rose-100/50">
             <p className="text-[10px] font-black uppercase text-rose-600/70 tracking-widest mb-1 flex items-center gap-1.5">
               <XCircle size={12} /> C. Negativa
             </p>
             <p className="text-3xl font-black text-rose-900">{stats.naoConforme}</p>
           </div>

           <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100/50">
             <p className="text-[10px] font-black uppercase text-blue-600/70 tracking-widest mb-1 flex items-center gap-1.5">
               <Check size={12} /> Tarefas
             </p>
             <p className="text-3xl font-black text-blue-900">{stats.checkeds}<span className="text-sm text-blue-400">/{stats.totalChecks}</span></p>
           </div>

           <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/50">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 flex items-center gap-1.5">
               <FileText size={12} /> Avaliações
             </p>
             <p className="text-3xl font-black text-slate-900">{stats.total}</p>
           </div>
        </div>

        {/* Detalhamento de Seções */}
        <div className="space-y-12">
          {groupedAnswers.map(({ section, items }) => (
            <div key={section.id} className="relative">
              {/* Nome da Seção */}
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-slate-900 rounded-xl text-white">
                    <Award size={18} />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{section.title}</h2>
                    {section.description && <p className="text-sm font-semibold text-slate-500 mt-0.5">{section.description}</p>}
                 </div>
              </div>
              
              <div className="space-y-4">
                {items.map(({ question, answer }) => (
                  <div key={question.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      
                      {/* Pergunta */}
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-800 leading-snug">{question.text}</h3>
                        {question.description && <p className="text-sm font-medium text-slate-500 mt-1">{question.description}</p>}
                      </div>
                      
                      {/* Resposta Analítica Visual */}
                      <div className="flex items-center shrink-0">
                        {question.type === 'COMPLIANCE' && renderCompliance(answer?.value || '')}
                        {question.type === 'CHECK' && renderCheck(answer?.value || '')}
                        {question.type === 'RATING' && renderRating(answer?.value || '')}
                        {['TEXT', 'NUMBER', 'DATE', 'TIME'].includes(question.type) && renderTextOrNumber(answer?.value || '')}
                      </div>

                    </div>

                    {/* Blocos de Evidência e Observações Estilizados */}
                    {(answer?.note || (answer?.photo_urls && answer.photo_urls.length > 0) || answer?.action_plan) && (
                      <div className="bg-slate-50/50 border-t border-slate-100 p-5 md:p-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Textos */}
                        <div className="space-y-4">
                          {answer.note && (
                            <div>
                              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 flex items-center gap-1.5">
                                <MessageSquare size={12} /> Observação Adicional
                              </p>
                              <div className="p-3 bg-white rounded-xl border border-slate-200/60 shadow-sm">
                                <p className="text-slate-700 text-sm font-medium italic">{answer.note}</p>
                              </div>
                            </div>
                          )}

                          {answer.action_plan && (
                            <div>
                              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 flex items-center gap-1.5">
                                <Lightbulb size={12} /> Plano de Ação Detectado
                              </p>
                              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 border-l-4 border-l-indigo-500 shadow-sm space-y-2">
                                <p className="text-indigo-900 text-sm font-bold">{answer.action_plan}</p>
                                <div className="flex flex-wrap gap-3 mt-2">
                                  {answer.assigned_user_id && (
                                    <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                                      <User size={12} /> {users.find(u => u.id === answer.assigned_user_id)?.name || 'N/A'}
                                    </span>
                                  )}
                                  {answer.action_plan_due_date && (
                                    <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                                      <Calendar size={12} /> Prazo: {format(new Date(answer.action_plan_due_date), 'dd/MM/yyyy')}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                    answer.action_plan_status === 'RESOLVED'
                                      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                                      : 'text-amber-600 bg-amber-50 border-amber-200'
                                  }`}>
                                    {answer.action_plan_status === 'RESOLVED' ? 'Resolvido' : 'Pendente'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Imagens (Galeria) */}
                        {answer.photo_urls && answer.photo_urls.length > 0 && (
                          <div className={!answer.note && !answer.action_plan ? "col-span-full" : ""}>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-1.5">
                              <Camera size={12} /> Evidências Fotográficas
                            </p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                               {answer.photo_urls.map((url, idx) => (
                                 <a 
                                   key={idx} 
                                   href={url} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="relative group overflow-hidden rounded-xl border-2 border-white shadow-sm aspect-square bg-slate-100 hover:shadow-md transition-shadow cursor-pointer block"
                                 >
                                    <img 
                                      src={url} 
                                      alt={`Evidência ${idx + 1}`} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                       <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm transition-opacity">Ver Real</span>
                                    </div>
                                 </a>
                               ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {groupedAnswers.length === 0 && (
             <div className="py-20 text-center">
                <CheckCircle2 className="mx-auto h-16 w-16 text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">Nenhum dado processado</h3>
                <p className="text-slate-400 mt-2">Esta submissão não possui dados estruturados ou seções válidas no momento.</p>
             </div>
          )}
        </div>

        {/* Rodapé Gráfico Oficial */}
        <div className="mt-16 pt-8 border-t-2 border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-70">
           <div className="flex items-center gap-2">
              <img src="/logo11.png" alt="Logo" className="h-4 grayscale opacity-50" onError={(e) => e.currentTarget.style.display = 'none'} />
              <span>Plataforma Inteligente Administrativa</span>
           </div>
           <span>ID Ref: {submission.id.toUpperCase()}</span>
           <span>Documento Gerado Oficialmente</span>
        </div>
      </div>
    </div>
  );
}
