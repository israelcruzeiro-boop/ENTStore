import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useAllSubmissions, 
  useAllAnswers, 
  useChecklists 
} from '../../hooks/useChecklists';
import { useAuth } from '../../contexts/AuthContext';
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
  ArrowDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#22c55e', '#ef4444', '#71717a']; // Verde (C), Vermelho (NC), Cinza (NA)

export const AdminChecklistDashboard = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();
  
  const { checklists, isLoading: clsLoading } = useChecklists(company?.id);
  const { submissions, isLoading: subLoading } = useAllSubmissions(company?.id);
  const { answers, isLoading: ansLoading } = useAllAnswers(company?.id);

  // Filtros Avançados
  const [selectedChecklist, setSelectedChecklist] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30'); // Dias: 7, 30, 90, all

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = dateRange === 'all' ? null : startOfDay(subDays(now, parseInt(dateRange)));
    
    // 1. Filtrar Submissões por Checklist e Data
    const filteredSubs = submissions.filter(s => {
      const matchChecklist = selectedChecklist === 'all' || s.checklist_id === selectedChecklist;
      const matchDate = !startDate || isWithinInterval(new Date(s.created_at), { start: startDate, end: endOfDay(now) });
      return matchChecklist && matchDate;
    });
    
    const completedSubs = filteredSubs.filter(s => s.status === 'COMPLETED');
    
    // 2. Filtrar Respostas das Submissões Selecionadas
    const subIds = new Set(filteredSubs.map(s => s.id));
    const filteredAnswers = answers.filter(a => subIds.has(a.submission_id));

    // 3. Métricas de Conformidade
    const complianceAnswers = filteredAnswers.filter(a => ['C', 'NC', 'NA'].includes(a.value));
    const conforme = complianceAnswers.filter(a => a.value === 'C').length;
    const naoConforme = complianceAnswers.filter(a => a.value === 'NC').length;
    const na = complianceAnswers.filter(a => a.value === 'NA').length;
    
    const totalCompliance = conforme + naoConforme;
    const complianceRate = totalCompliance > 0 ? (conforme / totalCompliance) * 100 : 0;

    // 4. Médias (Rating)
    const ratingAnswers = filteredAnswers.filter(a => !isNaN(Number(a.value)) && a.value !== '');
    const averageRating = ratingAnswers.length > 0 
      ? ratingAnswers.reduce((acc, a) => acc + Number(a.value), 0) / ratingAnswers.length 
      : 0;

    // 5. Dados para Pizza
    const pieData = [
      { name: 'Conforme', value: conforme },
      { name: 'Não Conforme', value: naoConforme },
      { name: 'N/A', value: na }
    ];

    // 6. Tendência Temporal (Histórico)
    const historyMap: Record<string, { date: string, total: number, conforme: number }> = {};
    const daysToGenerate = dateRange === 'all' ? 30 : parseInt(dateRange);
    
    for (let i = daysToGenerate; i >= 0; i--) {
      const dateKey = format(subDays(now, i), 'dd/MM');
      historyMap[dateKey] = { date: dateKey, total: 0, conforme: 0 };
    }

    filteredAnswers.filter(a => ['C', 'NC'].includes(a.value)).forEach(a => {
      const dateKey = format(new Date(a.created_at), 'dd/MM');
      if (historyMap[dateKey]) {
        historyMap[dateKey].total++;
        if (a.value === 'C') historyMap[dateKey].conforme++;
      }
    });

    const trendData = Object.values(historyMap).map(d => ({
      date: d.date,
      rate: d.total > 0 ? Math.round((d.conforme / d.total) * 100) : null
    }));

    // 7. Top Falhas (Ranking de Perguntas com mais NC)
    const failureMap: Record<string, { text: string, count: number }> = {};
    filteredAnswers.filter(a => a.value === 'NC').forEach(a => {
      if (!failureMap[a.question_id]) {
        const qText = "Pergunta Desconhecida"; 
        failureMap[a.question_id] = { text: qText, count: 0 };
      }
      failureMap[a.question_id].count++;
    });

    const topFailures = Object.values(failureMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 8. Performance por Unidade
    const unitMap: Record<string, { name: string, total: number, conforme: number }> = {};
    completedSubs.forEach(s => {
      const unitId = s.org_unit_id || 'Geral';
      if (!unitMap[unitId]) unitMap[unitId] = { name: unitId.slice(0, 8), total: 0, conforme: 0 };
      
      const subAnswers = filteredAnswers.filter(a => a.submission_id === s.id && ['C', 'NC'].includes(a.value));
      unitMap[unitId].total += subAnswers.length;
      unitMap[unitId].conforme += subAnswers.filter(a => a.value === 'C').length;
    });

    const barData = Object.values(unitMap).map(u => ({
      name: u.name,
      rate: u.total > 0 ? Math.round((u.conforme / u.total) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    return {
      totalSubmissions: filteredSubs.length,
      completedRate: filteredSubs.length > 0 ? (completedSubs.length / filteredSubs.length) * 100 : 0,
      complianceRate,
      averageRating,
      pieData,
      barData,
      trendData,
      topFailures
    };
  }, [submissions, answers, selectedChecklist, dateRange]);

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;
    
    const loadToast = toast.loading('Gerando relatório magistral...');
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-checklists-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
      toast.success('Relatório exportado com sucesso!', { id: loadToast });
    } catch (err) {
      toast.error('Erro ao exportar PDF', { id: loadToast });
    }
  };

  if (clsLoading || subLoading || ansLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div id="dashboard-content" className="p-8 space-y-8 animate-in fade-in duration-700 bg-slate-50/50 min-h-screen">
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pb-2 no-print">
        <div className="flex items-center gap-4">
           <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/${companySlug}/checklists`)} className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 transition-all">
             <ChevronLeft size={24} className="text-slate-600" />
           </Button>
           <div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
                Insight Center <TrendingUp className="text-blue-600" size={32} />
              </h1>
              <p className="text-slate-500 font-bold ml-1 text-sm md:text-base">Monitoramento estratégico de conformidade e auditoria.</p>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           {/* Filtro de Checklist */}
           <div className="flex items-center gap-2 bg-white p-1 pr-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 flex items-center justify-center text-slate-400">
                 <Filter size={18} />
              </div>
              <select 
                value={selectedChecklist}
                onChange={(e) => setSelectedChecklist(e.target.value)}
                className="bg-transparent border-none font-black text-xs text-slate-700 outline-none cursor-pointer uppercase tracking-widest min-w-[150px]"
              >
                 <option value="all">Checklists: Todos</option>
                 {checklists.map(cl => (
                   <option key={cl.id} value={cl.id}>{cl.title}</option>
                 ))}
              </select>
           </div>

           {/* Filtro de Data */}
           <div className="flex items-center gap-2 bg-white p-1 pr-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 flex items-center justify-center text-slate-400">
                 <Calendar size={18} />
              </div>
              <div className="flex gap-1">
                 {[
                   { id: '7', label: '7D' },
                   { id: '30', label: '30D' },
                   { id: '90', label: '90D' },
                   { id: 'all', label: 'ALL' }
                 ].map(period => (
                   <button
                     key={period.id}
                     onClick={() => setDateRange(period.id)}
                     className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                       dateRange === period.id 
                       ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                       : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                     }`}
                   >
                     {period.label}
                   </button>
                 ))}
              </div>
           </div>

           <Button 
             onClick={exportPDF}
             className="bg-slate-900 hover:bg-black text-white font-black px-6 h-12 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-95 border-none text-xs uppercase tracking-widest"
           >
             <Download size={18} className="mr-2 text-blue-400" /> Exportar PDF
           </Button>
        </div>
      </header>

      {/* Grid de Cards Magistrais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Submissões', val: stats?.totalSubmissions, icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-50', trend: '+12%', isUp: true },
          { label: 'Auditorias Fim', val: `${Math.round(stats?.completedRate || 0)}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', trend: '+5%', isUp: true },
          { label: 'Conformidade', val: `${Math.round(stats?.complianceRate || 0)}%`, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50', trend: '-2%', isUp: false },
          { label: 'Média Score', val: (stats?.averageRating || 0).toFixed(1), icon: ArrowUpRight, color: 'text-amber-500', bg: 'bg-amber-50', trend: '+0.4', isUp: true }
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-2xl transition-all rounded-[32px] overflow-hidden group bg-white border border-slate-100/50">
            <CardContent className="p-6">
               <div className="flex items-center justify-between mb-4">
                  <div className={`p-4 rounded-[22px] ${item.bg} ${item.color} transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                     <item.icon size={28} />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${item.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                     {item.isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {item.trend}
                  </div>
               </div>
               <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">{item.val}</p>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tendência Temporal */}
        <Card className="col-span-1 lg:col-span-2 border-none shadow-sm rounded-[40px] p-8 bg-white border border-slate-100/50">
          <CardHeader className="px-0 pt-0 mb-8 flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  Tendência de Conformidade
               </CardTitle>
               <p className="text-xs font-bold text-slate-400 mt-1">Evolução do percentual de acerto ao longo do período.</p>
             </div>
             <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
                <TrendingUp size={24} />
             </div>
          </CardHeader>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trendData || []}>
                <defs>
                  <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="black" 
                  tickMargin={15} 
                  stroke="#94a3b8"
                />
                <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   fontSize={10} 
                   fontWeight="black" 
                   tickFormatter={(val) => `${val}%`}
                   stroke="#94a3b8"
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563eb" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorRate)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Mix de Conformidade (Donut) */}
        <Card className="col-span-1 border-none shadow-sm rounded-[40px] p-8 bg-white border border-slate-100/50">
          <CardHeader className="px-0 pt-0 mb-8">
             <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Status Geral
             </CardTitle>
          </CardHeader>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.pieData || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={10}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {(stats?.pieData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Falhas */}
        <Card className="border-none shadow-sm rounded-[40px] p-8 bg-white border border-slate-100/50">
           <CardHeader className="px-0 pt-0 mb-8 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
                   Top Pontos Críticos
                </CardTitle>
                <p className="text-xs font-bold text-slate-400 mt-1">Perguntas com maior índice de não-conformidade.</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-500">
                 <AlertTriangle size={24} />
              </div>
           </CardHeader>
           <div className="space-y-4">
              {stats?.topFailures.length ? stats.topFailures.map((fail, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100 group hover:bg-rose-50/50 transition-all">
                   <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-rose-600 font-black text-sm shadow-sm">
                      {i + 1}
                   </div>
                   <div className="flex-1">
                      <p className="text-xs font-black text-slate-800 line-clamp-1">{fail.text}</p>
                      <p className="text-[10px] font-bold text-slate-400">Ocorrência em {fail.count} auditorias</p>
                   </div>
                   <div className="text-right">
                      <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-600 text-[10px] font-black">CRÍTICO</span>
                   </div>
                </div>
              )) : (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-50">
                   <CheckCircle2 size={40} className="text-emerald-500 mb-4" />
                   <p className="text-xs font-bold text-slate-500">Nenhum ponto crítico detectado no período.</p>
                </div>
              )}
           </div>
        </Card>

        {/* Unidades por Performance */}
        <Card className="border-none shadow-sm rounded-[40px] p-8 bg-white border border-slate-100/50">
          <CardHeader className="px-0 pt-0 mb-8 flex flex-row items-center justify-between">
             <div>
               <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                  Performance por Unidade
               </CardTitle>
               <p className="text-xs font-bold text-slate-400 mt-1">Comparativo de conformidade entre lojas e regionais.</p>
             </div>
             <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <User size={24} />
             </div>
          </CardHeader>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.barData || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide domain={[0, 100]} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  fontWeight="black"
                  stroke="#94a3b8"
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value}%`, 'Conformidade']}
                />
                <Bar 
                  dataKey="rate" 
                  radius={[0, 10, 10, 0]} 
                  barSize={24}
                >
                   {stats?.barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.rate > 85 ? '#10b981' : entry.rate > 60 ? '#6366f1' : '#f59e0b'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-sm rounded-[32px] p-8 bg-white no-print">
         <CardHeader className="px-0 pt-0 mb-6">
            <CardTitle className="text-lg font-black flex items-center gap-3">
               <TrendingUp size={20} className="text-emerald-500" />
               Visão Estratégica
            </CardTitle>
         </CardHeader>
         <div className="py-24 flex flex-col items-center justify-center text-center bg-slate-50/50 rounded-[32px] border border-slate-100">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-slate-300 mb-6 shadow-sm">
               <TrendingUp size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Evolução Histórica</h3>
            <p className="text-slate-500 max-w-sm mb-8">Esta seção exibirá o crescimento da conformidade mensal assim que mais dados forem processados.</p>
            <Button variant="outline" className="rounded-xl border-slate-200 text-slate-500">Agendar Relatório PDF</Button>
         </div>
      </Card>
    </div>
  );
};
