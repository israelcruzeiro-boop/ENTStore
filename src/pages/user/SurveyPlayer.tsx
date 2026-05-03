import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSurvey, useSurveyQuestions } from '../../hooks/useSurveys';
import { useOrgStructure } from '../../hooks/usePlatformData';
import { checkSurveyAccess } from '../../lib/permissions';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { surveyService } from '../../services/surveys.service';
import { AnswerValue, SubmitSurveyResponsePayload, SurveyQuestion } from '../../types/surveys';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export const SurveyPlayer = () => {
  const { companySlug, surveyId } = useParams();
  const navigate = useNavigate();
  const { user, company } = useAuth();
  
  const { survey, isLoading: isLoadingSurvey } = useSurvey(surveyId);
  const { orgUnits, orgTopLevels, isLoading: isLoadingOrg } = useOrgStructure(company?.id);
  const surveyAccessReady = !isLoadingSurvey && !isLoadingOrg;
  const hasSurveyAccess =
    surveyAccessReady &&
    !!survey &&
    company?.surveys_enabled !== false &&
    survey.company_id === company?.id &&
    survey.status === 'ACTIVE' &&
    checkSurveyAccess(survey, user, orgUnits, orgTopLevels);
  const { questions, isLoading: isLoadingQuestions } = useSurveyQuestions(hasSurveyAccess ? surveyId : undefined);
  
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdateAnswer = (questionId: string, value: AnswerValue | undefined) => {
    if (value === undefined) {
      setAnswers(prev => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      return;
    }
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (!surveyId || !questions) return;
    
    // Validate required questions
    const missingRequired = questions.filter(q => q.required && !answers[q.id!]);
    
    if (missingRequired.length > 0) {
      toast.error(`Por favor, responda todas as perguntas obrigatórias (faltam ${missingRequired.length}).`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const payload: SubmitSurveyResponsePayload = {
        survey_id: surveyId,
        answers: Object.entries(answers).map(([qId, val]) => ({
          question_id: qId,
          value: val
        }))
      };
      
      await surveyService.submitResponse(payload);
      toast.success("Obrigado pela sua resposta!");
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate(`/${companySlug}/pesquisas`);
      }, 3000);
      
    } catch(e) {
      toast.error((e as Error).message || "Erro ao processar sua resposta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingSurvey || isLoadingOrg || (hasSurveyAccess && isLoadingQuestions)) {
    return (
      <div className="flex h-screen items-center justify-center pt-16">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
      </div>
    );
  }

  if (!hasSurveyAccess) {
    return (
      <div className="pt-32 text-center text-white">
        Pesquisa não encontrada.
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col h-screen items-center justify-center px-4 bg-transparent animate-in zoom-in duration-500">
        <div className="bg-zinc-900/40 p-10 rounded-3xl border border-zinc-800 flex flex-col items-center max-w-md text-center shadow-2xl backdrop-blur-md">
           <CheckCircle2 size={80} className="text-emerald-500 mb-6" />
           <h2 className="text-2xl font-bold text-white mb-2">Muito Obrigado!</h2>
           <p className="text-zinc-400">Suas respostas foram registradas com sucesso e são valiosas para nós.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">
      <button 
        onClick={() => navigate(`/${companySlug}/pesquisas`)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft size={16} /> Voltar para Pesquisas
      </button>

      <div className="bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-md">
        {survey.cover_image && (
           <div className="w-full h-48 md:h-64 mb-6 rounded-2xl overflow-hidden border border-zinc-800">
             <img src={survey.cover_image} alt="Capa" className="w-full h-full object-cover" />
           </div>
        )}
        <h1 className="text-3xl font-bold text-white mb-3">{survey.title}</h1>
        {survey.description && (
          <p className="text-zinc-400 text-lg leading-relaxed">{survey.description}</p>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((q, index) => (
          <QuestionRenderer 
            key={q.id} 
            question={q} 
            index={index} 
            value={answers[q.id!]} 
            onChange={(val) => handleUpdateAnswer(q.id!, val)} 
          />
        ))}
      </div>

      <div className="pt-8 flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting} 
          className="bg-[var(--c-primary)] hover:bg-[var(--c-primary-hover)] text-white gap-2 h-14 px-8 rounded-full text-lg shadow-lg font-bold w-full md:w-auto transition-transform hover:scale-105 active:scale-95"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
          Enviar Respostas
        </Button>
      </div>
    </div>
  );
};

const QuestionRenderer = ({ 
  question, 
  index, 
  value, 
  onChange 
}: { 
  question: SurveyQuestion, 
  index: number, 
  value: AnswerValue | undefined, 
  onChange: (val: AnswerValue | undefined) => void 
}) => {

  const renderInput = () => {
    switch (question.question_type) {
      case 'SHORT_TEXT':
        return (
          <Input 
            className="bg-zinc-900/50 border-zinc-700 text-white h-12 text-lg focus-visible:ring-[var(--c-primary)] rounded-xl"
            placeholder="Sua resposta..."
            value={(value as any)?.text || ''}
            onChange={e => onChange({ type: 'SHORT_TEXT', text: e.target.value })}
          />
        );
      case 'LONG_TEXT':
        return (
          <Textarea 
            className="bg-zinc-900/50 border-zinc-700 text-white text-lg focus-visible:ring-[var(--c-primary)] min-h-[120px] rounded-xl resize-none"
            placeholder="Sua resposta detalhada..."
            value={(value as any)?.text || ''}
            onChange={e => onChange({ type: 'LONG_TEXT', text: e.target.value })}
          />
        );
      case 'YES_NO':
        const cfg = question.configuration as any;
        const currentVal = (value as any)?.value;
        return (
          <div className="flex gap-4">
             <button
               onClick={() => onChange({ type: 'YES_NO', value: true })}
               className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentVal === true ? 'bg-[var(--c-primary)]/20 border-[var(--c-primary)] text-[var(--c-primary)] shadow-inner' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
             >
               {cfg.yes_label || 'Sim'}
             </button>
             <button
               onClick={() => onChange({ type: 'YES_NO', value: false })}
               className={`flex-1 py-4 rounded-xl border-2 font-bold text-lg transition-all ${currentVal === false ? 'bg-red-500/20 border-red-500 text-red-500 shadow-inner' : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
             >
               {cfg.no_label || 'Não'}
             </button>
          </div>
        );
      case 'NPS':
        const npsVal = (value as any)?.value;
        const npsCfg = question.configuration as any;
        return (
          <div>
            <div className="flex justify-between w-full gap-1 sm:gap-2 mb-3">
              {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                <button
                  key={num}
                  onClick={() => onChange({ type: 'NPS', value: num })}
                  className={`w-full aspect-square flex items-center justify-center rounded-lg font-bold text-sm sm:text-base border-2 transition-all hover:scale-105 active:scale-95 ${
                    npsVal === num 
                     ? 'bg-[var(--c-primary)]/20 border-[var(--c-primary)] text-white' 
                     : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs font-semibold text-zinc-500 px-1 uppercase tracking-wider">
               <span>{npsCfg.low_label || 'Nada provável'}</span>
               <span>{npsCfg.high_label || 'Extremamente provável'}</span>
            </div>
          </div>
        );
      case 'SINGLE_CHOICE':
         const scVal = (value as any)?.option_id;
         const scCfg = question.configuration as any;
         return (
           <div className="space-y-3">
              {(scCfg.options || []).map((opt: any) => (
                <button
                  key={opt.id}
                  onClick={() => onChange({ type: 'SINGLE_CHOICE', option_id: opt.id })}
                  className={`w-full flex items-center p-4 rounded-xl border-2 transition-all text-left ${
                    scVal === opt.id 
                     ? 'bg-[var(--c-primary)]/10 border-[var(--c-primary)] text-white font-semibold' 
                     : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${scVal === opt.id ? 'border-[var(--c-primary)]' : 'border-zinc-600'}`}>
                     {scVal === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--c-primary)]" />}
                  </div>
                  {opt.label}
                </button>
              ))}
           </div>
         );
      case 'MULTIPLE_CHOICE':
         const mcVal = (value as any)?.option_ids || [];
         const mcCfg = question.configuration as any;
         return (
           <div className="space-y-3">
              {(mcCfg.options || []).map((opt: any) => {
                const isSelected = mcVal.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => {
                       const newArr = isSelected ? mcVal.filter((id: string) => id !== opt.id) : [...mcVal, opt.id];
                       onChange({ type: 'MULTIPLE_CHOICE', option_ids: newArr });
                    }}
                    className={`w-full flex items-center p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected 
                       ? 'bg-[var(--c-primary)]/10 border-[var(--c-primary)] text-white font-semibold' 
                       : 'bg-zinc-900/50 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 mr-4 flex items-center justify-center ${isSelected ? 'border-[var(--c-primary)] bg-[var(--c-primary)]' : 'border-zinc-600'}`}>
                       {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {opt.label}
                  </button>
                );
              })}
           </div>
         );
      case 'RATING':
         const rateVal = (value as any)?.value || 0;
         const rateCfg = question.configuration as any;
         const maxStars = rateCfg.max || rateCfg.max_stars || 5;
         return (
            <div className="flex gap-2">
               {Array.from({ length: maxStars }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => onChange({ type: 'RATING', value: i + 1 })}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                       rateVal >= i + 1 ? 'text-amber-400 scale-110' : 'text-zinc-600 hover:text-amber-400/50'
                    }`}
                  >
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
               ))}
            </div>
         );
      case 'DATE':
         return (
            <Input 
              type="date"
              className="bg-zinc-900/50 border-zinc-700 text-white h-14 text-lg focus-visible:ring-[var(--c-primary)] rounded-xl uppercase max-w-[300px]"
              value={(value as any)?.date || ''}
              onChange={e => onChange({ type: 'DATE', date: e.target.value })}
            />
         );
      case 'NUMBER':
         return (
            <Input 
              type="number"
              className="bg-zinc-900/50 border-zinc-700 text-white h-14 text-lg focus-visible:ring-[var(--c-primary)] rounded-xl max-w-[200px]"
              placeholder="Digite o valor..."
              value={(value as any)?.value ?? ''}
              onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                     onChange(undefined);
                  }
                  else onChange({ type: 'NUMBER', value: Number(val) });
              }}
            />
         );
      default:
        return <div className="p-4 rounded-lg bg-red-500/10 text-red-400 text-sm">Tipo de pergunta ainda não suportado no Player: {question.question_type}</div>;
    }
  };

  return (
    <div className={`bg-zinc-900/40 p-6 md:p-8 rounded-3xl border transition-colors duration-300 ${value ? 'border-[var(--c-primary)]/30 backdrop-blur-sm' : 'border-zinc-800'}`}>
      <div className="flex gap-4">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 font-bold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-medium text-white">{question.question_text}</h3>
            {question.required && <span className="text-amber-500 text-xs font-semibold uppercase tracking-wider">* Obrigatória</span>}
          </div>
          {renderInput()}
        </div>
      </div>
    </div>
  );
};
