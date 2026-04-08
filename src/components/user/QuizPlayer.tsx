import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ChevronRight, Timer, Trophy, AlertCircle, RefreshCcw, Quote } from 'lucide-react';
import { Quiz, QuizQuestion } from '../../types';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { cn } from '../../lib/utils';
import { submitQuizAttempt, awardXP } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface QuizPlayerProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  userId: string;
  companyId: string;
  onComplete?: (score: number, passed: boolean) => void;
  onBack?: () => void;
}

export function QuizPlayer({ quiz, questions: initialQuestions, userId, companyId, onComplete }: QuizPlayerProps) {
  const { refreshUser } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (quiz.shuffle_questions) {
      setQuestions([...initialQuestions].sort(() => Math.random() - 0.5));
    } else {
      setQuestions(initialQuestions);
    }
  }, [initialQuestions, quiz.shuffle_questions]);

  if (questions.length === 0) return null;

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
  };

  const handleConfirmAnswer = () => {
    if (!selectedOptionId || isAnswered) return;

    const option = currentQuestion.quiz_options?.find(o => o.id === selectedOptionId);
    if (option?.is_correct) {
      setScore(prev => prev + 1);
    }

    setIsAnswered(true);
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedOptionId }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    const finalScore = Math.round((score / questions.length) * 100);
    const passed = finalScore >= quiz.passing_score;

    try {
      await submitQuizAttempt({
        company_id: companyId,
        user_id: userId,
        quiz_id: quiz.id,
        score: finalScore,
        passed,
        answers
      });

      if (passed && quiz.points_reward > 0) {
        try {
          await awardXP(userId, quiz.points_reward);
        } catch (xpError) {
          console.error('Error awarding XP:', xpError);
        }
      }

      setShowResults(true);
      if (onComplete) onComplete(finalScore, passed);
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      toast.error('Erro ao salvar seu progresso no quiz.');
      setShowResults(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
    setAnswers({});
  };

  if (showResults) {
    const finalScore = Math.round((score / questions.length) * 100);
    const passed = finalScore >= quiz.passing_score;

    return (
      <Card className="w-full max-w-2xl mx-auto border-none shadow-2xl bg-white/10 backdrop-blur-md text-white overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className={cn("h-2 w-full", passed ? "bg-green-500" : "bg-red-500")} />
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {passed ? (
              <div className="p-4 bg-green-500/20 rounded-full">
                <Trophy className="w-16 h-16 text-green-400" />
              </div>
            ) : (
              <div className="p-4 bg-red-500/20 rounded-full">
                <AlertCircle className="w-16 h-16 text-red-400" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl font-bold">
            {passed ? 'Excelente Trabalho!' : 'Não foi desta vez'}
          </CardTitle>
          <p className="text-white/60 mt-1">
            {passed ? `Você superou a meta de ${quiz.passing_score}%!` : `Você precisava de ${quiz.passing_score}% para passar.`}
          </p>
        </CardHeader>

        <CardContent className="space-y-6 py-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-xl text-center border border-white/10">
              <p className="text-sm text-white/40 mb-1">Sua Pontuação</p>
              <p className="text-4xl font-black text-white">{finalScore}%</p>
            </div>
            <div className="bg-white/5 p-4 rounded-xl text-center border border-white/10">
              <p className="text-sm text-white/40 mb-1">Acertos</p>
              <p className="text-4xl font-black text-white">{score}/{questions.length}</p>
            </div>
          </div>

          {passed && quiz.points_reward > 0 && (
            <div className="flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-500 py-3 rounded-lg border border-yellow-500/20 animate-pulse">
              <Trophy className="w-5 h-5" />
              <span className="font-bold">+{quiz.points_reward} XP Ganhos!</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 text-white" onClick={resetQuiz}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          {passed && (
            <Button
              className="flex-1 bg-white text-black hover:bg-white/90 font-bold"
              onClick={async () => {
                await refreshUser();
                if (onComplete) onComplete(finalScore, passed);
                toast.success('Parabéns por concluir o quiz!');
              }}
            >
              Concluir
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-3xl mx-auto border-none shadow-2xl bg-[#0a0a0b] text-white overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
        <div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <CardHeader className="flex flex-row items-center justify-between pb-2 mt-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/40 uppercase tracking-widest">
            QUESTÃO {currentQuestionIndex + 1} DE {questions.length}
          </p>
          <CardTitle className="text-xl font-medium leading-tight">
            {currentQuestion.question_text}
          </CardTitle>
        </div>
        {quiz.time_limit && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            <Timer className="w-4 h-4 text-white/60" />
            <span className="text-sm font-mono font-bold">
              {Math.max(0, quiz.time_limit - Math.floor((Date.now() - startTime) / 1000))}s
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 py-6">
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.quiz_options?.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionSelect(option.id)}
              disabled={isAnswered}
              className={cn(
                "group relative flex items-center p-4 rounded-xl border transition-all duration-200 text-left",
                selectedOptionId === option.id ? "border-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/5",
                isAnswered && option.is_correct && "border-green-500 bg-green-500/10",
                isAnswered && selectedOptionId === option.id && !option.is_correct && "border-red-500 bg-red-500/10",
                isAnswered && option.id !== selectedOptionId && !option.is_correct && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center mr-4 shrink-0 transition-colors",
                  selectedOptionId === option.id ? "border-white bg-white" : "border-white/20",
                  isAnswered && option.is_correct && "border-green-500 bg-green-500",
                  isAnswered && selectedOptionId === option.id && !option.is_correct && "border-red-500 bg-red-500"
                )}
              >
                {isAnswered && option.is_correct && <CheckCircle2 className="w-4 h-4 text-black" />}
                {isAnswered && selectedOptionId === option.id && !option.is_correct && <XCircle className="w-4 h-4 text-white" />}
                {!isAnswered && selectedOptionId === option.id && <div className="w-2 h-2 bg-black rounded-full" />}
              </div>

              <span className={cn("text-base transition-colors", selectedOptionId === option.id ? "text-white font-medium" : "text-white/70")}>
                {option.option_text}
              </span>
            </button>
          ))}
        </div>

        {isAnswered && currentQuestion.explanation && (
          <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-400 mb-1">Explicação</p>
              <p className="text-sm text-white/70 leading-relaxed">{currentQuestion.explanation}</p>
            </div>
          </div>
        )}

        {isAnswered && currentQuestion.source_excerpt && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <Quote className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-400 mb-1">Trecho do material</p>
              <p className="text-sm text-white/75 leading-relaxed italic">
                {currentQuestion.source_excerpt}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-8 flex flex-col items-center">
        {!isAnswered ? (
          <Button className="w-full bg-white text-black hover:bg-white/90 h-12 text-lg font-bold transition-transform active:scale-95 disabled:opacity-50" onClick={handleConfirmAnswer} disabled={!selectedOptionId}>
            Confirmar Resposta
          </Button>
        ) : (
          <Button className="w-full bg-white text-black hover:bg-white/90 h-12 text-lg font-bold group" onClick={handleNextQuestion}>
            {currentQuestionIndex < questions.length - 1 ? 'Próxima Questão' : 'Ver Resultado'}
            <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}