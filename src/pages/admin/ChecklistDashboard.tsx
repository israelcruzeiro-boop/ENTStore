import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useAllSubmissions, 
  useAllAnswers, 
  useChecklists,
  useAllActionPlans,
  useAllCompanyQuestions,
  checklistActions
} from '../../hooks/useChecklists';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers, useOrgStructure } from '../../hooks/useSupabaseData';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  ChevronLeft, 
  TrendingUp, 
  CheckCircle2, 
  ClipboardCheck,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Star,
  MapPin,
  Eye,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#10b981', '#f43f5e', '#ec4899', '#6366f1']; // Emerald, Rose, Pink, Indigo

export const AdminChecklistDashboard = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  
  const { checklists, isLoading: clsLoading } = useChecklists(company?.id);
  const { submissions, isLoading: subLoading } = useAllSubmissions(company?.id);
  const { answers, isLoading: ansLoading } = useAllAnswers(company?.id);

  const [selectedChecklist, setSelectedChecklist] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  const { actionPlans, isLoading: apLoading, mutate: mutateAP } = useAllActionPlans(company?.id);
  const { users } = useUsers(company?.id);
  const { questions: allQuestions, isLoading: questionsLoading } = useAllCompanyQuestions(company?.id);
  const { orgUnits } = useOrgStructure(company?.id);

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = dateRange === 'all' ? null : startOfDay(subDays(now, parseInt(dateRange)));
    
    // 1. Filtrar Submissões
    const filteredSubs = submissions.filter(s => {
      const matchChecklist = selectedChecklist === 'all' || s.checklist_id === selectedChecklist;
      const matchDate = !startDate || isWithinInterval(new Date(s.created_at), { start: startDate, end: endOfDay(now) });
      return matchChecklist && matchDate;
    });
    
    const completedSubs = filteredSubs.filter(s => s.status === 'COMPLETED');
    const subIds = new Set(filteredSubs.map(s => s.id));
    const filteredAnswers = answers.filter(a => subIds.has(a.submission_id));

    // 2. Classificação de Respostas por Tipo inferido
    const complianceAnswers = filteredAnswers.filter(a => ['C', 'NC', 'NA'].includes(a.value));
    const conforme = complianceAnswers.filter(a => a.value === 'C').length;
    const naoConforme = complianceAnswers.filter(a => a.value === 'NC').length;
    const na = complianceAnswers.filter(a => a.value === 'NA').length;
    
    const totalCompliance = conforme + naoConforme;
    const complianceRate = totalCompliance > 0 ? (conforme / totalCompliance) * 100 : 0;

    // Checks detectados (Se tem a string CHECKED, é um sucesso de checkbox)
    const checkeds = filteredAnswers.filter(a => a.value === 'CHECKED').length;

    // Ratings detectados (valores numéricos de 1 a 10 normalmente, ou maiores dependendo do slider)
    const ratingAnswers = filteredAnswers.filter(a => {
      const val = parseInt(a.value, 10);
      return !isNaN(val) && val >= 0 && val <= 100 && a.value.trim() !== '';
    });
    const averageRating = ratingAnswers.length > 0 
      ? ratingAnswers.reduce((acc, a) => acc + parseInt(a.value, 10), 0) / ratingAnswers.length 
      : 0;

    // 3. Dados para Donut Chart Global de Performance
    // Vamos mesclar Compliance e Checks para ver um "Sentimento Geral"
    const pieData = [
      { name: 'Conformes', value: conforme },
      { name: 'Inconformidades', value: naoConforme },
      { name: 'Tarefas Confirmadas', value: checkeds },
      { name: 'Não Avaliado', value: na }
    ].filter(d => d.value > 0);

    // 4. Tendência Temporal Integrada
    const historyMap: Record<string, { date: string, total: number, sucessos: number }> = {};
    const daysToGenerate = dateRange === 'all' ? 30 : parseInt(dateRange);
    
    for (let i = daysToGenerate; i >= 0; i--) {
      const dateKey = format(subDays(now, i), 'dd/MM');
      historyMap[dateKey] = { date: dateKey, total: 0, sucessos: 0 };
    }

    // Mistura de 'C' e 'CHECKED' como sucessos temporais da operação
    filteredAnswers.forEach(a => {
      const dateKey = format(new Date(a.created_at), 'dd/MM');
      if (historyMap[dateKey]) {
        if (['C', 'NC', 'CHECKED'].includes(a.value)) {
           historyMap[dateKey].total++;
           if (a.value === 'C' || a.value === 'CHECKED') historyMap[dateKey].sucessos++;
        }
      }
    });

    const trendData = Object.values(historyMap).map(d => ({
      date: d.date,
      rate: d.total > 0 ? Math.round((d.sucessos / d.total) * 100) : null
    }));

    // 5. Ranking de Pontos Críticos (Perguntas com mais NC)
    const failureMap: Record<string, { text: string, count: number }> = {};
    filteredAnswers.filter(a => a.value === 'NC').forEach(a => {
      const questionText = allQuestions.find(q => q.id === a.question_id)?.text || 'Pergunta sem título';
      if (!failureMap[a.question_id]) failureMap[a.question_id] = { text: questionText, count: 0 };
      failureMap[a.question_id].count++;
    });

    const topFailures = Object.values(failureMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);

    // 6. Performance por Unidade
    const unitMap: Record<string, { name: string, score: number, subTotal: number }> = {};
    completedSubs.forEach(s => {
      const unitId = s.org_unit_id || 'Global';
      const unitName = unitId === 'Global' ? 'Geral' : (orgUnits.find(u => u.id === unitId)?.name || 'Unidade');
      if (!unitMap[unitId]) unitMap[unitId] = { name: unitName, score: 0, subTotal: 0 };
      
      const subAns = filteredAnswers.filter(a => a.submission_id === s.id && ['C', 'NC', 'CHECKED'].includes(a.value));
      const successes = subAns.filter(a => a.value === 'C' || a.value === 'CHECKED').length;
      const rate = subAns.length > 0 ? (successes / subAns.length) * 100 : 0;
      
      unitMap[unitId].score += rate;
      unitMap[unitId].subTotal++;
    });

    const barData = Object.values(unitMap).map(u => ({
      name: u.name,
      rate: Math.round(u.score / u.subTotal)
    })).sort((a, b) => b.rate - a.rate).slice(0, 5);

    // 7. Checklists respondidos por Usuário
    const userCountMap: Record<string, { name: string, count: number }> = {};
    completedSubs.forEach(s => {
      const userId = s.user_id || 'unknown';
      const userName = users.find(u => u.id === userId)?.name || 'Usuário';
      if (!userCountMap[userId]) userCountMap[userId] = { name: userName, count: 0 };
      userCountMap[userId].count++;
    });
    const subsByUser = Object.values(userCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 8. Checklists respondidos por Unidade
    const unitCountMap: Record<string, { name: string, count: number }> = {};
    completedSubs.forEach(s => {
      const unitId = s.org_unit_id || 'Global';
      const unitName = unitId === 'Global' ? 'Geral' : (orgUnits.find(u => u.id === unitId)?.name || 'Unidade');
      if (!unitCountMap[unitId]) unitCountMap[unitId] = { name: unitName, count: 0 };
      unitCountMap[unitId].count++;
    });
    const subsByUnit = Object.values(unitCountMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // 9. Itens não preenchidos (Omissões)
    const unfilledMap: Record<string, { text: string, count: number }> = {};
    let totalQuestionsExpected = 0;
    let totalAnswersFound = 0;

    completedSubs.forEach(s => {
      const checklistQuestions = allQuestions.filter(q => q.checklist_id === s.checklist_id);
      const submissionAnswers = answers.filter(a => a.submission_id === s.id);
      
      totalQuestionsExpected += checklistQuestions.length;
      totalAnswersFound += submissionAnswers.length;

      checklistQuestions.forEach(q => {
        const hasAnswer = submissionAnswers.some(a => a.question_id === q.id && a.value !== null && a.value !== undefined && a.value !== '');
        if (!hasAnswer) {
          if (!unfilledMap[q.id]) unfilledMap[q.id] = { text: q.text, count: 0 };
          unfilledMap[q.id].count++;
        }
      });
    });

    const unfilledInsights = Object.values(unfilledMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const completionRate = totalQuestionsExpected > 0 
      ? (totalAnswersFound / totalQuestionsExpected) * 100 
      : 100;

    return {
      totalSubmissions: filteredSubs.length,
      completedRate: filteredSubs.length > 0 ? (completedSubs.length / filteredSubs.length) * 100 : 0,
      complianceRate,
      averageRating,
      checkeds,
      pieData,
      barData,
      trendData,
      topFailures,
      subsByUser,
      subsByUnit,
      unfilledInsights,
      completionRate
    };
  }, [submissions, answers, selectedChecklist, dateRange, allQuestions, orgUnits, users]);

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    
    const loadToast = toast.loading('Gerando dashboard analítico...');
    try {
      const originalBg = document.body.style.backgroundColor;
      document.body.style.backgroundColor = '#ffffff';

      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      document.body.style.backgroundColor = originalBg;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`dashboard-insight-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      toast.success('Dashboard exportado com sucesso!', { id: loadToast });
    } catch (err) {
      toast.error('Erro ao exportar PDF', { id: loadToast });
    }
  };

  if (clsLoading || subLoading || ansLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div id="dashboard-content" className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700 bg-slate-50/30 min-h-screen">
      
      {/* HEADER EXECUTIVO */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-4 border-b border-slate-100 no-print">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/${companySlug}/checklists`)} className="h-12 w-12 rounded-2xl bg-white border border-slate-200 shadow-sm hover:scale-105 transition-all">
             <ChevronLeft size={24} className="text-slate-700" />
           </Button>
           <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                Insight Center <Target className="text-indigo-600 ml-1" size={28} />
              </h1>
              <p className="text-slate-500 font-medium mt-1 text-sm">Controle de qualidade, auditorias e submissões operacionais.</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400 ml-2" />
              <select 
                value={selectedChecklist}
                onChange={(e) => setSelectedChecklist(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer tracking-wide w-[180px] truncate"
              >
                 <option value="all">Checklists: Todos</option>
                 {checklists.map(cl => (
                   <option key={cl.id} value={cl.id}>{cl.title}</option>
                 ))}
              </select>
           </div>

           <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <Calendar size={16} className="text-slate-400 mx-2" />
              {[
                { id: '7', label: '7D' },
                { id: '30', label: '30D' },
                { id: '90', label: '90D' },
                { id: 'all', label: 'ALL' }
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => setDateRange(period.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    dateRange === period.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {period.label}
                </button>
              ))}
           </div>

           <Button 
             onClick={exportPDF}
             className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-10 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 text-xs truncate"
           >
             <Download size={16} className="mr-2" /> Dashboard PDF
           </Button>
        </div>
      </header>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'Total Auditado', val: stats?.totalSubmissions, icon: ClipboardCheck, color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50', gradient: 'from-blue-500/10 to-transparent' },
          { label: 'Taxa Conformidade', val: `${Math.round(stats?.complianceRate || 0)}%`, icon: TrendingUp, color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', gradient: 'from-emerald-500/10 to-transparent' },
          { label: 'Tarefas Validadas', val: stats?.checkeds, icon: CheckCircle2, color: 'text-indigo-600', border: 'border-indigo-100', bg: 'bg-indigo-50', gradient: 'from-indigo-500/10 to-transparent' },
          { label: 'Score Avaliativo', val: (stats?.averageRating || 0).toFixed(1), icon: Star, color: 'text-amber-500', border: 'border-amber-100', bg: 'bg-amber-50', gradient: 'from-amber-500/10 to-transparent' }
        ].map((item, i) => (
          <Card key={i} className={`relative overflow-hidden border ${item.border} shadow-sm hover:shadow-xl transition-all duration-500 rounded-3xl bg-white group`}>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${item.gradient} rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-125`} />
            <CardContent className="p-6 relative z-10">
               <div className="flex items-center justify-between mb-6">
                  <div className={`p-3.5 rounded-2xl ${item.bg} ${item.color} shadow-inner`}>
                     <item.icon size={26} strokeWidth={2.5} />
                  </div>
               </div>
               <div>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{item.val}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.label}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRÁFICO TENDÊNCIA SUPERIOR */}
        <Card className="col-span-1 lg:col-span-2 border border-slate-200/60 shadow-sm rounded-3xl p-6 bg-white overflow-hidden relative">
          <CardHeader className="px-0 pt-0 mb-6 flex flex-row items-center justify-between z-10 relative">
             <div>
               <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" size={20} />
                  Crescimento Operacional
               </CardTitle>
               <p className="text-xs font-medium text-slate-500 mt-1">Acertos, conformidades e checks agrupados por data.</p>
             </div>
          </CardHeader>
          <div className="h-[320px] w-full z-10 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trendData || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickMargin={10} 
                  stroke="#94a3b8"
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   fontSize={10} 
                   fontWeight="bold" 
                   tickFormatter={(val) => `${val}%`}
                   stroke="#94a3b8"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#4f46e5" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorEvolution)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* DISTRIBUIÇÃO GLOBAL (DONUT) */}
        <Card className="col-span-1 border border-slate-200/60 shadow-sm rounded-3xl p-6 bg-white">
          <CardHeader className="px-0 pt-0 mb-2">
             <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Target className="text-emerald-500" size={20} />
                Composição de Resultados
             </CardTitle>
          </CardHeader>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.pieData || []}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={1500}
                  stroke="none"
                >
                  {(stats?.pieData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={40} 
                  iconType="circle" 
                  formatter={(value) => <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FALLOUT REPORT - TOP FALHAS */}
        <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white">
           <CardHeader className="px-0 pt-0 mb-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                   <AlertTriangle className="text-rose-500" size={20} />
                   Atenção Crítica
                </CardTitle>
                <p className="text-xs font-medium text-slate-500 mt-1">Pontos de avaliação com maiores falhas registradas.</p>
              </div>
           </CardHeader>
           <div className="space-y-3">
              {stats?.topFailures.length ? stats.topFailures.map((fail, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 hover:shadow-md hover:shadow-rose-100 transition-all group">
                   <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-rose-50 flex items-center justify-center text-slate-400 group-hover:text-rose-600 font-black text-sm border border-slate-200 group-hover:border-rose-200 transition-colors shrink-0">
                      #{i + 1}
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{fail.text}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Identificado em {fail.count} submissões</p>
                   </div>
                   <span className="px-3 py-1 rounded-lg bg-rose-50 text-rose-600 text-[10px] font-black tracking-widest border border-rose-100">REVÊ-LO</span>
                </div>
              )) : (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                   <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-4">
                     <CheckCircle2 size={32} />
                   </div>
                   <h4 className="text-sm font-bold text-slate-700">Tudo sob controle!</h4>
                   <p className="text-xs font-medium text-slate-500 mt-1">Nenhum ponto crítico recorrente foi detectado.</p>
                </div>
              )}
           </div>
        </Card>

        {/* PERFORMANCE POR UNIDADE */}
        <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white">
          <CardHeader className="px-0 pt-0 mb-6 flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <User className="text-indigo-500" size={20} />
                  Top Unidades/Operadores
               </CardTitle>
               <p className="text-xs font-medium text-slate-500 mt-1">Ranking de conversão geral por setor avaliado.</p>
             </div>
          </CardHeader>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.barData || []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={11} 
                  fontWeight="bold"
                  stroke="#64748b"
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', rx: 16 }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value}%`, 'Score Geral']}
                />
                <Bar 
                  dataKey="rate" 
                  radius={[4, 16, 16, 4]} 
                  barSize={20}
                >
                   {stats?.barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.rate >= 80 ? '#10b981' : entry.rate >= 50 ? '#6366f1' : '#f43f5e'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* CHECKLISTS RESPONDIDOS POR USUÁRIO E POR UNIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* POR USUÁRIO */}
        <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white">
          <CardHeader className="px-0 pt-0 mb-6">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <User className="text-blue-500" size={20} />
              Respondidos por Usuário
            </CardTitle>
            <p className="text-xs font-medium text-slate-500 mt-1">Quantidade de checklists finalizados por colaborador.</p>
          </CardHeader>
          <div className="h-[280px]">
            {stats?.subsByUser && stats.subsByUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subsByUser} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={11} 
                    fontWeight="bold"
                    stroke="#64748b"
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', rx: 16 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value}`, 'Checklists']}
                  />
                  <Bar dataKey="count" radius={[4, 16, 16, 4]} barSize={18} fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Nenhum dado disponível.</div>
            )}
          </div>
        </Card>

        {/* POR UNIDADE */}
        <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white">
          <CardHeader className="px-0 pt-0 mb-6">
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <MapPin className="text-emerald-500" size={20} />
              Respondidos por Unidade
            </CardTitle>
            <p className="text-xs font-medium text-slate-500 mt-1">Quantidade de checklists finalizados por unidade operacional.</p>
          </CardHeader>
          <div className="h-[280px]">
            {stats?.subsByUnit && stats.subsByUnit.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.subsByUnit} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f8fafc" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} fontSize={11} stroke="#94a3b8" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={11} 
                    fontWeight="bold"
                    stroke="#64748b"
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc', rx: 16 }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value}`, 'Checklists']}
                  />
                  <Bar dataKey="count" radius={[4, 16, 16, 4]} barSize={18} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-400">Nenhum dado disponível.</div>
            )}
          </div>
        </Card>
      </div>

      {/* INSIGHTS DE PREENCHIMENTO */}
      <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white mb-8">
        <CardHeader className="px-0 pt-0 mb-6 flex flex-row items-center justify-between">
           <div>
             <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Eye className="text-amber-500" size={20} />
                Omissões de Preenchimento
             </CardTitle>
             <p className="text-xs font-medium text-slate-500 mt-1">Perguntas frequentemente ignoradas em auditorias finalizadas.</p>
           </div>
           <div className="text-right">
              <div className="text-2xl font-black text-slate-900">{Math.round(stats?.completionRate || 0)}%</div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Taxa de Preenchimento</div>
           </div>
        </CardHeader>
        <div className="space-y-4">
           {stats?.unfilledInsights && stats.unfilledInsights.length > 0 ? (
             stats.unfilledInsights.map((item, idx) => (
               <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-xs font-black text-slate-400 group-hover:text-amber-600 transition-colors">
                        #{idx + 1}
                     </div>
                     <div className="max-w-[200px] md:max-w-xs">
                        <p className="text-sm font-bold text-slate-700 truncate">{item.text}</p>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-0.5">
                           ESQUECIDA EM {item.count} AUDITORIAS
                        </p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                        <Info size={14} />
                       </div>
                    </div>
                 </div>
               ))
             ) : (
               <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-4">
                     <CheckCircle2 size={24} />
                  </div>
                  <p className="text-sm font-bold text-slate-900">Preenchimento Perfeito</p>
                  <p className="text-xs text-slate-500">Nenhuma pergunta foi deixada em branco nas auditorias selecionadas.</p>
               </div>
             )}
          </div>
        </Card>

      {/* PLANOS DE AÇÃO */}
      <Card className="border border-slate-200/60 shadow-sm rounded-3xl p-6 md:p-8 bg-white">
        <CardHeader className="px-0 pt-0 mb-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="text-rose-500" size={20} />
              Planos de Ação
            </CardTitle>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Acompanhamento de todas as não conformidades com plano de ação atribuído.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              {actionPlans.filter(p => p.action_plan_status !== 'RESOLVED').length} pendentes
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Checklist</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Pergunta</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Criador</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Responsável</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Prazo</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {actionPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-400">Nenhum plano de ação registrado.</td>
                </tr>
              ) : (
                actionPlans.map(plan => {
                  const creatorName = users.find(u => u.id === (plan.action_plan_created_by || plan.checklist_submissions?.user_id))?.name || 'N/A';
                  const assigneeName = users.find(u => u.id === plan.assigned_user_id)?.name || 'N/A';
                  const isResolved = plan.action_plan_status === 'RESOLVED';
                  const isOverdue = plan.action_plan_due_date && !isResolved && new Date(plan.action_plan_due_date) < new Date();
                  const isUrgent = plan.action_plan_due_date && !isResolved && !isOverdue && 
                    (new Date(plan.action_plan_due_date).getTime() - new Date().getTime()) < 86400000;

                  return (
                    <tr key={plan.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${isResolved ? 'opacity-50' : ''}`}>
                      <td className="py-3 px-3 text-xs font-bold text-slate-700 max-w-[160px] truncate">
                        {plan.checklist_submissions?.checklists?.title || '—'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                        {plan.checklist_questions?.text || '—'}
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-slate-600">{creatorName}</td>
                      <td className="py-3 px-3 text-xs font-bold text-slate-800">{assigneeName}</td>
                      <td className="py-3 px-3 text-xs font-medium text-slate-600">
                        {plan.action_plan_due_date ? format(new Date(plan.action_plan_due_date), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="py-3 px-3">
                        {isResolved ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">Resolvido</span>
                        ) : isOverdue ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg animate-pulse">Atrasado</span>
                        ) : isUrgent ? (
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">Urgente</span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg">Pendente</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

    </div>
  );
};
