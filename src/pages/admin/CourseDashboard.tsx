import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useCompanies, 
  useCourses, 
  useUsers, 
  useCourseAnalytics, 
  useOrgStructure 
} from '../../hooks/useSupabaseData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  Users, Clock, TrendingUp, Trophy, Search, Filter, BookOpen, 
  CheckCircle2, ChevronDown, BarChart3, Target, Activity, 
  FileSpreadsheet, HelpCircle, UserCheck, AlertTriangle,
  DownloadCloud, Eye, Building2, Store
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { CourseUserFile } from '../../components/admin/CourseUserFile';
import { CourseStatusTag } from '../../components/admin/CourseStatusTag';
import { checkCourseAccess } from '../../lib/permissions';

export const AdminCourseDashboard = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
  const { courses, isLoading: loadingCourses } = useCourses(company?.id);
  const { users, isLoading: loadingUsers } = useUsers(company?.id);
  const { enrollments, answers, questions, isLoading: loadingAnalytics } = useCourseAnalytics(company?.id);
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('all'); // NOVO: Filtro por Loja
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<string>('all'); 
  const [questionSort, setQuestionSort] = useState<'errors' | 'successes'>('errors'); // NOVO: Ordenação Perguntas
  const [activeRankingLevel, setActiveRankingLevel] = useState<number>(3); // Nível do Ranking de Score
  const [activeCompletionLevel, setActiveCompletionLevel] = useState<number>(3); // Nível do Ranking de % de Conclusão
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedUserForFile, setSelectedUserForFile] = useState<any | null>(null);

  const isLoading = loadingCourses || loadingUsers || loadingAnalytics || loadingOrg;

  const now = useMemo(() => new Date(), []);
  const startDate = dateRange === 'all' ? null : startOfDay(subDays(now, parseInt(dateRange)));

  // -- PROCESSAMENTO DE DADOS -- //
  const analytics = useMemo(() => {
    if (!enrollments || !courses || !users) return null;

    let filtered = enrollments;
    
    // Filtro por Curso
    if (selectedCourseId !== 'all') filtered = filtered.filter(e => e.course_id === selectedCourseId);
    
    // Filtro por Unidade (Loja)
    if (selectedUnitId !== 'all') {
      filtered = filtered.filter(e => {
        const u = users.find(usr => usr.id === e.user_id);
        return u?.org_unit_id === selectedUnitId;
      });
    }

    // Filtro por Data
    if (startDate) {
      filtered = filtered.filter(e => {
        if (!e.created_at) return false;
        const d = new Date(e.created_at);
        if (isNaN(d.getTime())) return false;
        return isWithinInterval(d, { start: startDate, end: endOfDay(now) });
      });
    }

    const completed = filtered.filter(e => e.status === 'COMPLETED');
    const inProgress = filtered.filter(e => e.status === 'IN_PROGRESS');
    
    // KPI Metrics
    const totalEnrollments = filtered.length;
    const avgScore = completed.length > 0 
      ? Math.round(completed.reduce((acc, curr) => acc + (curr.score_percent || 0), 0) / completed.length)
      : 0;
    const completionRate = totalEnrollments > 0 ? Math.round((completed.length / totalEnrollments) * 100) : 0;     // 1. Ranking por Lojas (L3) / Regionais (L2) / Diretorias (L1)
    // Excluído mapeamento manual duplicado
    

    // 1. Ranking Hierárquico Robusto
    // Nível 3: Lojas/Unidades (L3)
    const storeRanking = orgUnits.map(unit => {
      const unitEnrollments = filtered.filter(e => {
        const u = users.find(usr => usr.id === e.user_id);
        return u?.org_unit_id === unit.id;
      });
      if (unitEnrollments.length === 0) return null;
      const comp = unitEnrollments.filter(e => e.status === 'COMPLETED');
      const score = comp.length > 0 ? comp.reduce((a, b) => a + (b.score_percent || 0), 0) / comp.length : 0;
      const completionRate = Math.round((comp.length / unitEnrollments.length) * 100);
      const parent = orgTopLevels.find(t => t.id === unit.parent_id);
      return { id: unit.id, name: unit.name, score: Math.round(score), completion: completionRate, enrollments: unitEnrollments.length, parentId: unit.parent_id, parentName: parent?.name || 'S/ Regional' };
    }).filter(Boolean);

    // Nível 2: Regionais (L2) - Quem é pai de unidades L3
    const regionalRanking = orgTopLevels.map(top => {
      const childUnitIds = orgUnits.filter(u => u.parent_id === top.id).map(u => u.id);
      const regionalEnrollments = filtered.filter(e => {
        const u = users.find(usr => usr.id === e.user_id);
        if (!u) return false;
        return u.org_top_level_id === top.id || (u.org_unit_id && childUnitIds.includes(u.org_unit_id));
      });
      if (regionalEnrollments.length === 0) return null;
      const comp = regionalEnrollments.filter(e => e.status === 'COMPLETED');
      const score = comp.length > 0 ? comp.reduce((a, b) => a + (b.score_percent || 0), 0) / comp.length : 0;
      const completionRate = Math.round((comp.length / regionalEnrollments.length) * 100);
      const parent = orgTopLevels.find(t => t.id === top.parent_id);
      return { id: top.id, name: top.name, score: Math.round(score), completion: completionRate, enrollments: regionalEnrollments.length, parentId: top.parent_id, parentName: parent?.name || 'S/ Diretoria' };
    }).filter(Boolean);

    // Nível 1: Diretorias (L1) - Quem está no topo (sem pai)
    const directorateRanking = orgTopLevels.filter(top => !top.parent_id).map(dir => {
      const childRegionalIds = orgTopLevels.filter(r => r.parent_id === dir.id).map(r => r.id);
      const childUnitIds = orgUnits.filter(u => u.parent_id === dir.id || (u.parent_id && childRegionalIds.includes(u.parent_id))).map(u => u.id);
      
      const dirEnrollments = filtered.filter(e => {
        const u = users.find(usr => usr.id === e.user_id);
        if (!u) return false;
        const isDirect = u.org_top_level_id === dir.id;
        const isFromChildRegional = u.org_top_level_id && childRegionalIds.includes(u.org_top_level_id);
        const isFromChildUnit = u.org_unit_id && childUnitIds.includes(u.org_unit_id);
        return isDirect || isFromChildRegional || isFromChildUnit;
      });

      if (dirEnrollments.length === 0) return null;
      const comp = dirEnrollments.filter(e => e.status === 'COMPLETED');
      const score = comp.length > 0 ? comp.reduce((a, b) => a + (b.score_percent || 0), 0) / comp.length : 0;
      const completionRate = Math.round((comp.length / dirEnrollments.length) * 100);
      return { id: dir.id, name: dir.name, score: Math.round(score), completion: completionRate, enrollments: dirEnrollments.length, parentName: 'Geral/Matriz' };
    }).filter(Boolean);
    
    // Nível GERAL (Empresa inteira)
    const generalRanking = [{
      id: 'general',
      name: company?.name || 'Global',
      score: avgScore,
      completion: completionRate,
      enrollments: totalEnrollments,
      parentName: 'Top Level'
    }];
    
    // Taxa de Conclusão por Curso
    const courseCompletionRanking = courses.map(c => {
       const results = filtered.filter(e => e.course_id === c.id);
       const comp = results.filter(e => e.status === 'COMPLETED');
       const cRate = results.length > 0 ? Math.round((comp.length / results.length) * 100) : 0;
       return { id: c.id, name: c.title, completion: cRate, enrollments: results.length };
    }).filter(e => e.enrollments > 0).sort((a, b) => b.completion - a.completion);

    // 2. Ranking de Perguntas (Erros/Acertos)s/Acertos)
    const questionStats = questions.map(q => {
      const qAnswers = answers.filter(a => a.question_id === q.id);
      const correct = qAnswers.filter(a => a.is_correct).length;
      const total = qAnswers.length;
      const errorRate = total > 0 ? Math.round(((total - correct) / total) * 100) : 0;
      return {
        id: q.id,
        text: q.question_text.length > 40 ? q.question_text.slice(0, 40) + '...' : q.question_text,
        fullText: q.question_text,
        errorRate,
        successRate: 100 - errorRate,
        total
      };
    }).sort((a, b) => questionSort === 'errors' ? b.errorRate - a.errorRate : b.successRate - a.successRate);

    // 3. Status de Usuários (Sinalização)
    const userStatusList = users.map(user => {
      const availableCourses = courses.filter(c => checkCourseAccess(c, user, orgUnits, orgTopLevels));
      const userEnrollments = enrollments.filter(e => e.user_id === user.id);
      
      const stats = availableCourses.map(course => {
        const enr = userEnrollments.find(e => e.course_id === course.id);
        return {
          courseId: course.id,
          title: course.title,
          status: enr ? enr.status : 'NOT_STARTED'
        };
      });

      const completedCount = stats.filter(s => s.status === 'COMPLETED').length;
      const total = stats.length;
      const compliance = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        ...user,
        stats,
        compliance,
        completedCount,
        total
      };
    }).sort((a, b) => a.compliance - b.compliance);

    // 4. Gráfico de Tendência (Ritmo)
    const trendMap: Record<string, { date: string; matr: number; concl: number }> = {};
    const daysToGen = dateRange === 'all' ? 30 : parseInt(dateRange);
    for (let i = daysToGen; i >= 0; i--) {
      const d = format(subDays(now, i), 'dd/MM');
      trendMap[d] = { date: d, matr: 0, concl: 0 };
    }
    filtered.forEach(e => {
      if (e.created_at) {
        const dObjMatr = new Date(e.created_at);
        if (!isNaN(dObjMatr.getTime())) {
          const dMatr = format(dObjMatr, 'dd/MM');
          if (trendMap[dMatr]) trendMap[dMatr].matr++;
        }
      }
      
      if (e.status === 'COMPLETED' && e.completed_at) {
        const dObjConcl = new Date(e.completed_at);
        if (!isNaN(dObjConcl.getTime())) {
          const dConcl = format(dObjConcl, 'dd/MM');
          if (trendMap[dConcl]) trendMap[dConcl].concl++;
        }
      }
    });

    return {
      totalEnrollments,
      avgScore,
      completionRate,
      storeRanking: storeRanking.sort((a, b) => b.score - a.score),
      regionalRanking: regionalRanking.sort((a, b) => b.score - a.score),
      directorateRanking: directorateRanking.sort((a, b) => b.score - a.score),
      generalRanking,
      courseCompletionRanking,
      questionStats,
      userStatusList,
      trendData: Object.values(trendMap),
      donutData: [
        { name: 'Concluídos', value: completed.length },
        { name: 'Em Andamento', value: inProgress.length }
      ].filter(d => d.value > 0)
    };
  }, [enrollments, answers, questions, courses, users, orgUnits, orgTopLevels, selectedCourseId, selectedUnitId, dateRange, now, startDate, questionSort]);

  // -- EXPORTS -- //
  const handleExportCSV = () => {
    if (!analytics) return;
    const wb = XLSX.utils.book_new();
    
    const granularData = enrollments.map(e => {
      const user = users.find(u => u.id === e.user_id);
      const course = courses.find(c => c.id === e.course_id);
      const unit = orgUnits.find(u => u.id === user?.org_unit_id);
      const regional = orgTopLevels.find(t => t.id === user?.org_top_level_id);
      return {
        'Usuário': user?.name || '-',
        'Email': user?.email || '-',
        'Regional/Diretoria': regional?.name || '-',
        'Unidade/Loja': unit?.name || '-',
        'Curso': course?.title || '-',
        'Status': e.status === 'COMPLETED' ? 'Concluído' : 'Em Andamento',
        'Nota (%)': e.score_percent || 0,
        'Início': e.started_at && !isNaN(new Date(e.started_at).getTime()) 
                   ? format(new Date(e.started_at), 'dd/MM/yyyy HH:mm') 
                   : '-',
        'Fim': e.completed_at && !isNaN(new Date(e.completed_at).getTime()) 
                 ? format(new Date(e.completed_at), 'dd/MM/yyyy HH:mm') 
                 : '-'
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(granularData), 'Relatório Granular');

    XLSX.writeFile(wb, `relatorio-cursos-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('Relatório Excel exportado!');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
          </div>
          <p className="text-white font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">Sincronizando Ecossistema de Dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
      
      {/* ── HEADER ── */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
              <BarChart3 size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-white drop-shadow-md">
              Course <span className="text-indigo-400">Analytics</span>
            </h1>
          </div>
          <p className="text-white font-black text-sm ml-1 opacity-90 drop-shadow-sm">Inteligência de treinamento, compliance e performance regional.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
           <div className="flex bg-white/5 rounded-xl p-1">
              {[
                { id: '7', label: '7D' },
                { id: '30', label: '30D' },
                { id: 'all', label: 'ALL' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setDateRange(p.id)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    dateRange === p.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
           </div>
           <Button onClick={handleExportCSV} className="bg-white text-slate-950 hover:bg-white/90 font-black text-[10px] uppercase tracking-wider px-6 h-10 rounded-xl transition-all hover:scale-105 shadow-xl">
             <DownloadCloud size={16} className="mr-2" /> Exportar Dados
           </Button>
        </div>
      </header>

      {/* ── FILTERS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <Input 
            placeholder="Buscar por colaborador..." 
            className="bg-white/5 border-white/20 h-12 pl-12 rounded-2xl text-sm font-bold placeholder:text-white/40 focus:ring-indigo-500/50"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <select 
            className="w-full bg-white/5 border border-white/10 h-12 pl-4 pr-10 rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-indigo-500/50"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            <option value="all" className="bg-slate-900">Todos os Treinamentos</option>
            {courses.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.title}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
        </div>

        <div className="relative">
          <select 
            className="w-full bg-white/5 border border-white/10 h-12 pl-4 pr-10 rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-indigo-500/50"
            value={selectedUnitId}
            onChange={e => setSelectedUnitId(e.target.value)}
          >
            <option value="all" className="bg-slate-900">Loja: Todas</option>
            {orgUnits.map(unit => (
              <option key={unit.id} value={unit.id} className="bg-slate-900">{unit.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-white/5 border border-white/10 p-1.5 rounded-2xl h-auto flex-wrap justify-start gap-1">
          {[
            { id: 'overview', icon: Activity, label: 'Geral' },
            { id: 'rankings', icon: Trophy, label: 'Rankings' },
            { id: 'questions', icon: HelpCircle, label: 'Perguntas' },
            { id: 'users', icon: UserCheck, label: 'Sinalização' },
            { id: 'detailed', icon: FileSpreadsheet, label: 'Tabela Granular' },
          ].map(t => (
            <TabsTrigger 
              key={t.id} 
              value={t.id}
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-400 rounded-xl px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <t.icon size={14} className="mr-2" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 1. ABA GERAL */}
        <TabsContent value="overview" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPIItem label="Matrículas" value={analytics?.totalEnrollments || 0} icon={Users} color="indigo" />
            <KPIItem label="Nota Média" value={`${analytics?.avgScore || 0}%`} icon={TrendingUp} color="emerald" />
            <KPIItem label="Compliance" value={`${analytics?.completionRate || 0}%`} icon={CheckCircle2} color="blue" />
            <KPIItem label="Cursos Ativos" value={courses.length} icon={BookOpen} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-white/[0.02] border-white/10 rounded-[32px] p-6 shadow-2xl">
              <CardHeader className="p-0 mb-8">
                <CardTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  <TrendingUp className="text-indigo-400" /> Fluxo de Engajamento
                </CardTitle>
                <p className="text-sm text-white font-black">Histórico diário de novos inscritos e conclusões.</p>
              </CardHeader>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics?.trendData}>
                    <defs>
                      <linearGradient id="colorMatr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorConcl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={11} fontWeight="black" stroke="#f1f5f9" />
                    <YAxis axisLine={false} tickLine={false} fontSize={11} fontWeight="black" stroke="#f1f5f9" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="matr" name="Matrículas" stroke="#6366f1" strokeWidth={4} fill="url(#colorMatr)" />
                    <Area type="monotone" dataKey="concl" name="Conclusões" stroke="#10b981" strokeWidth={4} fill="url(#colorConcl)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="bg-white/[0.02] border-white/10 rounded-[32px] p-6 shadow-2xl flex flex-col items-center">
              <CardHeader className="p-0 text-center mb-8 w-full">
                <CardTitle className="text-xl font-bold text-white">Estado das Trilhas</CardTitle>
                <p className="text-sm text-white font-black mt-1">Status atual de todas as matrículas.</p>
              </CardHeader>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.donutData}
                      cx="50%" cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {analytics?.donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Concluídos' ? '#10b981' : '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 w-full">
                  <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 text-center">
                    <p className="text-[10px] font-black text-emerald-400 uppercase">Concluídos</p>
                    <p className="text-xl font-black text-white">{analytics?.donutData?.find(d => d.name === 'Concluídos')?.value || 0}</p>
                  </div>
                  <div className="bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20 text-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Matriculados</p>
                    <p className="text-xl font-black text-white">{analytics?.donutData?.find(d => d.name === 'Em Andamento')?.value || 0}</p>
                  </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* 2. ABA RANKINGS */}
        <TabsContent value="rankings" className="space-y-8">
          {/* Primeira linha: Avaliação (Scores médios de quem completou) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RankingCard 
              title="Comparativo de Avaliação"
              subtitle="Performance Média (Nota Final) por nível."
              data={
                activeRankingLevel === 4 ? analytics?.generalRanking :
                activeRankingLevel === 3 ? analytics?.storeRanking : 
                activeRankingLevel === 2 ? analytics?.regionalRanking : 
                analytics?.directorateRanking
              }
              color="#6366f1"
              showLevelSelector={true}
              activeLevel={activeRankingLevel}
              onLevelChange={(lvl: number) => {
                if (lvl === 4) setIsOrgModalOpen(true);
                setActiveRankingLevel(lvl);
              }}
              dataKey="score"
              valueLabel="%"
            />
            
            <RankingCard 
              title="Avaliação por Cursos"
              subtitle="Desempenho Geral (Nota) no treinamento."
              data={courses.map(c => {
                const results = enrollments?.filter(e => e.course_id === c.id && e.status === 'COMPLETED');
                const avg = (results && results.length > 0) ? results.reduce((a, b) => a + (b.score_percent || 0), 0) / results.length : 0;
                return { id: c.id, name: c.title, score: Math.round(avg) };
              }).sort((a, b) => b.score - a.score)}
              color="#ec4899"
              dataKey="score"
              valueLabel="%"
            />
          </div>

          {/* Segunda linha: Taxa de Conclusão (Completaram vs Iniciaram) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RankingCard 
              title="Conclusão por Unidades"
              subtitle="Taxa de Conclusão de Trilhas por nível."
              data={
                activeCompletionLevel === 4 ? analytics?.generalRanking :
                activeCompletionLevel === 3 ? analytics?.storeRanking : 
                activeCompletionLevel === 2 ? analytics?.regionalRanking : 
                analytics?.directorateRanking
              }
              color="#10b981"
              showLevelSelector={true}
              activeLevel={activeCompletionLevel}
              onLevelChange={(lvl: number) => {
                if (lvl === 4) setIsOrgModalOpen(true);
                setActiveCompletionLevel(lvl);
              }}
              dataKey="completion"
              valueLabel="%"
            />
            
            <RankingCard 
              title="Conclusão por Curso"
              subtitle="Taxa de trilhas terminadas."
              data={analytics?.courseCompletionRanking}
              color="#f59e0b"
              dataKey="completion"
              valueLabel="%"
            />
          </div>
        </TabsContent>

        {/* 3. ABA PERGUNTAS */}
        <TabsContent value="questions" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 bg-white/[0.02] border-white/10 rounded-[32px] p-8">
              <CardHeader className="px-0 pt-0 mb-8">
                 <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl font-black flex items-center gap-3 text-white">
                        {questionSort === 'errors' ? <AlertTriangle className="text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> : <Trophy className="text-emerald-400" />} 
                        {questionSort === 'errors' ? 'Ranking de Atrito' : 'Ranking de Excelência'}
                      </CardTitle>
                      <p className="text-white text-sm mt-1 font-black">
                        {questionSort === 'errors' ? 'Perguntas com maior índice de erro na universidade.' : 'Perguntas com maior índice de acerto na universidade.'}
                      </p>
                    </div>
                    <Button 
                      onClick={() => setQuestionSort(prev => prev === 'errors' ? 'successes' : 'errors')}
                      className="bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest px-4"
                    >
                      {questionSort === 'errors' ? 'Ver por Acertos' : 'Ver por Erros'}
                    </Button>
                 </div>
              </CardHeader>

              <div className="space-y-6">
                {(analytics?.questionStats || []).slice(0, 10).map((q, i) => (
                  <div key={q.id} className="group relative">
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                         <span className="w-5 h-5 bg-white/10 flex items-center justify-center rounded text-[9px]">{i+1}</span>
                         {q.text}
                       </span>
                       <span className={`text-xs font-black ${questionSort === 'errors' ? 'text-rose-500' : 'text-emerald-500'}`}>
                         {questionSort === 'errors' ? `${q.errorRate}% erros` : `${q.successRate}% acertos`}
                       </span>
                    </div>
                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                       <div 
                         className={`h-full bg-gradient-to-r ${questionSort === 'errors' ? 'from-rose-600 to-rose-400' : 'from-emerald-600 to-emerald-400'} rounded-full transition-all duration-1000`}
                         style={{ width: `${questionSort === 'errors' ? q.errorRate : q.successRate}%` }}
                       />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] font-black text-white uppercase tracking-widest">
                       <span>Total de respostas: {q.total}</span>
                       <span className={questionSort === 'errors' ? 'text-emerald-400' : 'text-rose-400'}>
                         {questionSort === 'errors' ? `Sucesso: ${q.successRate}%` : `Erros: ${q.errorRate}%`}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
               <div className="bg-indigo-600/10 border border-indigo-600/20 p-8 rounded-[32px] space-y-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <HelpCircle className="text-white" />
                  </div>
                  <h4 className="text-xl font-black">Por que analisar perguntas?</h4>
                  <p className="text-sm text-indigo-100/70 leading-relaxed font-medium">
                    Questões com altos índices de erro (acima de 40%) indicam conteúdos que não foram bem absorvidos ou perguntas que podem estar ambíguas. Utilize esses dados para refinar seus módulos e scripts de apoio.
                  </p>
               </div>
            </div>
          </div>
        </TabsContent>

        {/* 4. ABA USUÁRIOS (SINALIZAÇÃO) */}
        <TabsContent value="users" className="space-y-8">
           <Card className="bg-white/[0.02] border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-8 border-b border-white/5 bg-white/[0.01]">
                 <h3 className="text-2xl font-black flex items-center gap-3 text-white">
                   <UserCheck className="text-emerald-400" /> Compliance Individual
                 </h3>
                 <p className="text-white text-sm mt-1 font-black">Acompanhe quem está em dia e quem possui pendências em sua regional.</p>
              </div>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white">
                          <th className="px-6 py-5">Colaborador</th>
                          <th className="px-6 py-5">Unidade / Regional</th>
                          <th className="px-6 py-5">Compliance</th>
                          <th className="px-6 py-5">Cursos (Status)</th>
                          <th className="px-6 py-5 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                       {analytics?.userStatusList.filter(u => 
                          (u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
                          (selectedUnitId === 'all' || u.org_unit_id === selectedUnitId)
                       ).map(u => {
                          const unit = orgUnits.find(un => un.id === u.org_unit_id);
                          const regional = orgTopLevels.find(rt => rt.id === u.org_top_level_id);
                          return (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-black uppercase">
                                      {u.name.slice(0, 2)}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black text-white">{u.name}</p>
                                      <p className="text-[10px] text-white font-black">{u.email}</p>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex flex-col gap-1">
                                   <span className="text-[10px] font-black uppercase text-white tracking-wider bg-white/10 w-fit px-2 py-0.5 rounded-md">
                                      {unit?.name || (company?.name ? `Matriz - ${company.name}` : 'S/ Unidade')}
                                   </span>
                                   <span className="text-[10px] text-indigo-200 font-bold ml-1">
                                      {regional?.name || orgTopLevels.find(t => t.id === unit?.parent_id)?.name || 'S/ Regional'}
                                   </span>
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="flex-1 h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${u.compliance >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : u.compliance >= 50 ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`}
                                        style={{ width: `${u.compliance}%` }} 
                                      />
                                   </div>
                                   <span className={`text-[10px] font-black ${u.compliance >= 80 ? 'text-emerald-500' : u.compliance >= 50 ? 'text-blue-500' : 'text-rose-500'}`}>
                                      {u.compliance}%
                                   </span>
                                </div>
                             </td>
                             <td className="px-6 py-5">
                                <div className="flex flex-wrap gap-2 max-w-[220px]">
                                   {u.stats.slice(0, 4).map((s: any) => (
                                      <CourseStatusTag 
                                        key={s.courseId} 
                                        status={s.status} 
                                        size="sm" 
                                        className="scale-90 origin-left"
                                        title={s.title}
                                      />
                                   ))}
                                   {u.stats.length > 4 && <span className="text-[9px] text-slate-400 font-black self-center">+{u.stats.length - 4}</span>}
                                </div>
                             </td>
                             <td className="px-6 py-5 text-right">
                                <Button 
                                  onClick={() => setSelectedUserForFile(u)}
                                  variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                >
                                   <Eye size={18} />
                                </Button>
                             </td>
                          </tr>
                       )})}
                    </tbody>
                 </table>
              </div>
           </Card>
        </TabsContent>

        {/* 5. ABA DETALHADA */}
        <TabsContent value="detailed" className="space-y-8">
           <Card className="bg-white/[0.02] border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Relatório Estruturado</h3>
                    <p className="text-white/90 text-sm mt-1 font-black">Visão granular de cada interação acadêmica.</p>
                 </div>
                 <Button onClick={handleExportCSV} className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-600/20 font-black text-[10px] uppercase">
                    <FileSpreadsheet size={16} className="mr-2" /> Planilha Completa
                 </Button>
              </div>

              <div className="overflow-x-auto min-h-[400px]">
                 <table className="w-full text-left whitespace-nowrap">
                   <thead>
                      <tr className="bg-white/[0.03] border-b border-white/5 text-[10px] uppercase font-black tracking-widest text-white">
                         <th className="px-6 py-5">Usuário</th>
                         <th className="px-6 py-5">Curso</th>
                         <th className="px-6 py-5">Status</th>
                         <th className="px-6 py-5">Performance (%)</th>
                         <th className="px-6 py-5">Data de Início</th>
                         <th className="px-6 py-5">Conclusão</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/[0.05]">
                      {enrollments?.filter(e => {
                        if (selectedCourseId !== 'all' && e.course_id !== selectedCourseId) return false;
                        const u = users.find(usr => usr.id === e.user_id);
                        if (selectedUnitId !== 'all' && u?.org_unit_id !== selectedUnitId) return false;
                        return u?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                      }).slice(0, 50).map(enroll => {
                        const user = users.find(u => u.id === enroll.user_id);
                        const course = courses.find(c => c.id === enroll.course_id);
                        return (
                          <tr key={enroll.id} className="hover:bg-white/[0.01] transition-colors">
                             <td className="px-6 py-4">
                                <div className="text-xs font-black text-white">{user?.name}</div>
                                <div className="text-[10px] text-white font-black">{user?.email}</div>
                             </td>
                             <td className="px-6 py-4 text-xs font-black text-white">{course?.title}</td>
                             <td className="px-6 py-4">
                                <CourseStatusTag status={enroll.status} size="sm" />
                             </td>
                             <td className="px-6 py-4">
                                <span className={`text-xs font-black ${enroll.score_percent && enroll.score_percent >= 70 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {enroll.score_percent || 0}%
                                </span>
                             </td>
                             <td className="px-6 py-4 text-[10px] text-white font-black">
                                {format(new Date(enroll.started_at), 'dd/MM/yyyy HH:mm')}
                             </td>
                             <td className="px-6 py-4 text-[10px] text-white font-black">
                                {enroll.completed_at ? format(new Date(enroll.completed_at), 'dd/MM/yyyy HH:mm') : '--'}
                             </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
              </div>
           </Card>
        </TabsContent>
      </Tabs>

      {/* Slide-over 360 do Usuário */}
      {selectedUserForFile && (
        <CourseUserFile 
          isOpen={!!selectedUserForFile}
          onClose={() => setSelectedUserForFile(null)}
          user={selectedUserForFile}
          unitName={orgUnits.find(u => u.id === selectedUserForFile.org_unit_id)?.name}
          regionName={
            orgTopLevels.find(t => t.id === selectedUserForFile.org_top_level_id)?.name || 
            orgTopLevels.find(t => t.id === orgUnits.find(u => u.id === selectedUserForFile.org_unit_id)?.parent_id)?.name
          }
          enrollments={enrollments}
          courses={courses}
        />
      )}

      {/* Slide-over 360 do Usuário */}
      <OrgChartModal 
        isOpen={isOrgModalOpen} 
        onClose={() => setIsOrgModalOpen(false)} 
        orgTopLevels={orgTopLevels} 
        orgUnits={orgUnits}
        companyName={company?.name || 'Companhia'}
        analytics={analytics}
      />
    </div>
  );
};

const KPIItem = ({ label, value, icon: Icon, color }: any) => {
  const colorMap: any = {
    indigo: 'from-indigo-600/10 text-indigo-500 border-indigo-500/20',
    emerald: 'from-emerald-600/10 text-emerald-500 border-emerald-500/20',
    blue: 'from-blue-600/10 text-blue-500 border-blue-500/20',
    amber: 'from-amber-600/10 text-amber-500 border-amber-500/20',
  };

  return (
    <Card className={`bg-white/[0.02] border-white/10 rounded-3xl p-6 shadow-xl relative overflow-hidden group`}>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-gradient-to-br ${colorMap[color]} opacity-0 group-hover:opacity-10 transition-opacity blur-2xl`} />
      <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} w-fit mb-4`}>
        <Icon size={20} />
      </div>
      <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{value}</p>
      <p className="text-[11px] font-black text-white uppercase tracking-widest mt-1">{label}</p>
    </Card>
  );
};

const RankingTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-white/20 p-3 rounded-xl shadow-2xl flex flex-col gap-1">
        <p className="text-white font-black text-sm">{label}</p>
        <p className="text-[10px] text-white/70 font-bold flex items-center gap-1 uppercase tracking-widest">
           Taxa: <span className="text-white ml-2 text-sm">{item.score !== undefined ? item.score : item.completion}%</span>
        </p>
        {item.parentName && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-[9px] text-indigo-400 uppercase font-black tracking-widest">Pertence a:</p>
            <p className="text-xs text-white/90 font-bold">{item.parentName}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

const RankingCard = ({ title, subtitle, data, color, showLevelSelector, activeLevel, onLevelChange, dataKey = 'score', valueLabel = '%' }: any) => {
  return (
    <Card className="bg-white/[0.02] border-white/10 rounded-[32px] p-8 shadow-2xl flex flex-col">
      <CardHeader className="px-0 pt-0 mb-8 border-b border-white/5 pb-6 flex flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-black text-white">{title}</CardTitle>
          <p className="text-sm text-white font-black">{subtitle}</p>
        </div>
        
        {showLevelSelector && (
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 shadow-inner flex-wrap gap-1">
            {[4, 1, 2, 3].map(lvl => (
              <button
                key={lvl}
                onClick={() => onLevelChange(lvl)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                  activeLevel === lvl 
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {lvl === 4 ? 'GERAL' : `NÍVEL ${lvl}`}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data?.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 60 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              fontSize={11} 
              fontWeight="900" 
              stroke="#ffffff" 
              width={140} 
            />
            <Tooltip content={<RankingTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)', rx: 12 }} />
            <Bar dataKey={dataKey} radius={[0, 12, 12, 0]} barSize={24} label={{ position: 'right', fill: '#fff', fontSize: 12, fontWeight: 'black', formatter: (v: any) => `${v}${valueLabel}` }}>
              {data?.slice(0, 10).map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - (index * 0.08)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Componente para desenhar o Organograma Dash (OrgChart)
const OrgChartModal = ({ isOpen, onClose, orgTopLevels, orgUnits, companyName, analytics }: any) => {
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpenNodes(p => ({ ...p, [id]: !p[id] }));

  const general = analytics?.generalRanking?.[0]; 
  const getDirData = (id: string) => analytics?.directorateRanking?.find((r: any) => r.id === id);
  const getRegData = (id: string) => analytics?.regionalRanking?.find((r: any) => r.id === id);
  const getStoreData = (id: string) => analytics?.storeRanking?.find((r: any) => r.id === id);

  const StatBadge = ({ title, value, type }: any) => (
    <div className={`flex flex-col items-end ${type === 'score' ? 'text-indigo-400' : 'text-emerald-400'}`}>
       <span className="text-[9px] uppercase tracking-widest font-black opacity-70">{title}</span>
       <span className="text-sm font-black">{value !== undefined ? `${value}%` : '--'}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1000px] w-[95vw] max-h-[85vh] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-white/10 text-white rounded-[32px] p-6 md:p-8 shadow-2xl">
        <DialogHeader className="mb-8">
          <DialogTitle className="text-2xl font-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                 <Building2 className="text-white" />
               </div>
               <div>
                  Estrutura Analítica: {companyName}
                  <p className="text-sm text-slate-400 font-bold mt-1 tracking-tight">Visão completa consolidada (Taxa de Conclusão e Score).</p>
               </div>
             </div>
          </DialogTitle>
        </DialogHeader>

        {/* Global Level (L0) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
           <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-4">Empresa (Globo)</p>
           
           <div className="flex flex-col lg:flex-row lg:gap-12 lg:items-center">
             <div className="flex-1 mb-4 lg:mb-0">
                <div className="flex justify-between items-end mb-2">
                   <h3 className="text-xl font-black text-white">{companyName} - Geral</h3>
                   <span className="text-indigo-300 font-black text-2xl">{general?.completion || 0}% <span className="text-xs text-indigo-500 tracking-widest uppercase">CONCL.</span></span>
                </div>
                <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full shadow-[0_0_10px_#6366f1]" style={{ width: `${general?.completion || 0}%` }} />
                </div>
             </div>
             
             <div className="flex gap-6 lg:gap-8 shrink-0 lg:border-l lg:border-white/10 lg:pl-8">
                <StatBadge title="Score Médio" value={general?.score} type="score" />
                <StatBadge title="Matrículas" value={general?.enrollments} type="emerald" />
             </div>
           </div>
        </div>

        <div className="space-y-4">
           {orgTopLevels?.filter((t: any) => !t.parent_id).map((dir: any) => {
             const dData = getDirData(dir.id);
             const isDirOpen = openNodes[dir.id];
             return (
               <div key={dir.id} className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-lg">
                  {/* DIRETORIA HEADER */}
                  <div 
                    onClick={() => toggle(dir.id)}
                    className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-colors gap-4"
                  >
                     <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 shrink-0 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center font-black">L1</div>
                        <h4 className="text-lg font-black text-white">{dir.name}</h4>
                     </div>
                     
                     <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto">
                        <div className="flex gap-6 border-r border-white/10 pr-6">
                          <StatBadge title="Conclusão" value={dData?.completion} type="emerald" />
                          <StatBadge title="Score" value={dData?.score} type="score" />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 shrink-0">
                          {isDirOpen ? <ChevronDown size={18} /> : <ChevronDown size={18} className="rotate-[270deg]" />}
                        </div>
                     </div>
                  </div>
                  
                  {/* DIRETORIA CHILDREN */}
                  {isDirOpen && (
                    <div className="p-4 md:p-5 border-t border-white/5 bg-slate-900/50 space-y-4">
                       
                       {/* Unidades L3 ligadas DIRETO a L1 */}
                       {orgUnits?.filter((u: any) => u.parent_id === dir.id).map((unit: any) => {
                         const uData = getStoreData(unit.id);
                         return (
                           <div key={unit.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-xl ml-0 md:ml-4">
                             <div className="flex items-center gap-3">
                               <div className="w-8 h-8 shrink-0 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center"><Store size={16} /></div>
                               <h5 className="text-sm font-black text-white flex flex-col">
                                 {unit.name} 
                                 <span className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-widest mt-0.5">Loja Direta</span>
                               </h5>
                             </div>
                             
                             <div className="flex-1 md:px-4">
                                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                                  <div className="absolute inset-y-0 left-0 bg-emerald-500/80 rounded-full" style={{ width: `${uData?.completion || 0}%` }} />
                                </div>
                             </div>
                             
                             <div className="flex gap-6 shrink-0 md:justify-end">
                               <StatBadge title="Conclusão" value={uData?.completion} type="emerald" />
                               <StatBadge title="Score" value={uData?.score} type="score" />
                             </div>
                           </div>
                         );
                       })}

                       {/* Regionais (L2) */}
                       {orgTopLevels?.filter((t: any) => t.parent_id === dir.id).map((reg: any) => {
                          const rData = getRegData(reg.id);
                          const isRegOpen = openNodes[reg.id];
                          return (
                            <div key={reg.id} className="ml-0 md:ml-4 bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">
                               <div 
                                 onClick={() => toggle(reg.id)}
                                 className="p-4 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-white/[0.05] transition-colors gap-3"
                               >
                                  <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 shrink-0 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center font-black text-xs"><Target size={14} /></div>
                                    <h5 className="text-sm font-black text-white flex flex-col">
                                      {reg.name}
                                      <span className="text-[9px] text-blue-400/70 uppercase font-bold tracking-widest mt-0.5">Regional</span>
                                    </h5>
                                  </div>
                                  
                                  <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 w-full md:w-auto">
                                     <div className="flex gap-6 border-r border-white/10 pr-6">
                                       <StatBadge title="Conclusão" value={rData?.completion} type="emerald" />
                                       <StatBadge title="Score" value={rData?.score} type="score" />
                                     </div>
                                     <div className="text-slate-400 w-8 h-8 shrink-0 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                                       {isRegOpen ? <ChevronDown size={14} /> : <ChevronDown size={14} className="rotate-[270deg]" />}
                                     </div>
                                  </div>
                               </div>

                               {/* Lojas Desta Regional (L3) */}
                               {isRegOpen && (
                                 <div className="p-3 md:p-4 border-t border-white/5 space-y-2 bg-black/20">
                                    {orgUnits?.filter((u: any) => u.parent_id === reg.id).map((unit: any) => {
                                      const sData = getStoreData(unit.id);
                                      return (
                                        <div key={unit.id} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-lg ml-2 md:ml-8 gap-3">
                                           <div className="flex items-center gap-3 flex-1 truncate">
                                              <Store size={14} className="text-emerald-400 shrink-0" />
                                              <h6 className="text-xs font-black text-slate-200 truncate">{unit.name}</h6>
                                           </div>
                                           <div className="hidden md:block flex-1 px-4 max-w-[120px] lg:max-w-[200px]">
                                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sData?.completion || 0}%` }} />
                                              </div>
                                           </div>
                                           <div className="flex gap-4 shrink-0 justify-end w-24 md:w-32">
                                              <StatBadge title="C" value={sData?.completion} type="emerald" />
                                              <StatBadge title="S" value={sData?.score} type="score" />
                                           </div>
                                        </div>
                                      );
                                    })}
                                    {orgUnits?.filter((u: any) => u.parent_id === reg.id).length === 0 && (
                                       <div className="text-xs text-slate-500 ml-4 md:ml-8 p-2 font-bold">Nenhuma loja associada a esta regional.</div>
                                    )}
                                 </div>
                               )}
                            </div>
                          );
                       })}
                    </div>
                  )}
               </div>
             );
           })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
