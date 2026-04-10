import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, HelpCircle } from 'lucide-react';
import { CoursePhaseQuestion } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { WordSearchQuestion } from './WordSearchQuestion';
import { OrderingQuestion } from './OrderingQuestion';
import { HotspotQuestion } from './HotspotQuestion';

interface CourseQuestionPlayerProps {
  questions: CoursePhaseQuestion[];
  phaseTitle: string;
  courseThumbnail?: string | null;
  primaryColor?: string | null;
  onComplete: (correct: number, total: number, answers: Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>) => void;
  initialAnswers?: Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>;
}

export function CourseQuestionPlayer({ 
  questions, 
  phaseTitle, 
  courseThumbnail, 
  primaryColor, 
  onComplete, 
  initialAnswers = {} 
}: CourseQuestionPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentQuestion = questions[currentIndex];
  
  const preAnswered = initialAnswers[currentQuestion?.id];
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(preAnswered?.optionId || null);
  const [complexAnswer, setComplexAnswer] = useState<any>(preAnswered?.complexAnswer || null);
  const [isAnswered, setIsAnswered] = useState(!!preAnswered);
  const [answersMap, setAnswersMap] = useState<Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>>(initialAnswers);

  if (questions.length === 0) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const options = currentQuestion.options || [];

  const handleCurrentQuestionChange = (newIndex: number) => {
    setCurrentIndex(newIndex);
    const qId = questions[newIndex].id;
    const existing = answersMap[qId];
    if (existing) {
      setSelectedOptionId(existing.optionId || null);
      setComplexAnswer(existing.complexAnswer || null);
      setIsAnswered(true);
    } else {
      setSelectedOptionId(null);
      setComplexAnswer(null);
      setIsAnswered(false);
    }
  };

  const handleConfirmAnswer = () => {
    if (isAnswered) return;

    let isCorrect = false;

    if (currentQuestion.question_type === 'MULTIPLE_CHOICE' || !currentQuestion.question_type) {
      if (!selectedOptionId) return;
      const option = options.find(o => o.id === selectedOptionId);
      isCorrect = option?.is_correct || false;
    } 
    else if (currentQuestion.question_type === 'WORD_SEARCH') {
      const found = complexAnswer as string[] || [];
      const targetCount = currentQuestion.configuration?.words?.length || 0;
      isCorrect = found.length === targetCount;
    }
    else if (currentQuestion.question_type === 'ORDERING') {
      const currentOrder = complexAnswer as string[] || [];
      const correctOrder = currentQuestion.configuration?.items || [];
      isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);
    }
    else if (currentQuestion.question_type === 'HOTSPOT') {
      const click = complexAnswer as {x: number, y: number};
      if (!click) return;
      const hotspots = currentQuestion.configuration?.hotspots || [];
      // Verifica se clicou em qualquer um dos hotspots válidos
      isCorrect = hotspots.some((hs: any) => {
        const dist = Math.sqrt(Math.pow(click.x - hs.x, 2) + Math.pow(click.y - hs.y, 2));
        return dist <= (hs.radius || 5); // Default radius 5%
      });
    }

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
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      handleCurrentQuestionChange(currentIndex + 1);
    } else {
      const finalCorrect = Object.values(answersMap).filter(a => a.isCorrect).length;
      onComplete(finalCorrect, questions.length, answersMap);
    }
  };

  const renderQuestionContent = () => {
    const type = currentQuestion.question_type || 'MULTIPLE_CHOICE';

    switch (type) {
      case 'WORD_SEARCH':
        return (
          <WordSearchQuestion 
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
    if (type === 'WORD_SEARCH') return (complexAnswer as string[])?.length > 0;
    if (type === 'ORDERING') return !!complexAnswer;
    return false;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border border-white/10 shadow-2xl bg-white/[0.02] text-white overflow-hidden relative backdrop-blur-md rounded-3xl">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-white/5 z-20">
        <div className="h-full transition-all duration-700 ease-out" style={{ width: `${progress}%`, backgroundColor: primaryColor || '#3b82f6', boxShadow: `0 0 10px ${primaryColor || '#3b82f6'}80` }} />
      </div>

      <CardHeader className="flex flex-col items-start justify-between pb-4 pt-8 relative z-20 border-b border-white/[0.04]">
        <div className="space-y-4 w-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-white/5 border border-white/10 rounded-full" style={{ color: primaryColor || '#60a5fa' }}>
              {phaseTitle}
            </span>
            <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full">
              QUESTÃO {currentIndex + 1} DE {questions.length}
            </span>
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold leading-relaxed text-white/90">
            {currentQuestion.question_text}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 py-6 min-h-[300px] flex flex-col justify-center">
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

      <CardFooter className="pt-2 pb-8 flex flex-col items-center">
        {!isAnswered ? (
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
