import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useCourseModules, 
  useCourseContents, 
  useCourses,
  useQuiz,
  useQuizQuestions
} from '../../hooks/useSupabaseData';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Play, 
  FileText, 
  CheckCircle2, 
  Circle,
  BrainCircuit,
  Loader2,
  Lock,
  ArrowLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Viewer } from '../../components/user/Viewer';
import { QuizPlayer } from '../../components/user/QuizPlayer';
import { useAuth } from '../../contexts/AuthContext';

export const UserCoursePlayer = () => {
  const { companySlug, courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { courses } = useCourses();
  const course = courses.find(c => c.id === courseId);
  
  const { modules, isLoading: modulesLoading } = useCourseModules(courseId);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);

  // Busca conteúdos do módulo ativo
  const { contents: activeModuleContents } = useCourseContents(activeModuleId || undefined);
  
  // Encontra o conteúdo atual
  const currentContent = activeModuleContents?.find(c => c.id === activeContentId);

  // Quiz do conteúdo atual
  const { quiz, isLoading: isQuizLoading } = useQuiz({ courseContentId: activeContentId || undefined });
  const { questions } = useQuizQuestions(quiz?.id);

  useEffect(() => {
    if (modules.length > 0 && !activeModuleId) {
      setActiveModuleId(modules[0].id);
    }
  }, [modules, activeModuleId]);

  useEffect(() => {
    if (activeModuleContents.length > 0 && !activeContentId) {
      setActiveContentId(activeModuleContents[0].id);
    }
  }, [activeModuleContents, activeContentId]);

  if (modulesLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  const handleNext = () => {
    const currentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);
    if (currentIndex < activeModuleContents.length - 1) {
      setActiveContentId(activeModuleContents[currentIndex + 1].id);
      setShowQuiz(false);
    } else {
      // Vai para o próximo módulo
      const currentModuleIndex = modules.findIndex(m => m.id === activeModuleId);
      if (currentModuleIndex < modules.length - 1) {
        setActiveModuleId(modules[currentModuleIndex + 1].id);
        setActiveContentId(null); // Vai pegar o primeiro do novo módulo via useEffect
        setShowQuiz(false);
      }
    }
  };

  const handlePrevious = () => {
    const currentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);
    if (currentIndex > 0) {
      setActiveContentId(activeModuleContents[currentIndex - 1].id);
      setShowQuiz(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-100 relative">
      {/* SIDEBAR - Mobile: Absolute Drawer | Desktop: Fixed Sidebar */}
      <div 
        className={`
          ${showSidebar ? 'translate-x-0' : '-translate-x-full'} 
          fixed md:relative z-40 md:z-0
          w-72 md:w-80 h-full flex flex-col border-r border-slate-800 bg-slate-900 
          transition-transform duration-300 ease-in-out overflow-hidden shrink-0
          shadow-2xl md:shadow-none
        `}
      >
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex flex-col gap-1 overflow-hidden">
             <button onClick={() => navigate(`/${companySlug}/home`)} className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px] md:text-xs mb-1 md:mb-2 transition-colors">
               <ArrowLeft size={12} /> Voltar ao Hub
             </button>
             <h2 className="font-bold text-base md:text-lg truncate">{course?.title || 'Curso'}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(false)} className="md:hidden text-slate-400">
            <X size={20} />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 space-y-4 md:space-y-6">
          {modules.map((module, mIdx) => (
            <div key={module.id} className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2">
                <span className="bg-slate-800 w-5 h-5 rounded-full flex items-center justify-center text-slate-400">{mIdx + 1}</span>
                {module.title}
              </h3>
              <div className="space-y-1">
                <ModuleContentList 
                   moduleId={module.id} 
                   activeContentId={activeContentId}
                   onSelect={(id) => {
                     setActiveModuleId(module.id);
                     setActiveContentId(id);
                     setShowQuiz(false);
                     if (window.innerWidth < 768) setShowSidebar(false);
                   }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* OVERLAY for Mobile Sidebar */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300" 
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative bg-slate-950 w-full overflow-hidden">
        <header className="h-14 md:h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-900/50 backdrop-blur-xl z-20">
          <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} className="text-slate-400 hover:text-white shrink-0">
              <Menu size={20} />
            </Button>
            <div className="overflow-hidden">
               <p className="text-[9px] md:text-xs text-slate-500 font-bold uppercase tracking-wider truncate">{course?.title}</p>
               <h1 className="text-xs md:text-sm font-bold text-white max-w-[150px] md:max-w-md truncate">{currentContent?.title || 'Carregando...'}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
             <div className="hidden sm:flex flex-col items-end gap-1 mr-2 md:mr-4">
                <span className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase">Progresso</span>
                <div className="flex items-center gap-2 md:gap-3">
                   <Progress 
                     value={
                       modules.length > 0 
                        ? Math.round(((modules.findIndex(m => m.id === activeModuleId) + 1) / modules.length) * 100) 
                        : 0
                     } 
                     className="w-16 md:w-24 h-1 md:h-1.5 bg-slate-800" 
                   />
                   <span className="text-[10px] md:text-xs font-black text-blue-400">
                     {modules.length > 0 
                        ? Math.round(((modules.findIndex(m => m.id === activeModuleId) + 1) / modules.length) * 100) 
                        : 0}%
                   </span>
                </div>
             </div>
             <Button 
               onClick={handleNext}
               variant="outline" 
               size="sm" 
               className="h-8 md:h-10 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white gap-1 md:gap-2 transition-all text-[10px] md:text-sm px-2 md:px-4"
             >
                <span className="hidden xs:inline">Próxima</span> <ChevronRight size={16} />
             </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-5xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            {showQuiz && quiz && questions.length > 0 ? (
              <QuizPlayer 
                quiz={quiz} 
                questions={questions} 
                userId={user?.id || ''} 
                companyId={course?.company_id || ''}
                onBack={() => setShowQuiz(false)}
              />
            ) : currentContent ? (
              <div className="space-y-6">
                <div className="rounded-3xl overflow-hidden shadow-2xl shadow-blue-500/5 border border-slate-800/50">
                   <Viewer content={currentContent} />
                </div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 bg-slate-900/40 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-slate-800/50">
                   <div className="space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10 shrink-0 uppercase text-[9px]">{currentContent.type}</Badge>
                        <h2 className="text-lg md:text-2xl font-bold text-white truncate">{currentContent.title}</h2>
                      </div>
                      <p className="text-xs md:text-slate-400 leading-relaxed max-w-2xl line-clamp-3 md:line-clamp-none">{currentContent.description || 'Nenhuma descrição disponível para esta aula.'}</p>
                   </div>
                   
                   {currentContent.has_quiz && (
                      <Button 
                        onClick={() => setShowQuiz(true)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold h-12 md:h-14 px-6 md:px-8 rounded-xl md:rounded-2xl shadow-lg shadow-blue-500/20 gap-3 group shrink-0 w-full lg:w-auto"
                      >
                         <BrainCircuit className="group-hover:rotate-12 transition-transform" />
                         Testar Conhecimento
                      </Button>
                   )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                 <Loader2 className="animate-spin mb-4" size={32} />
                 <p>Preparando aula...</p>
              </div>
            )}
            
            {/* Navegação entre aulas no fundo */}
            <div className="flex items-center justify-between pt-6 md:pt-8 border-t border-slate-800 pb-10">
               <Button onClick={handlePrevious} variant="ghost" className="text-slate-400 hover:text-white gap-1 md:gap-2 text-xs md:text-sm">
                  <ChevronLeft size={20} /> <span className="hidden sm:inline">Aula Anterior</span>
               </Button>
               <Button onClick={handleNext} variant="ghost" className="text-slate-400 hover:text-white gap-1 md:gap-2 text-xs md:text-sm">
                  <span className="hidden sm:inline">Próxima Aula</span> <ChevronRight size={20} />
               </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

const ModuleContentList = ({ moduleId, activeContentId, onSelect }: { moduleId: string, activeContentId: string | null, onSelect: (id: string) => void }) => {
  const { contents } = useCourseContents(moduleId);
  
  const getIcon = (type: string, active: boolean) => {
     if (active) return <Play size={14} className="text-blue-400" fill="currentColor" />;
     switch(type) {
        case 'VIDEO': return <Play size={14} />;
        case 'IMAGE': return <FileText size={14} />;
        default: return <FileText size={14} />;
     }
  };

  return (
    <>
      {contents.map(content => (
        <button
          key={content.id}
          onClick={() => onSelect(content.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
            activeContentId === content.id 
              ? 'bg-blue-600/10 text-white border border-blue-500/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div className={`${activeContentId === content.id ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
             {getIcon(content.type, activeContentId === content.id)}
          </div>
          <span className="text-sm font-medium truncate flex-1">{content.title}</span>
          {content.has_quiz && (
             <BrainCircuit size={12} className={activeContentId === content.id ? 'text-blue-400' : 'text-slate-700'} />
          )}
        </button>
      ))}
    </>
  );
};
