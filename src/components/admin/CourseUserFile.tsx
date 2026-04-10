import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';
import { 
  User as UserIcon, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Trophy, 
  Target,
  BarChart3,
  Calendar,
  Zap,
  TrendingUp,
  MapPin,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { CourseStatusTag } from './CourseStatusTag';

interface CourseUserFileProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  unitName?: string;
  regionName?: string;
  enrollments: any[];
  courses: any[];
}

export const CourseUserFile: React.FC<CourseUserFileProps> = ({
  isOpen,
  onClose,
  user,
  unitName,
  regionName,
  enrollments,
  courses
}) => {
  if (!user) return null;

  const userEnrollments = enrollments.filter(e => e.user_id === user.id);
  const completed = userEnrollments.filter(e => e.status === 'COMPLETED');
  const inProgress = userEnrollments.filter(e => e.status === 'IN_PROGRESS');
  
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((acc, curr) => acc + (curr.score_percent || 0), 0) / completed.length)
    : 0;

  const totalPossible = courses.length; // Aqui poderíamos filtrar por checkCourseAccess se tivéssemos os dados, mas usaremos total como simplificação por enquanto

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl w-full p-0 bg-slate-950 border-white/10 overflow-hidden flex flex-col">
        {/* Header Decorativo */}
        <div className="relative h-40 bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 px-6 py-8 overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          <div className="relative z-10 flex items-center gap-5 mt-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-white/10 bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-2xl">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={32} className="text-white/60" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tighter">{user.name}</h2>
                <div className="flex items-center gap-2 text-white/80 font-bold text-sm">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] font-black uppercase">{unitName || 'S/ Unidade'}</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-[10px] font-black uppercase tracking-wider">{regionName || 'S/ Regional'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-hide">
          {/* Dashboard Rápido */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Trophy size={20} className="text-yellow-500 mb-2" />
                <span className="text-2xl font-black text-white tabular-nums">{completed.length}</span>
                <span className="text-[10px] text-white/80 uppercase font-black">Concluídos</span>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <TrendingUp size={20} className="text-blue-500 mb-2" />
                <span className="text-2xl font-black text-white tabular-nums">{avgScore}%</span>
                <span className="text-[10px] text-white/80 uppercase font-black">Média Nota</span>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Clock size={20} className="text-emerald-500 mb-2" />
                <span className="text-2xl font-black text-white tabular-nums">{inProgress.length}</span>
                <span className="text-[10px] text-white/80 uppercase font-black">Em Curso</span>
              </CardContent>
            </Card>
            <Card className="bg-white/[0.03] border-white/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Target size={20} className="text-amber-500 mb-2" />
                <span className="text-2xl font-black text-white tabular-nums">{userEnrollments.length}</span>
                <span className="text-[10px] text-white/80 uppercase font-black">Total Trilhas</span>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Matrículas */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-white/90 flex items-center gap-2 uppercase tracking-widest px-1">
              <Zap size={16} className="text-blue-500" />
              Histórico de Cursos
            </h4>
            
            <div className="space-y-3">
              {userEnrollments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-2xl">
                  <BookOpen size={40} className="text-white/20 mb-3" />
                  <p className="text-white text-sm font-black italic">Nenhum curso iniciado ainda.</p>
                </div>
              )}
              
              {userEnrollments.map(enroll => {
                const course = courses.find(c => c.id === enroll.course_id);
                
                return (
                  <div 
                    key={enroll.id}
                    className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 rounded-2xl p-4 transition-all duration-300"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/20 group-hover:scale-110 transition-transform">
                          <BookOpen size={18} className="text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-sm font-bold text-white truncate">{course?.title || 'Curso Removido'}</h5>
                          <div className="flex items-center gap-2 mt-0.5 opacity-90">
                            <Calendar size={10} className="text-indigo-200" />
                            <span className="text-[10px] text-white font-black">
                              Iniciado em {format(new Date(enroll.started_at), 'dd/MM/yy', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <CourseStatusTag status={enroll.status} size="sm" />
                    </div>

                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Média de Performance</span>
                        <span className="text-sm font-black text-white">{user.compliance}%</span>
                      </div>
                      <Progress 
                        value={enroll.score_percent || 0} 
                        className="h-1.5" 
                      />
                    </div>

                    {enroll.status === 'COMPLETED' && enroll.completed_at && (
                      <div className="mt-4 pt-4 border-t border-white/[0.05] flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5 text-white font-black">
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          Concluído em {format(new Date(enroll.completed_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </div>
                        <div className="font-black text-white">
                          {enroll.total_correct}/{enroll.total_questions} Acertos
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
