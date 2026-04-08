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
  AlertCircle,
  Calendar,
  User,
  MapPin,
  FileText,
  Camera,
  MessageSquare,
  Lightbulb
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
    if (!answers.length) return { conforme: 0, naoConforme: 0, total: 0, percentage: 0 };
    
    const complianceAnswers = answers.filter(a => {
      const q = questions.find(que => que.id === a.question_id);
      return q?.type === 'COMPLIANCE';
    });

    const conforme = complianceAnswers.filter(a => a.value === 'C').length;
    const naoConforme = complianceAnswers.filter(a => a.value === 'NC').length;
    const total = complianceAnswers.length;
    const percentage = total > 0 ? Math.round((conforme / total) * 100) : 0;

    return { conforme, naoConforme, total, percentage };
  }, [answers, questions]);

  const exportPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-900">Relatório não encontrado</h2>
        <Button onClick={() => navigate(-1)} variant="ghost" className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header Ações */}
      <div className="flex items-center justify-between no-print">
        <Button onClick={() => navigate(-1)} variant="ghost" className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Histórico
        </Button>
        <Button onClick={exportPDF} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 transition-all">
          <Download className="mr-2 h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <div id="report-content" className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8">
        {/* Cabeçalho do Relatório */}
        <div className="border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 uppercase tracking-wider text-[10px] font-bold px-2.5 py-0.5">
              Relatório de Auditoria
            </Badge>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {submission.checklist?.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <User className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700">{submissionUser?.name || 'Usuário'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700">{submissionUnit?.name || 'Unidade não definida'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="font-medium text-slate-700">
                  {submission.completed_at ? format(new Date(submission.completed_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : 'Pendente'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="relative">
               <svg className="h-24 w-24 transform -rotate-90">
                 <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                 <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251} strokeDashoffset={251 - (251 * stats.percentage) / 100} className="text-emerald-500 transition-all duration-1000" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-2xl font-black text-slate-900">{stats.percentage}%</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">Índice</span>
               </div>
            </div>
          </div>
        </div>

        {/* Grid de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-emerald-50/50 border-emerald-100 shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-tight">Conformes</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="text-2xl font-black text-emerald-900">{stats.conforme}</div>
            </CardContent>
          </Card>
          <Card className="bg-rose-50/50 border-rose-100 shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
              <span className="text-xs font-bold text-rose-700 uppercase tracking-tight">Não Conformes</span>
              <XCircle className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="text-2xl font-black text-rose-900">{stats.naoConforme}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 border-slate-200 shadow-none">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Total Questões</span>
              <FileText className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="py-2 px-4">
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Detalhamento por Seção */}
        <div className="space-y-10">
          {groupedAnswers.map(({ section, items }) => (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                 <div className="h-2 w-2 rounded-full bg-indigo-500" />
                 <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">{section.title}</h2>
              </div>
              
              <div className="space-y-0 divide-y divide-slate-100">
                {items.map(({ question, answer }) => (
                  <div key={question.id} className="py-6 first:pt-2 last:pb-2">
                    <div className="flex flex-col md:flex-row gap-4 md:items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">PERGUNTA</p>
                        <h3 className="text-md font-bold text-slate-800 leading-snug">{question.text}</h3>
                      </div>
                      
                      <div className="flex items-center gap-2 min-w-[140px] justify-end">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest md:hidden">RESULTADO</p>
                        {question.type === 'COMPLIANCE' ? (
                          answer?.value === 'C' ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none px-3 py-1 flex items-center gap-1.5 shadow-sm shadow-emerald-50">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Conforme
                            </Badge>
                          ) : answer?.value === 'NC' ? (
                            <Badge className="bg-rose-100 text-rose-800 border-none px-3 py-1 flex items-center gap-1.5 shadow-sm shadow-rose-50">
                              <XCircle className="h-3.5 w-3.5" /> Não Conforme
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 border-none px-3 py-1 flex items-center gap-1.5 shadow-sm shadow-slate-50">
                              N/A
                            </Badge>
                          )
                        ) : (
                          <div className="bg-slate-100 text-slate-900 font-bold px-4 py-1.5 rounded-lg text-sm border border-slate-200">
                            {answer?.value || '-'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Observações e Fotos */}
                    {(answer?.note || (answer?.photo_urls && answer.photo_urls.length > 0) || answer?.action_plan) && (
                      <div className="mt-4 ml-0 md:ml-4 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-4">
                        {answer.note && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Observações</span>
                            </div>
                            <p className="text-slate-700 text-sm italic">"{answer.note}"</p>
                          </div>
                        )}

                        {answer.action_plan && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-indigo-400">
                              <Lightbulb className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Plano de Ação</span>
                            </div>
                            <p className="text-indigo-900 text-sm font-medium">{answer.action_plan}</p>
                          </div>
                        )}

                        {answer.photo_urls && answer.photo_urls.length > 0 && (
                          <div className="space-y-2">
                             <div className="flex items-center gap-1.5 text-slate-400">
                              <Camera className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Evidências Fotográficas</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                               {answer.photo_urls.map((url, idx) => (
                                 <div key={idx} className="relative group overflow-hidden rounded-lg border border-slate-200 w-32 h-32 bg-white">
                                    <img 
                                      src={url} 
                                      alt={`Evidência ${idx + 1}`} 
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                 </div>
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
        </div>

        {/* Rodapé do Relatório */}
        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
           <span>Gerado por ENT Store - Auditoria Digital</span>
           <span>Documento ID: {submission.id.slice(0, 8).toUpperCase()}</span>
           <span>Página 1 de 1</span>
        </div>
      </div>
    </div>
  );
}
