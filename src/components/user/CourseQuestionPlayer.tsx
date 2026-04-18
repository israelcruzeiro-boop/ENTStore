import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, HelpCircle, Upload, Image as ImageIcon, X } from 'lucide-react';
import { CoursePhaseQuestion } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { WordSearchQuestion } from './WordSearchQuestion';
import { OrderingQuestion } from './OrderingQuestion';
import { HotspotQuestion } from './HotspotQuestion';
import { HangmanQuestion } from './HangmanQuestion';

interface CourseQuestionPlayerProps {
  questions: CoursePhaseQuestion[];
  phaseTitle: string;
  courseThumbnail?: string | null;
  primaryColor?: string | null;
  onComplete: (correct: number, total: number, answers: Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>) => void;
  initialAnswers?: Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>;
  reviewMode?: boolean;
  onAutosave?: (questionId: string, payload: { optionId?: string; complexAnswer?: any; isCorrect: boolean }) => void;
}

function computeIsCorrect(question: CoursePhaseQuestion, selectedOptionId: string | null, complexAnswer: any): boolean {
  const options = question.options || [];
  if (question.question_type === 'MULTIPLE_CHOICE' || !question.question_type) {
    if (!selectedOptionId) return false;
    return options.find(o => o.id === selectedOptionId)?.is_correct || false;
  }
  if (question.question_type === 'WORD_SEARCH') {
    const foundObj = complexAnswer || {};
    const found = Array.isArray(foundObj) ? foundObj : (foundObj.foundWords || []);
    const targetCount = question.configuration?.words?.length || 0;
    return found.length === targetCount;
  }
  if (question.question_type === 'ORDERING') {
    const currentOrder = (complexAnswer as string[]) || [];
    const correctOrder = question.configuration?.items || [];
    return JSON.stringify(currentOrder) === JSON.stringify(correctOrder);
  }
  if (question.question_type === 'HOTSPOT') {
    const click = complexAnswer as { x: number; y: number };
    if (!click) return false;
    const hotspots = question.configuration?.hotspots || [];
    return hotspots.some((hs: any) => {
      const dist = Math.sqrt(Math.pow(click.x - hs.x, 2) + Math.pow(click.y - hs.y, 2));
      return dist <= (hs.radius || 5);
    });
  }
  if (question.question_type === 'FILE') return !!complexAnswer;
  if (question.question_type === 'HANGMAN') {
    const answer = complexAnswer as { isComplete?: boolean; isFailed?: boolean };
    return answer?.isComplete === true && !answer?.isFailed;
  }
  return false;
}

