import React from 'react';
import { 
  User, MapPin, Calendar, TrendingUp, ClipboardCheck, 
  CheckCircle2, Clock, BookOpen, Trophy, Star, Medal
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserProfileCardProps {
  user: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
    org_unit_id?: string;
    org_top_level_id?: string;
    xp_total?: number;
    coins_total?: number;
  } | null;
  unitName?: string;
  regionName?: string;
  stats: {
    totalChecklists: number;
    completedChecklists: number;
    avgConformity: number;
    lastActivity: string | null;
  };
  history: Array<{
    id: string;
    title: string;
    status: string;
    completedAt: string | null;
    createdAt: string;
  }>;
  courseHistory?: Array<{
    id: string;
    status: string;
    completed_at: string | null;
    created_at: string;
    courses: {
      title: string;
      image_url?: string;
    } | null;
  }>;
  onClose?: () => void;
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user,
  unitName,
  regionName,
  stats,
  history,
  courseHistory = []
}) => {
  if (!user) return null;

  const initials = user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="bg-[#0f172a] text-white rounded-[40px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-500 max-w-4xl w-full mx-auto">
      {/* Dynamic Header */}
      <div className="relative h-48 bg-gradient-to-br from-indigo-900 via-slate-900 to-black overflow-hidden">
        <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.4) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66-3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-43c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm10-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")' }} />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0f172a] to-transparent" />
      </div>

      <div className="relative px-8 md:px-12 -mt-20 z-10 flex flex-col md:flex-row items-end gap-6">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-[6px] border-[#0f172a] shadow-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 transform hover:scale-105 transition-transform duration-500">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-4xl font-black">
              {initials}
            </div>
          )}
        </div>
        
        <div className="flex-1 pb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none">{user.name}</h3>
            <div className="flex gap-2">
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                  <Trophy size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{user.xp_total || 0} XP</span>
               </div>
               <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Medal size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Nível 5</span>
               </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-3 text-slate-400 font-medium text-sm">
             {user.email && <p className="opacity-80">{user.email}</p>}
             <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-indigo-400" />
                <span>{unitName || 'Sem Unidade'} · {regionName || 'Sem Regional'}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 md:p-12">
        {/* Statistics Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <ClipboardCheck className="text-indigo-400 mb-2" size={24} />
                <span className="text-3xl font-black">{stats.totalChecklists}</span>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Acessos</span>
             </div>
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <CheckCircle2 className="text-emerald-400 mb-2" size={24} />
                <span className="text-3xl font-black">{stats.completedChecklists}</span>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Concluídos</span>
             </div>
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <TrendingUp className="text-pink-400 mb-2" size={24} />
                <span className="text-3xl font-black">{stats.avgConformity}%</span>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Sucesso</span>
             </div>
             <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                <Clock className="text-amber-400 mb-2" size={24} />
                <span className="text-xl font-black mt-1">
                   {stats.lastActivity ? format(new Date(stats.lastActivity), "dd/MM", { locale: ptBR }) : '—'}
                </span>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Atividade</span>
             </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2.5rem] shadow-lg shadow-indigo-500/20">
             <h4 className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest mb-4">
                <Star size={16} fill="white" /> Medalhas Coletadas
             </h4>
             <div className="flex flex-wrap gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 hover:scale-110 transition-transform cursor-pointer">
                    <Medal size={20} className="text-white" />
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Content Tabs/Lists */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          {/* Course History Section */}
          <div className="space-y-4">
             <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-400" /> Histórico de Cursos Reais
             </h4>
             <div className="grid grid-cols-1 gap-1">
                {courseHistory.length > 0 ? courseHistory.slice(0, 5).map((course) => (
                  <div key={course.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-white/10">
                       {course.courses?.image_url ? (
                         <img src={course.courses.image_url} alt="" className="w-full h-full object-cover" />
                       ) : <BookOpen size={16} className="m-auto mt-3 opacity-20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{course.courses?.title || 'Curso Removido'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                          course.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {course.status === 'COMPLETED' ? 'Concluído' : 'Em Progresso'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                           {course.completed_at ? format(new Date(course.completed_at), "dd MMM yy", { locale: ptBR }) : 'Iniciado'}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                     <p className="text-sm font-bold text-slate-500">Nenhum curso iniciado ainda</p>
                  </div>
                )}
             </div>
          </div>

          {/* Checklist History Section */}
          <div className="space-y-4">
             <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck size={16} className="text-emerald-400" /> Auditorias & Checklists
             </h4>
             <div className="grid grid-cols-1 gap-1">
                {history.length > 0 ? history.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      entry.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-400 animate-pulse'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{entry.title}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {entry.completedAt 
                          ? format(new Date(entry.completedAt), "dd MMM yyyy, HH:mm", { locale: ptBR })
                          : 'Aguardando finalização'}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      entry.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {entry.status === 'COMPLETED' ? 'Check' : 'Pendente'}
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                     <p className="text-sm font-bold text-slate-500">Nenhum checklist registrado</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

