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
    <div className={`p-4 transition-all duration-300 ${isSelected('CHECKED') || isSelected('C') || isSelected('NA') || (answer.value && q.type !== 'CHECK' && q.type !== 'COMPLIANCE') ? 'bg-blue-50/30' : 'bg-transparent'}`}>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm md:text-base font-black text-slate-900 leading-tight">
            {q.text} {q.required && <span className="text-red-500">*</span>}
          </h3>
          {q.description && <p className="text-xs font-semibold text-slate-500 mt-1">{q.description}</p>}
        </div>

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
              className="bg-slate-50 h-9 w-full md:w-80 text-xs"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'NUMBER' && (
            <Input 
              type="number"
              className="bg-slate-50 h-9 w-24 text-center text-xs"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {(q.type === 'DATE' || q.type === 'TIME') && (
            <Input 
              type={q.type === 'DATE' ? 'date' : 'time'}
              className="bg-slate-50 h-9 w-full md:w-44 text-xs"
              value={answer.value || ''}
              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
            />
          )}

          {q.type === 'CHECK' && (
            <button
              onClick={() => handleAnswerChange(q.id, isSelected('CHECKED') ? '' : 'CHECKED')}
              className={`w-full md:w-auto min-w-[200px] h-14 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 border-2 font-black uppercase tracking-widest ${
                isSelected('CHECKED') 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-[1.02]' 
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected('CHECKED') ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
                <Check size={20} strokeWidth={isSelected('CHECKED') ? 4 : 3} />
              </div>
              {isSelected('CHECKED') ? 'Concluído' : 'Marcar como Feito'}
            </button>
          )}

          {canShowPhotos && (
            <div className="ml-auto">
              <input type="file" accept="image/*" onChange={onFileSelect} className="hidden" id={`upload-${q.id}`} disabled={isUploading} />
              <label htmlFor={`upload-${q.id}`} className="bg-white border border-slate-200 text-[9px] font-bold p-2 rounded-lg cursor-pointer flex items-center gap-2">
                {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={14} />}
                {answer.photo_urls.length > 0 ? `${answer.photo_urls.length}/3` : 'Fotos'}
              </label>
            </div>
          )}
        </div>

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
          <div className="space-y-3 mt-2">
            <Input 
              placeholder="Observações..."
              className="bg-slate-50 h-9 text-[10px]"
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

  if (subLoading || qLoading || sLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin text-blue-600" /></div>;

  const totalPages = sections.length + (questions.filter(q => !q.section_id).length > 0 ? 1 : 0);
  const hasGeral = questions.filter(q => !q.section_id).length > 0;
  const activeQuestions = hasGeral && currentPage === 0 
    ? questions.filter(q => !q.section_id)
    : questions.filter(q => q.section_id === sections[hasGeral ? currentPage - 1 : currentPage]?.id);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 min-h-screen bg-slate-50/50 pt-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(`/${companySlug}/checklists`)} className="text-slate-400 text-[10px]">
          <ChevronLeft size={14} /> Sair
        </Button>
        {lastSaved && <span className="text-[8px] text-emerald-600 font-bold bg-emerald-50 px-2 rounded-full">SALVO</span>}
      </div>

      <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><CheckCircle2 /></div>
          <h1 className="text-lg font-black">{hasGeral && currentPage === 0 ? 'Geral' : sections[hasGeral ? currentPage - 1 : currentPage]?.title}</h1>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-bold">Etapa</span>
          <span className="text-xl font-black">{currentPage + 1}/{totalPages}</span>
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden mb-6 divide-y divide-slate-100">
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

      <div className="flex gap-2">
        <Button variant="ghost" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="flex-1 border h-11 rounded-xl font-bold bg-white uppercase text-[10px]">Anterior</Button>
        {currentPage < totalPages - 1 ? (
          <Button onClick={() => setCurrentPage(p => p + 1)} className="flex-1 bg-slate-900 text-white h-11 rounded-xl font-bold uppercase text-[10px]">Próxima</Button>
        ) : (
          <Button onClick={handleFinish} disabled={isFinishing} className="flex-1 bg-blue-600 text-white h-11 rounded-xl font-bold uppercase text-[10px]">
            {isFinishing ? <Loader2 className="animate-spin" /> : 'Finalizar'}
          </Button>
        )}
      </div>
    </div>
  );
};
