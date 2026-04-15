import React, { useState } from 'react';
import { Logger } from '../../utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Plus, 
  GripVertical, 
  Trash2, 
  Settings2, 
  Save, 
  Layout, 
  CheckCircle2, 
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  useChecklists, 
  useChecklistSections, 
  useChecklistQuestions, 
  checklistActions 
} from '../../hooks/useChecklists';
import { Checklist, ChecklistSection, ChecklistQuestion } from '../../types';

export const ChecklistBuilder = () => {
  const { checklistId, companySlug } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  
  // Data Fetching
  const { checklists } = useChecklists(company?.id);
  const checklist = checklists.find(c => c.id === checklistId);
  const { sections, mutate: mutateSections } = useChecklistSections(checklistId);
  const { questions, mutate: mutateQuestions } = useChecklistQuestions(checklistId);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'settings'>('content');

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<Record<string, unknown> | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);

  const handleAddSection = async () => {
    try {
      await checklistActions.createSection(
        checklistId!, 
        'Nova Fase / Sub-tema', 
        sections.length
      );
      mutateSections();
      toast.success('Fase adicionada!');
    } catch (err) {
      toast.error('Erro ao adicionar fase');
    }
  };

  const handleAddQuestion = async (sectionId?: string) => {
    try {
      await checklistActions.createQuestion({
        checklist_id: checklistId!,
        section_id: sectionId,
        text: 'Nova Pergunta de Verificação',
        type: 'COMPLIANCE',
        order_index: questions.filter(q => q.section_id === sectionId).length
      });
      mutateQuestions();
      toast.success('Pergunta adicionada!');
    } catch (err) {
      toast.error('Erro ao adicionar pergunta');
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Excluir esta fase e todas as perguntas dentro dela?')) return;
    try {
      await checklistActions.deleteSection(id);
      mutateSections();
      mutateQuestions();
      toast.success('Fase removida');
    } catch (err) {
      toast.error('Erro ao excluir fase');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await checklistActions.deleteQuestion(id);
      mutateQuestions();
      toast.success('Pergunta removida');
    } catch (err) {
      toast.error('Erro ao excluir pergunta');
    }
  };

  const updateQuestionText = async (id: string, text: string) => {
    try {
      await checklistActions.updateQuestion(id, { text });
      mutateQuestions();
    } catch (err) {
       Logger.error("Erro ao atualizar texto", err);
    }
  };

  const updateQuestionType = async (id: string, type: string) => {
    try {
      await checklistActions.updateQuestion(id, { type });
      mutateQuestions();
      toast.success('Tipo atualizado');
    } catch (err) {
       Logger.error("Erro ao atualizar tipo", err);
    }
  };

  const updateSectionTitle = async (id: string, title: string) => {
    try {
      await checklistActions.updateSection(id, { title });
      mutateSections();
    } catch (err) {
       Logger.error("Erro ao atualizar seção", err);
    }
  };

  // Drag and Drop Handlers (Native HTML5)
  const onDragStart = (e: React.DragEvent, item: Record<string, unknown>, type: 'section' | 'question') => {
    setDraggedItem({ ...item, dragType: type });
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, sectionId?: string, questionId?: string) => {
    e.preventDefault();
    setDragOverItem(sectionId || null);
  };

  const onDrop = async (e: React.DragEvent, targetSectionId?: string, targetQuestionId?: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.dragType === 'question') {
      const draggedId = draggedItem.id as string;
      const otherQuestions = questions.filter(q => q.id !== draggedId);
      const draggedQuestion = questions.find(q => q.id === draggedId);
      
      if (!draggedQuestion) return;

      let updatedList: ChecklistQuestion[] = [];

      if (targetQuestionId) {
        const targetIdx = otherQuestions.findIndex(q => q.id === targetQuestionId);
        updatedList = [
          ...otherQuestions.slice(0, targetIdx),
          { ...draggedQuestion, section_id: targetSectionId || null },
          ...otherQuestions.slice(targetIdx)
        ];
      } else {
        // Move para o final da seção alvo
        const sectionQuestions = otherQuestions.filter(q => q.section_id === targetSectionId);
        const nonSectionQuestions = otherQuestions.filter(q => q.section_id !== targetSectionId);
        updatedList = [
          ...nonSectionQuestions,
          ...sectionQuestions,
          { ...draggedQuestion, section_id: targetSectionId || null }
        ];
      }

      // Persiste a nova ordem (indices 0, 1, 2...)
      try {
        const reorderPayload = updatedList.map((q, idx) => ({
          id: q.id,
          order_index: idx,
          section_id: q.section_id
        }));

        await checklistActions.reorderQuestions(reorderPayload);
        mutateQuestions();
        toast.success('Movido com sucesso');
      } catch (err) {
        toast.error('Erro ao salvar nova ordem');
      }
    }
    
    setDraggedItem(null);
    setDragOverItem(null);
  };

  if (!checklist) return <div className="p-8 text-slate-500">Carregando checklist...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Magistral */}
      <header className="bg-slate-900 text-white p-6 sticky top-0 z-50 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/admin/${companySlug}/checklists`)}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ChevronLeft size={24} />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight">{checklist.title}</h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                checklist.status === 'ACTIVE' ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {checklist.status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Editor Magistral • {questions.length} perguntas em {sections.length} fases</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              toast.success('Estrutura do Builder salva com sucesso!');
              navigate(`/admin/${companySlug}/checklists`);
            }}
            className="bg-blue-600 hover:bg-blue-700 font-bold px-6 shadow-lg shadow-blue-500/20 text-white border-none"
          >
            <Save size={18} className="mr-2" /> Finalizar Editor
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-8 space-y-8">
        
        {/* Empty State */}
        {sections.length === 0 && questions.filter(q => !q.section_id).length === 0 && (
          <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
             <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-6">
                <Layout size={40} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900 mb-2">Editor Vazio</h2>
             <p className="text-slate-500 max-w-sm mb-8">Adicione uma fase para começar a organizar suas perguntas de conformidade.</p>
             <div className="flex gap-4">
                <Button onClick={handleAddSection} className="bg-slate-900 hover:bg-slate-800">
                  <Plus size={18} className="mr-2" /> Adicionar Fase
                </Button>
                <Button variant="outline" onClick={() => handleAddQuestion()}>
                  <Plus size={18} className="mr-2" /> Pergunta Solta
                </Button>
             </div>
          </div>
        )}

        {/* Perguntas Sem Seção */}
        {questions.filter(q => !q.section_id).length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-4">Itens Gerais</h3>
            <div className="space-y-3">
              {questions.filter(q => !q.section_id).map(q => (
                <QuestionItem 
                  key={q.id} 
                  question={q} 
                  onDelete={handleDeleteQuestion}
                  onUpdateText={updateQuestionText}
                  onUpdateType={updateQuestionType}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                />
              ))}
            </div>
          </div>
        )}

        {/* Fases / Seções */}
        <div className="space-y-12 pb-20">
          {sections.map((section) => (
            <div 
              key={section.id} 
              className={`space-y-6 transition-all ${dragOverItem === section.id ? 'bg-blue-50/50 rounded-3xl p-4 ring-2 ring-blue-500 ring-dashed' : ''}`}
              onDragOver={(e) => onDragOver(e, section.id)}
              onDrop={(e) => onDrop(e, section.id)}
            >
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">
                    {section.order_index + 1}
                  </div>
                  <Input 
                    value={section.title} 
                    onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                    className="text-xl font-black bg-transparent border-none focus:ring-0 p-0 text-slate-900 max-w-md"
                  />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteSection(section.id)} className="text-slate-400 hover:text-red-600">
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>

              <div className="grid gap-3">
                {questions.filter(q => q.section_id === section.id).map(q => (
                  <QuestionItem 
                    key={q.id} 
                    question={q} 
                    onDelete={handleDeleteQuestion}
                    onUpdateText={updateQuestionText}
                    onUpdateType={updateQuestionType}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                  />
                ))}
                
                <Button 
                  variant="ghost" 
                  onClick={() => handleAddQuestion(section.id)}
                  className="w-full h-16 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all font-bold"
                >
                  <Plus size={20} className="mr-2" /> Adicionar Pergunta nesta Fase
                </Button>
              </div>
            </div>
          ))}

          {sections.length > 0 && (
            <Button 
              onClick={handleAddSection} 
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold h-14 rounded-2xl"
            >
              <Plus size={18} className="mr-2" /> Criar Nova Fase / Sub-tema
            </Button>
          )}

          {sections.length > 0 && (
            <div className="pt-8 mt-8 border-t border-slate-200 flex justify-end">
              <Button 
                onClick={() => {
                  toast.success('Estrutura do Builder salva com sucesso!');
                  navigate(`/admin/${companySlug}/checklists`);
                }}
                className="bg-blue-600 hover:bg-blue-700 font-bold px-12 shadow-lg shadow-blue-500/20 text-white border-none h-14 rounded-2xl w-full md:w-auto text-lg"
              >
                <Save size={20} className="mr-2" /> Finalizar Editor
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Componente Interno para o Item da Pergunta
const QuestionItem = ({ question, onDelete, onUpdateText, onUpdateType, onDragStart, onDragOver, onDrop }: {
  question: ChecklistQuestion;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onUpdateType: (id: string, value: string) => void;
  onDragStart: (e: React.DragEvent, item: Record<string, unknown>, type: 'section' | 'question') => void;
  onDragOver: (e: React.DragEvent, sectionId?: string, questionId?: string) => void;
  onDrop: (e: React.DragEvent, targetSectionId?: string, targetQuestionId?: string) => void;
}) => {
  const [isDraggable, setIsDraggable] = React.useState(false);

  return (
    <div 
      draggable={isDraggable}
      onDragStart={(e) => onDragStart(e, question, 'question')}
      onDragEnd={() => setIsDraggable(false)}
      onDragOver={(e) => onDragOver(e, question.section_id || undefined, question.id)}
      onDrop={(e) => onDrop(e, question.section_id || undefined, question.id)}
      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group cursor-default hover:border-blue-500 transition-all"
    >
      <div 
        onMouseDown={() => setIsDraggable(true)}
        onMouseUp={() => setIsDraggable(false)}
        className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-blue-400 transition-colors p-1 rounded hover:bg-slate-100"
      >
        <GripVertical size={20} />
      </div>

      <div className="flex-1 space-y-1" onMouseDown={() => setIsDraggable(false)}>
        <Input 
          value={question.text} 
          onChange={(e) => onUpdateText(question.id, e.target.value)}
          className="bg-transparent border-none focus:ring-0 p-0 font-bold text-slate-700 h-auto"
        />
        <div className="flex items-center gap-3">
           <select 
             value={question.type} 
             onChange={(e) => onUpdateType(question.id, e.target.value)}
             className="text-[10px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded outline-none border-none cursor-pointer"
           >
              <option value="COMPLIANCE">Conformidade</option>
              <option value="RATING">Pontuação (0-10)</option>
              <option value="TEXT">Texto</option>
              <option value="NUMBER">Número</option>
              <option value="DATE">Data</option>
              <option value="TIME">Horário</option>
              <option value="CHECK">Check</option>
           </select>
           {question.required && <span className="text-[10px] font-bold text-red-400 uppercase">* Obrigatória</span>}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600" onClick={() => onDelete(question.id)}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
};
