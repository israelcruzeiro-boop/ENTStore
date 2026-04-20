import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSurvey, useSurveyQuestions } from '../../hooks/useSurveys';
import { useCompanies, useOrgStructure, useUsers } from '../../hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Plus, Trash2, GripVertical, Settings2, Target, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { surveyService } from '../../services/surveys.service';
import { SurveyQuestionType, buildDefaultQuestionConfig, SURVEY_QUESTION_TYPE_LABELS, SurveyQuestion, SURVEY_STATUS_LABELS, SurveyStatus } from '../../types/surveys';
import { Logger } from '../../utils/logger';
import { uploadToSupabase } from '../../lib/storage';

export const SurveyBuilder = () => {
  const { companySlug, surveyId } = useParams();
  const navigate = useNavigate();
  
  const { survey, isLoading: isLoadingSurvey, mutate: mutateSurvey } = useSurvey(surveyId);
  const { questions, isLoading: isLoadingQuestions, mutate: mutateQuestions } = useSurveyQuestions(surveyId);
  
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<SurveyStatus>('DRAFT');
  const [coverImage, setCoverImage] = useState('');
  const [allowMultipleResponses, setAllowMultipleResponses] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<Partial<SurveyQuestion>[]>([]);
  
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
  const { users } = useUsers(company?.id);
  const { orgTopLevels, orgUnits } = useOrgStructure(company?.id);

  const companyUsers = useMemo(() => users.filter(u => u.status === 'ACTIVE' || !u.status), [users]);
  const companyTopLevels = useMemo(() => orgTopLevels.filter(o => o.active), [orgTopLevels]);
  const companyUnitsLocal = useMemo(() => orgUnits.filter(u => u.active), [orgUnits]);
  const unitLabel = company?.org_unit_name || 'Unidade';
  const org_levels = useMemo(() => company?.org_levels?.length ? company.org_levels : [{ id: 'legacy', name: company?.org_top_level_name || 'Regional' }], [company]);

  const [accessType, setAccessType] = useState<'ALL' | 'RESTRICTED'>('ALL');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>([]);
  const [allowedRegionIds, setAllowedRegionIds] = useState<string[]>([]);
  const [allowedStoreIds, setAllowedStoreIds] = useState<string[]>([]);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (survey) {
      setTitle(survey.title);
      setDescription(survey.description || '');
      setStatus(survey.status as SurveyStatus);
      setCoverImage(survey.cover_image || '');
      setAllowMultipleResponses(survey.allow_multiple_responses || false);
      setAccessType((survey.access_type as 'ALL' | 'RESTRICTED') || 'ALL');
      setAllowedUserIds(survey.allowed_user_ids || []);
      setAllowedRegionIds(survey.allowed_region_ids || []);
      setAllowedStoreIds(survey.allowed_store_ids || []);
      setExcludedUserIds(survey.excluded_user_ids || []);
    }
  }, [survey]);

  const usersInScope = useMemo(() => {
    if (allowedRegionIds.length === 0 && allowedStoreIds.length === 0) return [];
    return companyUsers.filter(u => {
      if (u.org_unit_id && allowedStoreIds.includes(u.org_unit_id)) return true;
      if (u.org_unit_id && allowedRegionIds.length > 0) {
        const unit = companyUnitsLocal.find(unit => unit.id === u.org_unit_id);
        let currentParent = companyTopLevels.find(t => t.id === unit?.parent_id);
        while (currentParent) {
          if (allowedRegionIds.includes(currentParent.id)) return true;
          currentParent = companyTopLevels.find(t => t.id === currentParent?.parent_id);
        }
      }
      if (u.org_top_level_id && allowedRegionIds.includes(u.org_top_level_id)) return true;
      return false;
    });
  }, [allowedRegionIds, allowedStoreIds, companyUsers, companyUnitsLocal, companyTopLevels]);

  useEffect(() => {
    if (questions) {
      setLocalQuestions(questions);
    }
  }, [questions]);

  const handleCreateQuestion = async (type: SurveyQuestionType) => {
    if (!surveyId) return;
    try {
      const config = buildDefaultQuestionConfig(type);
      const newQuestion: Partial<SurveyQuestion> = {
        survey_id: surveyId,
        question_text: `Nova pergunta (${SURVEY_QUESTION_TYPE_LABELS[type]})`,
        question_type: type,
        configuration: config as any,
        required: true,
        order_index: localQuestions.length
      };
      
      const created = await surveyService.saveSurveyQuestion(newQuestion);
      setLocalQuestions([...localQuestions, created]);
      mutateQuestions();
      toast.success("Pergunta adicionada");
    } catch (e) {
      Logger.error("Erro ao add pergunta", e);
      toast.error("Erro ao adicionar pergunta");
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!company?.id || !surveyId) return;
    setIsUploadingCover(true);
    try {
      const publicUrl = await uploadToSupabase(file, 'assets', `surveys/${company.id}/covers`, 'thumbnail');
      if (publicUrl) {
        setCoverImage(publicUrl);
        toast.success('Capa carregada com sucesso!');
      }
    } catch (error) {
      Logger.error("Erro ao enviar imagem de capa:", error);
      toast.error('Erro ao enviar imagem de capa');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleUpdateQuestionLocal = (index: number, updates: Partial<SurveyQuestion>) => {
    const newArr = [...localQuestions];
    newArr[index] = { ...newArr[index], ...updates };
    setLocalQuestions(newArr);
  };

  const handleSaveAll = async () => {
    if (!surveyId) return;
    setIsSaving(true);
    try {
      // 1. Save general string info & status
      await surveyService.updateSurvey(surveyId, { 
         title, 
         description, 
         status,
         cover_image: coverImage || null,
         allow_multiple_responses: allowMultipleResponses,
         access_type: accessType,
         allowed_user_ids: allowedUserIds,
         allowed_region_ids: allowedRegionIds,
         allowed_store_ids: allowedStoreIds,
         excluded_user_ids: excludedUserIds
      });
      
      // 2. Save all questions
      for (const q of localQuestions) {
        if (q.id) {
          await surveyService.saveSurveyQuestion(q);
        }
      }
      toast.success("Pesquisa salva com sucesso!");
      mutateSurvey();
      mutateQuestions();
    } catch (e) {
      Logger.error("Erro ao salvar tudo", e);
      toast.error("Ocorreu um erro ao salvar as alterações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (id?: string) => {
    if (!id) return;
    try {
      await surveyService.deleteSurveyQuestion(id);
      setLocalQuestions(localQuestions.filter(q => q.id !== id));
      toast.success("Pergunta excluída");
      mutateQuestions();
    } catch(e) {
      toast.error("Erro ao excluir pergunta");
    }
  };

  if (isLoadingSurvey || isLoadingQuestions) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  if (!survey) {
    return <div>Pesquisa não encontrada.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/admin/${companySlug}/surveys`)} className="px-2">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Construtor: {survey.title}</h1>
            <p className="text-sm text-slate-500">Configure a sua pesquisa ou formulário NPS.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button onClick={handleSaveAll} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2 font-semibold">
             {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
             Salvar Alterações
           </Button>
        </div>
      </div>

      {coverImage && (
        <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden relative shadow-sm border border-slate-200">
           <img src={coverImage} alt="Capa da Pesquisa" className="w-full h-full object-cover" />
           <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
           <div className="absolute bottom-6 left-6 right-6">
             <h2 className="text-white text-2xl font-bold">{title || 'Sem Título'}</h2>
           </div>
        </div>
      )}

      {/* Basic Settings */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Settings2 size={18} /> Configurações Gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título da Pesquisa</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(val: SurveyStatus) => setStatus(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">{SURVEY_STATUS_LABELS.DRAFT}</SelectItem>
                <SelectItem value="ACTIVE">{SURVEY_STATUS_LABELS.ACTIVE}</SelectItem>
                <SelectItem value="ARCHIVED">{SURVEY_STATUS_LABELS.ARCHIVED}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Link da Capa (Imagem URL)</label>
            <div className="flex gap-2">
              <Input 
                 value={coverImage} 
                 onChange={e => setCoverImage(e.target.value)} 
                 placeholder="https://... ou faça o upload ao lado" 
                 className="flex-1"
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadCover(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingCover}
                onClick={() => coverInputRef.current?.click()}
                className="shrink-0 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                {isUploadingCover ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Upload
              </Button>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="flex items-center gap-2 md:col-span-2 p-3 bg-slate-50 border border-slate-100 rounded-lg">
             <input 
               type="checkbox" 
               checked={allowMultipleResponses} 
               onChange={e => setAllowMultipleResponses(e.target.checked)} 
               className="rounded text-blue-600 w-4 h-4 cursor-pointer"
               id="allowMultipleResponses"
             />
             <label htmlFor="allowMultipleResponses" className="text-sm text-slate-700 cursor-pointer select-none">
               Permitir que a mesma pessoa responda várias vezes (Pesquisa Contínua)
             </label>
          </div>
          
          {/* Target Audience / Direcionamento */}
          <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 mt-2">
            <Label className="text-slate-900 font-bold flex items-center gap-2">
               <Target size={18} className="text-rose-500" /> Público Alvo e Acesso
            </Label>
            
            <div className="flex gap-4 p-1 bg-slate-100 rounded-lg max-w-sm">
               <button 
                  onClick={() => setAccessType('ALL')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${accessType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
               >
                  TODOS OS USUÁRIOS
               </button>
               <button 
                  onClick={() => setAccessType('RESTRICTED')}
                  className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${accessType === 'RESTRICTED' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
               >
                  ACESSO RESTRITO
               </button>
            </div>

            {accessType === 'RESTRICTED' && (
               <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <p className="text-[10px] text-slate-500 italic">Defina quais estruturas organizacionais têm acesso a esta pesquisa.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {/* Regionais / Top Levels */}
                     <div className="space-y-4">
                       {org_levels.map((lvl, index) => {
                          const groupsInThisLevel = companyTopLevels.filter(t => t.level_id === lvl.id || (!t.level_id && index === 0));
                          if (groupsInThisLevel.length === 0) return null;
                          return (
                             <div key={lvl.id} className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                                <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{lvl.name}s:</p>
                                <div className="space-y-1">
                                   {groupsInThisLevel.map(t => (
                                      <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                         <input 
                                            type="checkbox" 
                                            checked={allowedRegionIds.includes(t.id)} 
                                            onChange={() => setAllowedRegionIds(prev => prev.includes(t.id) ? prev.filter(i => i !== t.id) : [...prev, t.id])}
                                            className="accent-blue-600 rounded"
                                         />
                                         <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">{t.name}</span>
                                      </label>
                                   ))}
                                </div>
                             </div>
                          );
                       })}
                     </div>

                     <div className="space-y-4">
                       {/* Unidades / Lojas */}
                       <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{unitLabel}s:</p>
                          <div className="space-y-1">
                             {companyUnitsLocal.map(u => (
                                <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      checked={allowedStoreIds.includes(u.id)} 
                                      onChange={() => setAllowedStoreIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                      className="accent-blue-600 rounded"
                                   />
                                   <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">{u.name}</span>
                                </label>
                             ))}
                          </div>
                       </div>

                       {/* Usuários Específicos */}
                       <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Usuários Específicos:</p>
                          <div className="space-y-1">
                             {companyUsers.map(u => (
                                <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      checked={allowedUserIds.includes(u.id)} 
                                      onChange={() => setAllowedUserIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                      className="accent-blue-600 rounded"
                                   />
                                   <div className="flex flex-col">
                                      <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 leading-none">{u.name}</span>
                                      <span className="text-[9px] text-slate-400">{u.email}</span>
                                   </div>
                                </label>
                             ))}
                          </div>
                       </div>
                     </div>

                     {/* Exceções */}
                     {(allowedRegionIds.length > 0 || allowedStoreIds.length > 0) && (
                        <div className="md:col-span-2 border border-rose-100 rounded-lg p-3 max-h-40 overflow-y-auto bg-rose-50/30">
                           <p className="text-[10px] font-bold text-rose-400 mb-2 uppercase tracking-widest text-center">Exceções (Bloqueados):</p>
                           <div className="space-y-1">
                              {usersInScope.map(u => (
                                 <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                    <input 
                                       type="checkbox" 
                                       checked={excludedUserIds.includes(u.id)} 
                                       onChange={() => setExcludedUserIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                       className="accent-rose-600 rounded"
                                    />
                                    <span className="text-[11px] font-bold text-slate-600 group-hover:text-rose-600">{u.name}</span>
                                 </label>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Questions Builder */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold border-b pb-2">Perguntas ({localQuestions.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-slate-500 py-2">Adicionar:</span>
          {(Object.keys(SURVEY_QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map(type => (
            <Button key={type} variant="secondary" size="sm" onClick={() => handleCreateQuestion(type)} className="text-xs">
              <Plus size={14} className="mr-1" /> {SURVEY_QUESTION_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>

        <div className="space-y-4 mt-6">
          {localQuestions.map((q, index) => (
            <div key={q.id || index} className="bg-white border hover:border-slate-300 transition-colors rounded-xl p-0 flex shadow-sm overflow-hidden">
              <div className="bg-slate-50 w-8 flex items-center justify-center cursor-move border-r border-slate-100 text-slate-400">
                 <GripVertical size={16} />
              </div>
              <div className="p-4 flex-1 space-y-4">
                 <div className="flex justify-between items-start gap-4">
                   <div className="flex-1 space-y-1">
                      <Input 
                        value={q.question_text} 
                        onChange={e => handleUpdateQuestionLocal(index, { question_text: e.target.value })} 
                        className="font-semibold text-lg border-transparent px-0 focus-visible:ring-0 focus-visible:border-blue-500 shadow-none hover:bg-slate-50 rounded-sm"
                        placeholder="Escreva a pergunta aqui..."
                      />
                      <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{SURVEY_QUESTION_TYPE_LABELS[q.question_type as SurveyQuestionType]}</span>
                   </div>
                   <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteQuestion(q.id)}>
                      <Trash2 size={16} />
                   </Button>
                 </div>
                 
                 {/* Basic Config display - Expand this based on full schema needs in the future */}
                 <div className="flex items-center gap-4 text-sm bg-slate-50 p-2 rounded-md border border-slate-100">
                    <label className="flex items-center gap-2 text-slate-600">
                      <input type="checkbox" checked={q.required} onChange={e => handleUpdateQuestionLocal(index, { required: e.target.checked })} className="rounded text-blue-600" />
                      Resposta Obrigatória
                    </label>
                    <div className="flex-1 text-right text-xs text-slate-400 italic">
                      {'*Configuração Base (' + (q.configuration as any)?.type + ')*'}
                    </div>
                 </div>

                 {/* OPÇÕES ITERATIVAS (Para Choices) */}
                 {['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.question_type as string) && (
                    <div className="mt-3 border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
                       <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Alternativas da Pergunta</label>
                       {((q.configuration as any)?.options || []).map((opt: any, optIndex: number) => (
                          <div key={opt.id} className="flex items-center gap-2 group">
                             <div className={`w-4 h-4 flex-shrink-0 border border-slate-300 flex items-center justify-center bg-white ${q.question_type === 'SINGLE_CHOICE' ? 'rounded-full' : 'rounded-sm'}`} />
                             <Input 
                                value={opt.label}
                                onChange={e => {
                                   const newOptions = [...((q.configuration as any).options || [])];
                                   newOptions[optIndex].label = e.target.value;
                                   handleUpdateQuestionLocal(index, { configuration: { ...(q.configuration as any), options: newOptions } });
                                }}
                                className="h-8 text-sm focus-visible:ring-1 bg-white border-slate-200"
                                placeholder={`Ex: ${opt.label || 'Sua opção...'}`}
                             />
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-8 h-8 p-0 opacity-50 group-hover:opacity-100"
                               onClick={() => {
                                 const newOptions = [...((q.configuration as any).options || [])];
                                 newOptions.splice(optIndex, 1);
                                 handleUpdateQuestionLocal(index, { configuration: { ...(q.configuration as any), options: newOptions } });
                               }}
                             ><Trash2 size={14}/></Button>
                          </div>
                       ))}
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="text-blue-600 font-bold p-0 h-8 gap-1 mt-1 hover:bg-transparent hover:text-blue-800"
                         onClick={() => {
                           const newOptions = [...((q.configuration as any)?.options || [])];
                           newOptions.push({ id: crypto.randomUUID(), label: `Nova Opção ${newOptions.length + 1}` });
                           handleUpdateQuestionLocal(index, { configuration: { ...(q.configuration as any), options: newOptions } });
                         }}
                       >
                         <Plus size={14} /> Adicionar Opção
                       </Button>
                    </div>
                 )}
              </div>
            </div>
          ))}

          {localQuestions.length === 0 && (
             <div className="py-12 border-2 border-dashed rounded-xl flex items-center justify-center text-slate-500 bg-slate-50">
               Adicione acima o primeiro campo da sua pesquisa.
             </div>
          )}
        </div>

        {/* Footer Save Button */}
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
           <Button onClick={handleSaveAll} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 gap-2 font-semibold py-6 px-8 text-lg rounded-xl shadow-md">
             {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
             Salvar Todas as Alterações
           </Button>
        </div>
      </div>
    </div>
  );
};