export function CourseQuestionPlayer({
  questions,
  phaseTitle,
  courseThumbnail,
  primaryColor,
  onComplete,
  initialAnswers = {},
  reviewMode = false,
  onAutosave
}: CourseQuestionPlayerProps) {
  // Encontra a primeira pergunta não respondida para iniciar
  const getFirstUnansweredIndex = () => {
    if (reviewMode) return 0;
    const idx = questions.findIndex(q => !initialAnswers[q.id]);
    return idx >= 0 ? idx : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(getFirstUnansweredIndex);
  const currentQuestion = questions[currentIndex];
  
  const preAnswered = initialAnswers[currentQuestion?.id];
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(preAnswered?.optionId || null);
  const [complexAnswer, setComplexAnswer] = useState<any>(preAnswered?.complexAnswer || null);
  const [isAnswered, setIsAnswered] = useState(!!preAnswered || reviewMode);
  const [answersMap, setAnswersMap] = useState<Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>>(initialAnswers);

  if (questions.length === 0) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const options = currentQuestion.options || [];

  const handleCurrentQuestionChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    const qId = questions[newIndex].id;
    const existing = answersMap[qId];
    if (existing || reviewMode) {
      setSelectedOptionId(existing?.optionId || null);
      setComplexAnswer(existing?.complexAnswer || null);
      setIsAnswered(true);
    } else {
      setSelectedOptionId(null);
      setComplexAnswer(null);
      setIsAnswered(false);
    }
  };

  const handleConfirmAnswer = () => {
    if (isAnswered) return;

    const type = currentQuestion.question_type || 'MULTIPLE_CHOICE';
    if (type === 'MULTIPLE_CHOICE' && !selectedOptionId) return;
    if (type === 'HOTSPOT' && !complexAnswer) return;

    const isCorrect = type === 'FILE' ? true : computeIsCorrect(currentQuestion, selectedOptionId, complexAnswer);

    setIsAnswered(true);
    const result = {
      optionId: selectedOptionId || undefined,
      complexAnswer: complexAnswer || undefined,
      isCorrect
    };

    setAnswersMap(prev => ({
      ...prev,
      [currentQuestion.id]: result
    }));

    if (onAutosave) {
      onAutosave(currentQuestion.id, result);
    }
  };

  // Autosave incremental: grava respostas parciais (ex.: palavra encontrada no caça-palavras)
  // com is_correct=false até a confirmação final. Debounce 600ms.
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onAutosave || reviewMode || isAnswered || !currentQuestion) return;
    const hasAnyValue = selectedOptionId != null || complexAnswer != null;
    if (!hasAnyValue) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      onAutosave(currentQuestion.id, {
        optionId: selectedOptionId || undefined,
        complexAnswer: complexAnswer || undefined,
        isCorrect: computeIsCorrect(currentQuestion, selectedOptionId, complexAnswer)
      });
    }, 600);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [selectedOptionId, complexAnswer, currentQuestion, isAnswered, reviewMode, onAutosave]);

  const handleNext = () => {
    if (reviewMode) {
      // Em review mode, navega sequencialmente
      if (currentIndex < questions.length - 1) {
        handleCurrentQuestionChange(currentIndex + 1);
      }
    } else {
      // Modo normal: pula para a próxima pergunta NÃO respondida
      let nextIdx = -1;
      for (let i = currentIndex + 1; i < questions.length; i++) {
        if (!answersMap[questions[i].id]) {
          nextIdx = i;
          break;
        }
      }

      if (nextIdx >= 0) {
        handleCurrentQuestionChange(nextIdx);
      } else {
        // Não há mais perguntas pendentes — concluir fase
        const finalCorrect = Object.values(answersMap).filter(a => a.isCorrect).length;
        onComplete(finalCorrect, questions.length, answersMap);
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentIndex > 0) {
      handleCurrentQuestionChange(currentIndex - 1);
    }
  };

  const renderQuestionContent = () => {
    const type = currentQuestion.question_type || 'MULTIPLE_CHOICE';

    switch (type) {
      case 'WORD_SEARCH':
        return (
          <WordSearchQuestion 
            key={currentQuestion.id}
            configuration={currentQuestion.configuration}
            onAnswer={setComplexAnswer}
            isAnswered={isAnswered}
            userAnswer={complexAnswer}
          />
        );
      case 'ORDERING':
        return (
          <OrderingQuestion 
            configuration={currentQuestion.configuration}
            onAnswer={setComplexAnswer}
            isAnswered={isAnswered}
            userAnswer={complexAnswer}
          />
        );
      case 'HOTSPOT':
        return (
          <HotspotQuestion 
            image_url={currentQuestion.image_url || ''}
            configuration={currentQuestion.configuration}
            onAnswer={setComplexAnswer}
            isAnswered={isAnswered}
            userAnswer={complexAnswer}
          />
        );
      case 'HANGMAN':
        return (
          <HangmanQuestion
            key={currentQuestion.id}
            configuration={currentQuestion.configuration}
            onAnswer={setComplexAnswer}
            isAnswered={isAnswered}
            userAnswer={complexAnswer}
          />
        );
      case 'FILE':
        return (
          <div className="space-y-4">
            <p className="text-sm text-white/50 font-medium">Envie uma imagem como resposta:</p>
            {complexAnswer ? (
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <img 
                  src={typeof complexAnswer === 'string' ? complexAnswer : (complexAnswer as any)?.preview} 
                  alt="Resposta" 
                  className="w-full max-h-64 object-contain bg-black/30" 
                />
                {!isAnswered && (
                  <button
                    onClick={() => setComplexAnswer(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="px-3 py-2 bg-white/5 text-xs text-white/40">
                  {(complexAnswer as any)?.name || 'Imagem selecionada'}
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/15 rounded-2xl hover:border-white/30 hover:bg-white/5 transition-all cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setComplexAnswer({
                          preview: reader.result as string,
                          name: file.name,
                          size: file.size,
                          type: file.type
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <Upload size={24} className="text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white/70">Toque para selecionar uma imagem</p>
                  <p className="text-[10px] text-white/30 mt-1">JPG, PNG, WEBP • Máx 10MB</p>
                </div>
              </label>
            )}
          </div>
        );
      case 'MULTIPLE_CHOICE':
      default:
        return (
          <div className="grid grid-cols-1 gap-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => !isAnswered && setSelectedOptionId(option.id)}
                disabled={isAnswered}
                className={cn(
                  "group relative flex items-center p-4 rounded-xl border transition-all duration-200 text-left",
                  selectedOptionId === option.id ? "border-white bg-white/10" : "border-white/10 bg-white/5",
                  isAnswered && option.is_correct && "border-green-500 bg-green-500/10",
                  isAnswered && selectedOptionId === option.id && !option.is_correct && "border-red-500 bg-red-500/10",
                  isAnswered && option.id !== selectedOptionId && !option.is_correct && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full border flex items-center justify-center mr-4 shrink-0",
                    selectedOptionId === option.id ? "border-white bg-white" : "border-white/20",
                    isAnswered && option.is_correct && "border-green-500 bg-green-500",
                    isAnswered && selectedOptionId === option.id && !option.is_correct && "border-red-500 bg-red-500"
                  )}
                >
                  {isAnswered && option.is_correct && <CheckCircle2 className="w-4 h-4 text-black" />}
                  {isAnswered && selectedOptionId === option.id && !option.is_correct && <XCircle className="w-4 h-4 text-white" />}
                  {!isAnswered && selectedOptionId === option.id && <div className="w-2 h-2 bg-black rounded-full" />}
                </div>
                <span className={cn("text-base", selectedOptionId === option.id ? "text-white font-medium" : "text-white/70")}>
                  {option.option_text}
                </span>
              </button>
            ))}
          </div>
        );
    }
  };

  const isCurrentValid = () => {
    if (isAnswered) return true;
    const type = currentQuestion.question_type || 'MULTIPLE_CHOICE';
    if (type === 'MULTIPLE_CHOICE') return !!selectedOptionId;
    if (type === 'HOTSPOT') return !!complexAnswer;
    if (type === 'WORD_SEARCH') {
       const foundObj = (complexAnswer as any) || {};
       const foundCount = Array.isArray(foundObj) ? foundObj.length : (foundObj.foundWords?.length || 0);
       return foundCount > 0;
    }
    if (type === 'ORDERING') return !!complexAnswer;
    if (type === 'FILE') return !!complexAnswer;
    if (type === 'HANGMAN') {
      const answer = complexAnswer as { isComplete?: boolean; isFailed?: boolean };
      return answer?.isComplete || answer?.isFailed || false;
    }
    return false;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border border-white/10 shadow-xl bg-slate-900/60 text-white overflow-hidden relative rounded-2xl sm:rounded-3xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5 z-20">
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: primaryColor || '#3b82f6' }} />
      </div>

      <CardHeader className="flex flex-col items-start justify-between pb-3 pt-6 sm:pt-8 relative z-20 border-b border-white/[0.04]">
        <div className="space-y-3 sm:space-y-4 w-full">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest px-2.5 py-1 bg-white/5 border border-white/10 rounded-full truncate min-w-0" style={{ color: primaryColor || '#60a5fa' }}>
              {phaseTitle}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-white/40 uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-full shrink-0">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
          <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold leading-snug text-white/90">
            {currentQuestion.question_text}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-5 sm:py-6">
        {renderQuestionContent()}

        {isAnswered && currentQuestion.explanation && (
          <div className="mt-6 p-4 rounded-xl border flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300" style={{ backgroundColor: `${primaryColor || '#3b82f6'}1a`, borderColor: `${primaryColor || '#3b82f6'}33` }}>
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: primaryColor || '#3b82f6' }} />
            <div>
              <p className="text-sm font-bold mb-1" style={{ color: primaryColor || '#3b82f6' }}>Explicação</p>
              <p className="text-sm text-white/70 leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-8 flex flex-col items-center gap-3">
        {reviewMode ? (
          <div className="w-full flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1 bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 h-12 rounded-xl disabled:opacity-30" 
              onClick={handlePreviousQuestion} 
              disabled={currentIndex === 0}
            >
              <ChevronRight className="w-5 h-5 mr-1 rotate-180" /> Anterior
            </Button>
            {currentIndex < questions.length - 1 ? (
              <Button className="flex-1 bg-white text-black hover:bg-white/90 h-12 font-bold group rounded-xl" onClick={handleNext}>
                Próxima Questão
                <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <div className="flex-1 flex items-center justify-center h-12 bg-white/5 rounded-xl border border-white/10 text-white/40 text-sm font-bold">
                Última Questão
              </div>
            )}
          </div>
        ) : !isAnswered ? (
          <Button 
            className="w-full text-black hover:opacity-90 h-12 text-lg font-bold transition-transform active:scale-95 disabled:opacity-50" 
            style={isCurrentValid() ? { backgroundColor: primaryColor || '#ffffff', color: '#000' } : { backgroundColor: '#ffffff', color: '#000' }}
            onClick={handleConfirmAnswer} 
            disabled={!isCurrentValid()}
          >
            Confirmar Resposta
          </Button>
        ) : (
          <Button className="w-full bg-white text-black hover:bg-white/90 h-12 text-lg font-bold group" onClick={handleNext}>
            {currentIndex < questions.length - 1 ? 'Próxima Questão' : 'Concluir Fase'}
            <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
