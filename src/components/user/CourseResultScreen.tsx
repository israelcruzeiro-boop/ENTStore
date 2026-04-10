import { Trophy, Clock, Target, BarChart3, CheckCircle2, XCircle, Printer, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { CourseEnrollment } from '../../types';

interface CourseResultScreenProps {
  enrollment?: CourseEnrollment | null;
  courseTitle: string;
  passingScore: number;
  onGoHome: () => void;
  onPrintDiploma?: () => void;
  // Dados locais (fallback quando enrollment é null)
  localCorrect?: number;
  localTotal?: number;
}

export function CourseResultScreen({ enrollment, courseTitle, passingScore, onGoHome, onPrintDiploma, localCorrect = 0, localTotal = 0 }: CourseResultScreenProps) {
  // Usa dados do enrollment se disponível, senão usa dados locais
  const totalCorrect = enrollment?.total_correct ?? localCorrect;
  const totalQuestionsVal = enrollment?.total_questions ?? localTotal;
  const scorePercent = enrollment?.score_percent ?? (totalQuestionsVal > 0 ? Math.round((totalCorrect / totalQuestionsVal) * 100) : 100);
  const passed = scorePercent >= passingScore;
  const timeSpent = enrollment?.time_spent_seconds || 0;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} segundos`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}min ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}min`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-700">
        {/* Header visual */}
        <div className={`relative overflow-hidden rounded-t-3xl p-8 md:p-12 text-center ${
          passed 
            ? 'bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600' 
            : 'bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700'
        }`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.15),transparent)]" />
          
          <div className="relative z-10">
            <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
              passed ? 'bg-white/20' : 'bg-white/10'
            }`}>
              {passed ? (
                <Trophy className="w-12 h-12 text-white" />
              ) : (
                <Target className="w-12 h-12 text-white/60" />
              )}
            </div>

            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
              {passed ? 'Parabéns!' : 'Curso Concluído'}
            </h1>
            <p className="text-white/70 text-sm md:text-base max-w-md mx-auto">
              {passed 
                ? `Você concluiu o curso "${courseTitle}" com sucesso!`
                : `Você concluiu o curso "${courseTitle}". A nota mínima era ${passingScore}%.`
              }
            </p>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="bg-slate-900 p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-5 rounded-2xl text-center border border-white/10">
              <BarChart3 className="w-6 h-6 text-blue-400 mx-auto mb-2 opacity-60" />
              <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-wider">Sua Nota</p>
              <p className={`text-4xl font-black ${
                scorePercent >= 80 ? 'text-emerald-400' :
                scorePercent >= 60 ? 'text-amber-400' :
                'text-red-400'
              }`}>{scorePercent}%</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl text-center border border-white/10">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2 opacity-60" />
              <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-wider">Tempo Total</p>
              <p className="text-2xl font-black text-white">{timeSpent > 0 ? formatTime(timeSpent) : '—'}</p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl text-center border border-white/10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-60" />
              <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-wider">Acertos</p>
              <p className="text-4xl font-black text-white">
                {totalCorrect}
                <span className="text-lg text-white/30">/{totalQuestionsVal}</span>
              </p>
            </div>
            <div className="bg-white/5 p-5 rounded-2xl text-center border border-white/10">
              {passed ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2 opacity-60" />
                  <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-wider">Status</p>
                  <p className="text-lg font-black text-emerald-400">Aprovado</p>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2 opacity-60" />
                  <p className="text-[10px] text-white/40 mb-1 font-bold uppercase tracking-wider">Status</p>
                  <p className="text-lg font-black text-red-400">Mínimo: {passingScore}%</p>
                </>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-3 pt-4">
            {passed && onPrintDiploma && (
              <Button 
                onClick={onPrintDiploma}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold border-0 h-14 rounded-2xl shadow-lg shadow-amber-500/20 gap-3 text-base"
              >
                <Printer className="w-5 h-5" />
                Imprimir Diploma
              </Button>
            )}
            <Button
              onClick={onGoHome}
              variant="outline"
              className="w-full bg-transparent border-white/20 hover:bg-white/10 text-white font-bold h-12 rounded-xl gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Início
            </Button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-b-3xl p-4 border-t border-white/5">
          <p className="text-center text-[10px] text-white/20 font-bold uppercase tracking-widest">
            Resultado registrado em {enrollment?.completed_at ? new Date(enrollment.completed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}
