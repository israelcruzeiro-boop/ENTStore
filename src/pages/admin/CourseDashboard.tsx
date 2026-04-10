import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useCompanies, useCourses, useCourseDashboard } from '../../hooks/useSupabaseData';
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  Trophy, 
  Search, 
  Filter,
  Loader2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Download,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const AdminCourseDashboard = () => {
  const { companySlug } = useParams();
  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  const { courses } = useCourses(company?.id);
  const { enrollments, isLoading } = useCourseDashboard(company?.id);

  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredEnrollments = useMemo(() => {
    let result = enrollments;
    if (selectedCourseId !== 'all') {
      result = result.filter((e: Record<string, unknown>) => e.course_id === selectedCourseId);
    }
    if (searchQuery) {
      result = result.filter((e: Record<string, unknown>) => {
        const user = e.users as Record<string, string> | null;
        return user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    if (dateFrom) {
      result = result.filter((e: Record<string, unknown>) => new Date(e.created_at as string) >= new Date(dateFrom));
    }
    if (dateTo) {
      result = result.filter((e: Record<string, unknown>) => new Date(e.created_at as string) <= new Date(dateTo + 'T23:59:59'));
    }
    return result;
  }, [enrollments, selectedCourseId, searchQuery, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const completed = filteredEnrollments.filter((e: Record<string, unknown>) => e.status === 'COMPLETED');
    const total = filteredEnrollments.length;
    const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
    const avgScore = completed.length > 0 
      ? Math.round(completed.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.score_percent as number) || 0), 0) / completed.length) 
      : 0;
    const avgTime = completed.length > 0 
      ? Math.round(completed.reduce((sum: number, e: Record<string, unknown>) => sum + ((e.time_spent_seconds as number) || 0), 0) / completed.length)
      : 0;

    return { total, completed: completed.length, completionRate, avgScore, avgTime };
  }, [filteredEnrollments]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  };

  const ranking = useMemo(() => {
    return filteredEnrollments
      .filter((e: Record<string, unknown>) => e.status === 'COMPLETED')
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => ((b.score_percent as number) || 0) - ((a.score_percent as number) || 0));
  }, [filteredEnrollments]);

  const handleExportCSV = () => {
    const headers = ['Aluno', 'Email', 'Curso', 'Status', 'Nota (%)', 'Acertos', 'Total Perguntas', 'Tempo', 'Data Início', 'Data Conclusão'];
    const rows = filteredEnrollments.map((e: Record<string, unknown>) => {
      const user = e.users as Record<string, string> | null;
      const course = e.courses as Record<string, string> | null;
      return [
        user?.name || '',
        user?.email || '',
        course?.title || '',
        e.status === 'COMPLETED' ? 'Concluído' : 'Em Andamento',
        (e.score_percent as number)?.toString() || '-',
        (e.total_correct as number)?.toString() || '0',
        (e.total_questions as number)?.toString() || '0',
        formatTime((e.time_spent_seconds as number) || 0),
        e.started_at ? new Date(e.started_at as string).toLocaleDateString('pt-BR') : '-',
        e.completed_at ? new Date(e.completed_at as string).toLocaleDateString('pt-BR') : '-'
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_cursos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Cursos</h1>
          <p className="text-slate-500 text-sm">Acompanhe o desempenho dos alunos e métricas de treinamento.</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2 border-slate-200">
          <Download size={18} /> Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Buscar por nome ou email..."
            className="pl-10 border-slate-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <select
            className="pl-10 pr-8 h-10 border border-slate-200 rounded-md bg-white text-sm text-slate-700 appearance-none cursor-pointer min-w-[200px]"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="all">Todos os Cursos</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
        </div>
        <Input
          type="date"
          className="border-slate-200 max-w-[160px]"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="Data início"
        />
        <Input
          type="date"
          className="border-slate-200 max-w-[160px]"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="Data fim"
        />
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 animate-pulse">Carregando métricas...</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard icon={<Users size={20} />} label="Matrículas" value={stats.total} color="blue" />
            <StatCard icon={<CheckCircle2 size={20} />} label="Concluídos" value={stats.completed} color="emerald" />
            <StatCard icon={<TrendingUp size={20} />} label="Taxa Conclusão" value={`${stats.completionRate}%`} color="amber" />
            <StatCard icon={<BarChart3 size={20} />} label="Nota Média" value={`${stats.avgScore}%`} color="indigo" />
            <StatCard icon={<Clock size={20} />} label="Tempo Médio" value={formatTime(stats.avgTime)} color="rose" />
          </div>

          {/* Ranking */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Trophy size={20} className="text-amber-500" />
              <h2 className="font-bold text-slate-800">Ranking de Aproveitamento</h2>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">{ranking.length} alunos</span>
            </div>

            {ranking.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <BookOpen size={48} className="opacity-20 mb-4" />
                <p className="font-bold text-slate-600">Nenhum aluno concluiu ainda</p>
                <p className="text-xs">O ranking aparecerá quando houver conclusões.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                      <th className="text-left p-4 w-12">#</th>
                      <th className="text-left p-4">Aluno</th>
                      <th className="text-left p-4">Curso</th>
                      <th className="text-center p-4">Nota</th>
                      <th className="text-center p-4">Acertos</th>
                      <th className="text-center p-4">Tempo</th>
                      <th className="text-center p-4">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((enrollment: Record<string, unknown>, idx: number) => {
                      const user = enrollment.users as Record<string, string> | null;
                      const course = enrollment.courses as Record<string, string> | null;
                      const score = (enrollment.score_percent as number) || 0;
                      return (
                        <tr key={enrollment.id as string} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            {idx < 3 ? (
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white ${
                                idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-700'
                              }`}>{idx + 1}</span>
                            ) : (
                              <span className="text-slate-400 font-bold">{idx + 1}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-bold text-slate-800">{user?.name || 'Aluno'}</p>
                              <p className="text-[10px] text-slate-400">{user?.email}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-medium text-slate-600">{course?.title || '-'}</span>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                              score >= 80 ? 'bg-emerald-50 text-emerald-700' :
                              score >= 60 ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {score >= 80 ? <CheckCircle2 size={12} /> : score < 60 ? <XCircle size={12} /> : null}
                              {score}%
                            </span>
                          </td>
                          <td className="p-4 text-center text-xs text-slate-600 font-bold">
                            {enrollment.total_correct as number}/{enrollment.total_questions as number}
                          </td>
                          <td className="p-4 text-center text-xs text-slate-500">
                            {formatTime((enrollment.time_spent_seconds as number) || 0)}
                          </td>
                          <td className="p-4 text-center text-xs text-slate-400">
                            {enrollment.completed_at ? new Date(enrollment.completed_at as string).toLocaleDateString('pt-BR') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  return (
    <div className={`p-4 rounded-xl border ${colorMap[color]} transition-all hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2 opacity-60">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
};
