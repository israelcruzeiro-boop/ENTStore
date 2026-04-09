import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useChecklistQuestions, 
  useChecklistAnswers, 
  useChecklistSubmission, 
  useChecklistSections,
  checklistActions 
} from '../../hooks/useChecklists';
import { useUsers } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { 
  ChevronLeft, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Hash, 
  Loader2,
  Save,
  Check,
  Camera,
  User as UserIcon,
  X
} from 'lucide-react';
import { 
  ChecklistQuestion, 
  ChecklistAnswer,
  User
} from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { debounce } from 'lodash';

// Interfaces Internas de Tipagem Estrita
interface LocalAnswer {
  value: string;
  note: string;
  action_plan: string;
  assigned_user_id: string;
  photo_urls: string[];
}

interface QuestionRenderProps {
  q: ChecklistQuestion;
  localAnswers: Record<string, LocalAnswer>;
  handleAnswerChange: (id: string, value: string) => void;
  handleNoteChange: (id: string, note: string) => void;
  handleActionPlanChange: (id: string, plan: string) => void;
  handleAssignmentChange: (id: string, userId: string) => void;
  handlePhotoUpload: (id: string, url: string) => void;
  handlePhotoDelete: (id: string, url: string) => void;
  users: User[];
  currentUserId: string;
}

// Utilitário de compressão de imagem
const compressImage = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Falha na compressão'));
        }, 'image/jpeg', 0.7);
      };
    };
    reader.onerror = (error) => reject(error);
  });
};

const QuestionRender = ({ 
  q, 
  localAnswers, 
  handleAnswerChange, 
  handleNoteChange, 
  handleActionPlanChange,
  handleAssignmentChange,
  handlePhotoUpload,
  handlePhotoDelete,
  users,
  currentUserId
}: QuestionRenderProps) => {
  const answer = localAnswers[q.id] || { value: '', note: '', action_plan: '', assigned_user_id: '', photo_urls: [] };
  const isSelected = (val: string) => answer.value === val;
  const hasNotes = ['COMPLIANCE', 'NUMBER', 'RATING'].includes(q.type);
  const canShowPhotos = false; // Temporariamente ocultado a pedido: !['TIME', 'DATE', 'NUMBER', 'CHECK'].includes(q.type);
  const [isUploading, setIsUploading] = useState(false);

  const onFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if ((answer.photo_urls?.length || 0) >= 3) {
      return toast.error('Limite de 3 fotos atingido.');
    }

    setIsUploading(true);
    try {
      const compressed = await compressImage(files[0]);
      const fileExt = files[0].name.split('.').pop();
      const fileName = `checklist/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('checklist-photos')
        .upload(fileName, compressed, { contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('checklist-photos')
        .getPublicUrl(fileName);

      handlePhotoUpload(q.id, publicUrl);
    } catch (err) {
      toast.error('Erro ao subir foto.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`p-4 transition-all duration-300 ${isSelected('CHECKED') || isSelected('C') || isSelected('NA') || (answer.value && q.type !== 'CHECK' && q.type !== 'COMPLIANCE') ? 'bg-white/5' : 'bg-transparent'}`}>
      <div className={`flex ${q.type === 'CHECK' ? 'flex-row items-center gap-4' : 'flex-col gap-4'}`}>
        
        {q.type === 'CHECK' && (
          <button
            onClick={() => handleAnswerChange(q.id, isSelected('CHECKED') ? '' : 'CHECKED')}
            className={`relative flex-shrink-0 w-8 h-8 rounded-lg border-2 transition-all duration-300 flex items-center justify-center ${
              isSelected('CHECKED')
                ? 'border-[var(--c-primary)] bg-[var(--c-primary)]/10 shadow-[0_0_15px_var(--c-primary)]'
                : 'border-red-500 bg-transparent'
            }`}
          >
            <div className={`absolute -right-3 -top-3 w-10 h-10 flex items-center justify-center transition-all duration-300 ${isSelected('CHECKED') ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
               <Check size={36} strokeWidth={4} className="text-[var(--c-primary)] drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" />
            </div>
          </button>
        )}

        <div className={q.type === 'CHECK' ? 'flex-1' : ''}>
          <h3 className={`text-sm md:text-base font-black leading-tight transition-colors ${isSelected('CHECKED') ? 'text-zinc-500 line-through' : 'text-white'}`}>
            {q.text} {q.required && <span className="text-red-500">*</span>}
          </h3>
          {q.description && <p className="text-xs font-semibold text-zinc-500 mt-1">{q.description}</p>}
        </div>

        {q.type !== 'CHECK' && (
          <div className="flex flex-wrap items-center gap-3">
          {q.type === 'COMPLIANCE' && (
            <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
              {[
                { id: 'C', label: 'Sim', color: 'bg-emerald-500' },
                { id: 'NA', label: 'N/A', color: 'bg-slate-400' },
                { id: 'NC', label: 'Não', color: 'bg-rose-500' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleAnswerChange(q.id, opt.id)}
                  className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                    isSelected(opt.id) ? `${opt.color} text-white shadow-sm` : 'text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {q.type === 'RATING' && (
            <Slider 
              min={0} max={10} step={1} 
              value={[parseInt(answer.value) || 0]} 
              onValueChange={(vals) => handleAnswerChange(q.id, vals[0].toString())} 
              className="flex-1 max-w-sm py-2" 
            />
          )}

          {q.type === 'TEXT' && (
            <Input 
              placeholder="Descreva..."
              className="bg-white/5 border-white/10 text-white h-10 w-full md:w-80 text-xs placeholder:text-zinc-600 focus:border-[var(--c-primary)] focus:ring-[var(--c-primary)]"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'NUMBER' && (
            <Input 
              type="number"
              className="bg-white/5 border-white/10 text-white h-10 w-24 text-center text-xs placeholder:text-zinc-600 focus:border-[var(--c-primary)] focus:ring-[var(--c-primary)]"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {(q.type === 'DATE' || q.type === 'TIME') && (
            <Input 
              type={q.type === 'DATE' ? 'date' : 'time'}
              className="bg-white/5 border-white/10 text-white h-10 w-full md:w-44 text-xs focus:border-[var(--c-primary)] focus:ring-[var(--c-primary)] [&::-webkit-calendar-picker-indicator]:invert"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {canShowPhotos && (
            <div className="ml-auto">
              <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" id={`upload-${q.id}`} disabled={isUploading} />
              <label htmlFor={`upload-${q.id}`} className="bg-white/5 border border-white/10 text-white text-[9px] font-bold p-2 rounded-lg cursor-pointer flex items-center gap-2 hover:bg-white/10 transition-colors">
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={14} />}
                {answer.photo_urls.length > 0 ? `${answer.photo_urls.length}/3` : 'Fotos'}
              </label>
            </div>
          )}
        </div>
        )}

        {answer.photo_urls.length > 0 && (
          <div className="flex gap-2">
            {answer.photo_urls.map((url, i) => (
              <div key={i} className="relative w-12 h-12 rounded border overflow-hidden group">
                <img src={url} className="w-full h-full object-cover" alt="" />
                <button onClick={() => handlePhotoDelete(q.id, url)} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 opacity-0 group-hover:opacity-100">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {hasNotes && (
          <div className={`space-y-3 mt-2 ${q.type === 'CHECK' ? 'ml-12' : ''}`}>
            <Input 
              placeholder="Observações..."
              className="bg-white/5 border-white/10 text-white placeholder-zinc-500 h-9 text-[10px] focus:border-[var(--c-primary)] focus:ring-[var(--c-primary)]"
              value={answer.note || ''}
              onChange={(e) => handleNoteChange(q.id, e.target.value)}
            />
            {q.type === 'COMPLIANCE' && isSelected('NC') && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg space-y-2">
                <label className="text-[8px] font-black text-rose-500 uppercase tracking-widest">🚨 Plano de Ação</label>
                <Textarea 
                  placeholder="O que será feito?"
                  className="bg-white text-[10px] h-16"
                  value={answer.action_plan || ''}
                  onChange={(e) => handleActionPlanChange(q.id, e.target.value)}
                />
                <Select value={answer.assigned_user_id || ''} onValueChange={(val) => handleAssignmentChange(q.id, val)}>
                  <SelectTrigger className="bg-white h-8 text-[9px]">
                    <SelectValue placeholder="Responsável..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChecklistPlayer = () => {
  const { submissionId, companySlug } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { submission, isLoading: subLoading } = useChecklistSubmission(submissionId);
  const { sections, isLoading: sLoading } = useChecklistSections(submission?.checklist_id);
  const { questions, isLoading: qLoading } = useChecklistQuestions(submission?.checklist_id);
  const { answers } = useChecklistAnswers(submissionId);
  const { users } = useUsers(submission?.company_id);

  const [localAnswers, setLocalAnswers] = useState<Record<string, LocalAnswer>>({});
  const [isFinishing, setIsFinishing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    if (answers && answers.length > 0) {
      const acc: Record<string, LocalAnswer> = {};
      answers.forEach(a => {
        acc[a.question_id] = {
          value: a.value || '',
          note: a.note || '',
          action_plan: a.action_plan || '',
          assigned_user_id: a.assigned_user_id || '',
          photo_urls: a.photo_urls || []
        };
      });
      setLocalAnswers(acc);
    }
  }, [answers]);

  const debouncedSave = useCallback(
    debounce(async (qId: string, data: LocalAnswer) => {
      if (!submissionId) return;
      try {
        await checklistActions.saveAnswer(submissionId, qId, data.value, data.note, data.action_plan, data.assigned_user_id, data.photo_urls);
        setLastSaved(new Date());
      } catch (err) {
        console.error('Erro ao salvar:', err);
      }
    }, 1000),
    [submissionId]
  );

  const updateStateAndSave = (questionId: string, updates: Partial<LocalAnswer>) => {
    setLocalAnswers(prev => {
      const newState = {
        ...prev,
        [questionId]: { ...(prev[questionId] || { value: '', note: '', action_plan: '', assigned_user_id: '', photo_urls: [] }), ...updates }
      };
      debouncedSave(questionId, newState[questionId]);
      return newState;
    });
  };

  const handleFinish = async () => {
    if (!submissionId) return;
    setIsFinishing(true);
    try {
      await checklistActions.completeSubmission(submissionId);
      toast.success('Finalizado!');
      navigate(`/${companySlug}/checklists`);
    } catch (err) {
      toast.error('Erro ao finalizar');
      setIsFinishing(false);
    }
  };

  if (subLoading || qLoading || sLoading) return <div className="flex items-center justify-center h-screen bg-[#0a0a0a]"><Loader2 className="animate-spin text-[var(--c-primary)]" /></div>;

  const totalPages = sections.length + (questions.filter(q => !q.section_id).length > 0 ? 1 : 0);
  const hasGeral = questions.filter(q => !q.section_id).length > 0;
  const activeQuestions = hasGeral && currentPage === 0 
    ? questions.filter(q => !q.section_id)
    : questions.filter(q => q.section_id === sections[hasGeral ? currentPage - 1 : currentPage]?.id);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 min-h-screen bg-[#0a0a0a] pt-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/${companySlug}/checklists`)} className="text-zinc-500 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
          <ChevronLeft size={14} className="mr-1" /> Sair
        </Button>
        {lastSaved && <span className="text-[8px] text-[var(--c-primary)] border border-[var(--c-primary)]/20 font-black bg-[var(--c-primary)]/10 px-3 py-1 rounded-full uppercase tracking-widest">SALVO</span>}
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--c-primary)]/10 border border-[var(--c-primary)]/20 rounded-xl flex items-center justify-center text-[var(--c-primary)]">
             <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Etapa Atual</span>
            <h1 className="text-xl font-black text-white">{hasGeral && currentPage === 0 ? 'Geral' : sections[hasGeral ? currentPage - 1 : currentPage]?.title}</h1>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-white">{currentPage + 1}<span className="text-zinc-600 text-lg">/{totalPages}</span></span>
        </div>
      </div>

      <div className="bg-[#141414] border border-white/5 rounded-3xl shadow-2xl overflow-hidden mb-6 divide-y divide-white/5">
        {activeQuestions.map(q => (
          <QuestionRender 
            key={q.id} q={q} localAnswers={localAnswers} currentUserId={currentUser?.id || ''} users={users}
            handleAnswerChange={(id, value) => updateStateAndSave(id, { value })}
            handleNoteChange={(id, note) => updateStateAndSave(id, { note })}
            handleActionPlanChange={(id, action_plan) => updateStateAndSave(id, { action_plan })}
            handleAssignmentChange={(id, assigned_user_id) => updateStateAndSave(id, { assigned_user_id })}
            handlePhotoUpload={(id, url) => {
              const photos = localAnswers[id]?.photo_urls || [];
              updateStateAndSave(id, { photo_urls: [...photos, url] });
            }}
            handlePhotoDelete={(id, url) => {
              const photos = localAnswers[id]?.photo_urls || [];
              updateStateAndSave(id, { photo_urls: photos.filter(p => p !== url) });
            }}
          />
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <Button variant="ghost" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="flex-1 bg-white/5 border border-white/5 text-white hover:bg-white/10 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Anterior</Button>
        {currentPage < totalPages - 1 ? (
          <Button onClick={() => setCurrentPage(p => p + 1)} className="flex-1 bg-white/10 text-white hover:bg-white/20 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all">Próxima Etapa</Button>
        ) : (
          <Button onClick={handleFinish} disabled={isFinishing} className="flex-1 bg-[var(--c-primary)] text-white hover:opacity-90 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg hover:-translate-y-0.5">
            {isFinishing ? <Loader2 className="animate-spin" /> : 'Finalizar Checklist'}
          </Button>
        )}
      </div>
    </div>
  );
};
