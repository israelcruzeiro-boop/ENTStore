import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useAllSubmissions, 
  useAllAnswers, 
  useChecklists,
  useAllActionPlans,
  useAllCompanyQuestions,
  useUserChecklistHistory,
  useChecklistDetailedAnswers
} from '../../hooks/useChecklists';
import { useAuth } from '../../contexts/AuthContext';
import { useUsers, useOrgStructure, useUserCourseHistory, useCompanies } from '../../hooks/useSupabaseData';
import { UserProfileCard } from '../../components/admin/UserProfileCard';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  ChevronLeft, TrendingUp, ClipboardCheck, Filter, Download,
  AlertTriangle, User, Target, Trophy,
  FileSpreadsheet, Users, Search, Activity,
  ArrowRight, LayoutDashboard, Database, UserCheck, Zap, Layers,
  ChevronDown, Building2, Store, CheckCircle2, Eye, FileText
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const SURREAL_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#06b6d4', // Cyan
  '#10b981'  // Emerald
];

const colorMap: any = {
  indigo: 'from-indigo-600 to-indigo-400',
  emerald: 'from-emerald-600 to-emerald-400',
  rose: 'from-rose-600 to-rose-400',
  amber: 'from-amber-600 to-amber-400'
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
        <p className="text-[10px] text-indigo-300 font-bold flex items-center gap-1 uppercase tracking-widest mt-1">
           Volume: <span className="text-indigo-200 ml-1">{item.submissions} envios</span>
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

export const AdminChecklistDashboard = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { companies, isLoading: companiesLoading } = useCompanies();

  // Resolve target company from URL
  const targetCompany = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  const companyId = targetCompany?.id;
  
  // Data Hooks - Using resolved companyId
  const { checklists, isLoading: clsLoading } = useChecklists(companyId);
  const { submissions, isLoading: subLoading } = useAllSubmissions(companyId);
  const { answers, isLoading: ansLoading } = useAllAnswers(companyId);
  const { users, isLoading: usersLoading } = useUsers(companyId);
  const { questions: allQuestions } = useAllCompanyQuestions(companyId);
  const { orgTopLevels, orgUnits, isLoading: orgLoading } = useOrgStructure(companyId);
  const { detailedAnswers, isLoading: detLoading } = useChecklistDetailedAnswers(companyId);
  
  const isLoading = companiesLoading || clsLoading || subLoading || ansLoading || usersLoading || orgLoading || detLoading;

  // States
  const [selectedChecklist, setSelectedChecklist] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'ranking' | 'users'>('overview');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSearchText, setUserSearchText] = useState('');
  const [answerFilter, setAnswerFilter] = useState('');

  // Dashboard Insights States
  const [activeLevelConformity, setActiveLevelConformity] = useState(3);
  const [activeLevelCompletion, setActiveLevelCompletion] = useState(3);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);

  // Drill-down hooks
  const { history: userChecklistHistory } = useUserChecklistHistory(selectedUserId || undefined, companyId);
  const { history: userCourseHistory } = useUserCourseHistory(selectedUserId || undefined, companyId);

  // ── CORE STATS ENGINE ──
  const stats = useMemo(() => {
    if (!submissions || !answers || !users) return null;

    const now = new Date();
    const startDate = dateRange === 'all' ? null : startOfDay(subDays(now, parseInt(dateRange)));
    
    // Preliminary filtering
    const filteredSubs = submissions.filter(s => {
      const matchChecklist = selectedChecklist === 'all' || s.checklist_id === selectedChecklist;
      const matchDate = !startDate || isWithinInterval(new Date(s.created_at), { start: startDate, end: endOfDay(now) });
      return matchChecklist && matchDate;
    });
    
    const completedSubs = filteredSubs.filter(s => s.status === 'COMPLETED');
    const subIds = new Set(filteredSubs.map(s => s.id));
    const filteredAnswers = answers.filter(a => subIds.has(a.submission_id));

    // Compliance Logic
    const compAns = filteredAnswers.filter(a => ['C', 'NC', 'CHECKED'].includes(a.value));
    const totalC = compAns.filter(a => a.value === 'C' || a.value === 'CHECKED').length;
    const totalNC = compAns.filter(a => a.value === 'NC').length;
    const complianceRate = (totalC + totalNC) > 0 ? (totalC / (totalC + totalNC)) * 100 : 0;

    // Users Not Started
    const staffUsers = users.filter(u => u.role === 'USER');
    const usersWithSubs = new Set(submissions.map(s => s.user_id));
    const usersNotStarted = staffUsers.filter(u => !usersWithSubs.has(u.id));

    // ESTRUTURAÇÃO ESTRATÉGICA DOS 4 NÍVEIS
    const unitMap: Record<string, { id: string, name: string, score: number, expectedFiles: number, actualFiles: number, parentName?: string }> = {};
    const regionalMap: Record<string, { id: string, name: string, score: number, expectedFiles: number, actualFiles: number }> = {};
    const directorateMap: Record<string, { id: string, name: string, score: number, expectedFiles: number, actualFiles: number }> = {};
    const clMap: Record<string, { id: string, name: string, score: number, expectedFiles: number, actualFiles: number }> = {};

    // 1. Processar score das submissões completas
    completedSubs.forEach(s => {
       const uId = s.org_unit_id || 'unassigned';
       const unit = orgUnits.find(u => u.id === uId);
       const name = unit?.name || 'Sem Unidade';
       
       if (!unitMap[uId]) unitMap[uId] = { id: uId, name, score: 0, expectedFiles: 0, actualFiles: 0, parentName: orgTopLevels.find(t => t.id === unit?.parent_id)?.name };
       
       const sAns = filteredAnswers.filter(a => a.submission_id === s.id && ['C', 'NC', 'CHECKED'].includes(a.value));
       const sC = sAns.filter(a => a.value === 'C' || a.value === 'CHECKED').length;
       const sRate = sAns.length > 0 ? (sC / sAns.length) * 100 : 0;
       
       unitMap[uId].score += sRate;
       
       // propagate to regional
       const rId = unit?.parent_id || 'unassigned_reg';
       const region = orgTopLevels.find(t => t.id === rId);
       const rName = region?.name || 'Sem Regional';
       if (!regionalMap[rId]) regionalMap[rId] = { id: rId, name: rName, score: 0, expectedFiles: 0, actualFiles: 0 };
       regionalMap[rId].score += sRate;

       // propagate to directorate
       const dirId = region?.parent_id || 'unassigned_dir';
       const dir = orgTopLevels.find(t => t.id === dirId);
       const dName = dir?.name || 'Sem Diretoria';
       if (!directorateMap[dirId]) directorateMap[dirId] = { id: dirId, name: dName, score: 0, expectedFiles: 0, actualFiles: 0 };
       directorateMap[dirId].score += sRate;

       // checklist map metric score
       const cId = s.checklist_id;
       const cl = checklists.find(c => c.id === cId);
       if (!clMap[cId]) clMap[cId] = { id: cId, name: cl?.title || 'Checklist', score: 0, expectedFiles: 0, actualFiles: 0 };
       clMap[cId].score += sRate;
    });

    // 2. Count ALL filterd subs to calculate Completion (Completed vs Total Started)
    filteredSubs.forEach(s => {
       const uId = s.org_unit_id || 'unassigned';
       const unit = orgUnits.find(u => u.id === uId);
       const rId = unit?.parent_id || 'unassigned_reg';
       const region = orgTopLevels.find(t => t.id === rId);
       const dirId = region?.parent_id || 'unassigned_dir';
       const cId = s.checklist_id;

       if (unitMap[uId]) unitMap[uId].expectedFiles++;
       if (regionalMap[rId]) regionalMap[rId].expectedFiles++;
       if (directorateMap[dirId]) directorateMap[dirId].expectedFiles++;
       
       if (!clMap[cId]) clMap[cId] = { id: cId, name: checklists.find(c => c.id === cId)?.title || 'Checklist', score: 0, expectedFiles: 0, actualFiles: 0 };
       clMap[cId].expectedFiles++;
       
       if (s.status === 'COMPLETED') {
          if (unitMap[uId]) unitMap[uId].actualFiles++;
          if (regionalMap[rId]) regionalMap[rId].actualFiles++;
          if (directorateMap[dirId]) directorateMap[dirId].actualFiles++;
          if (clMap[cId]) clMap[cId].actualFiles++;
       }
    });

    const storeRanking = Object.values(unitMap).map(u => ({
       id: u.id, name: u.name, parentName: u.parentName,
       score: u.actualFiles > 0 ? Math.round(u.score / u.actualFiles) : 0,
       completion: u.expectedFiles > 0 ? Math.round((u.actualFiles / u.expectedFiles) * 100) : 0,
       submissions: u.actualFiles
    })).sort((a, b) => b.score - a.score);

    const regionalRanking = Object.values(regionalMap).map(r => ({
       id: r.id, name: r.name,
       score: r.actualFiles > 0 ? Math.round(r.score / r.actualFiles) : 0,
       completion: r.expectedFiles > 0 ? Math.round((r.actualFiles / r.expectedFiles) * 100) : 0,
       submissions: r.actualFiles
    })).sort((a, b) => b.score - a.score);

    const directorateRanking = Object.values(directorateMap).map(d => ({
       id: d.id, name: d.name,
       score: d.actualFiles > 0 ? Math.round(d.score / d.actualFiles) : 0,
       completion: d.expectedFiles > 0 ? Math.round((d.actualFiles / d.expectedFiles) * 100) : 0,
       submissions: d.actualFiles
    })).sort((a, b) => b.score - a.score);

    const checklistRankingData = Object.values(clMap).map(c => ({
       id: c.id, name: c.name,
       score: c.actualFiles > 0 ? Math.round(c.score / c.actualFiles) : 0,
       completion: c.expectedFiles > 0 ? Math.round((c.actualFiles / c.expectedFiles) * 100) : 0,
       submissions: c.actualFiles
    })).sort((a, b) => b.completion - a.completion);

    const generalRanking = [{
       id: 'all', name: 'GERAL',
       score: Math.round(complianceRate),
       completion: filteredSubs.length > 0 ? Math.round((completedSubs.length / filteredSubs.length) * 100) : 0,
       submissions: completedSubs.length,
       enrollments: filteredSubs.length
    }];

    // Trend Logic
    const historyMap: Record<string, { date: string, count: number, conform: number }> = {};
    const lookback = dateRange === 'all' ? 30 : parseInt(dateRange);
    for (let i = lookback; i >= 0; i--) {
      const d = format(subDays(now, i), 'dd/MM');
      historyMap[d] = { date: d, count: 0, conform: 0 };
    }

    filteredAnswers.forEach(a => {
      const d = format(new Date(a.created_at), 'dd/MM');
      if (historyMap[d] && ['C', 'NC', 'CHECKED'].includes(a.value)) {
        historyMap[d].count++;
        if (a.value === 'C' || a.value === 'CHECKED') historyMap[d].conform++;
      }
    });

    const trendData = Object.values(historyMap).map(h => ({
      name: h.date,
      conformidade: h.count > 0 ? Math.round((h.conform / h.count) * 100) : null
    }));

    // Top Failures
    const failureMap: Record<string, { text: string, count: number }> = {};
    filteredAnswers.filter(a => a.value === 'NC').forEach(a => {
      const q = allQuestions.find(q => q.id === a.question_id);
      if (!q) return;
      if (!failureMap[q.id]) failureMap[q.id] = { text: q.text, count: 0 };
      failureMap[q.id].count++;
    });
    const topFailures = Object.values(failureMap).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      totalSubmissions: filteredSubs.length,
      completedSubmissions: completedSubs.length,
      complianceRate: Math.round(complianceRate),
      usersNotStarted: usersNotStarted.length,
      generalRanking,
      directorateRanking,
      regionalRanking,
      storeRanking,
      checklistRankingData,
      trendData,
      topFailures,
      activeUserCount: staffUsers.length,
      donutData: [
        { name: 'Conforme', value: totalC },
        { name: 'Não Conforme', value: totalNC }
      ]
    };
  }, [submissions, answers, users, dateRange, selectedChecklist, allQuestions, orgUnits, orgTopLevels]);

  // Handle Export
  const handleExportFull = () => {
    const dashboardElement = document.getElementById('dashboard-content');
    if (!dashboardElement) return;

    html2canvas(dashboardElement, { scale: 2, backgroundColor: '#0f172a' }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Checklist_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
      toast.success('Relatório exportado com sucesso!');
    });
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(detailedAnswers.map(ans => {
      const cl = checklists.find(c => c.id === ans.checklist_submissions?.checklist_id);
      const user = users.find(u => u.id === ans.checklist_submissions?.user_id);
      return {
        'ID Submissão': ans.submission_id,
        'Data': format(new Date(ans.created_at), 'dd/MM/yyyy HH:mm'),
        'Checklist': cl?.title || 'N/A',
        'Usuário': user?.name || 'Anônimo',
        'Pergunta': ans.checklist_questions?.text || 'N/A',
        'Resposta': ans.value,
        'Observação': ans.note || '',
        'Status Plano Ação': ans.action_plan_status || 'N/A'
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Respostas');
    XLSX.writeFile(wb, `Analitico_Respostas_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xl font-black text-slate-200 animate-pulse uppercase tracking-widest">Sincronizando Dados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8 font-sans transition-all duration-700" id="dashboard-content">
      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase tracking-[0.3em]">
            <Activity size={14} /> Analytics Engine v4.0
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
            {targetCompany?.name || 'Checklist'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Hub</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative group overflow-hidden rounded-2xl bg-white/5 border border-white/10 focus-within:border-indigo-500/50 transition-all">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
             <select 
               value={selectedChecklist}
               onChange={(e) => setSelectedChecklist(e.target.value)}
               className="bg-[#1e293b] text-slate-200 text-sm font-bold pl-10 pr-4 py-3 outline-none appearance-none min-w-[200px] border-none"
             >
               <option value="all">Todos os Formulários</option>
               {(checklists || []).map(cl => <option key={cl.id} value={cl.id}>{cl.title}</option>)}
             </select>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
             {['7', '30', '90', 'all'].map(period => (
               <button
                 key={period}
                 onClick={() => setDateRange(period)}
                 className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                   dateRange === period 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-400 hover:text-white'
                 }`}
               >
                 {period === 'all' ? 'TUDO' : `${period}D`}
               </button>
             ))}
          </div>

          <Button 
            onClick={handleExportFull}
            className="bg-white text-slate-900 hover:bg-slate-200 font-black rounded-2xl gap-2 transition-transform hover:scale-105"
          >
            <Download size={18} /> RELATÓRIO PDF
          </Button>
        </div>
      </div>

      {/* ── TOP NAV ── */}
      <div className="flex gap-1 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-white/5">
         {[
           { id: 'overview', label: 'VISÃO GERAL', icon: LayoutDashboard },
           { id: 'analytics', label: 'ANÁLISE DETALHADA', icon: Database },
           { id: 'ranking', label: 'RANKINGS & LOJAS', icon: Trophy },
           { id: 'users', label: 'PERFIL & COLABORADOR', icon: UserCheck }
         ].map(tab => (
           <button
             key={tab.id}
             onClick={() => { (setActiveTab as (t: string) => void)(tab.id); setSelectedUserId(null); }}
             className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs tracking-widest transition-all shrink-0 ${
               activeTab === tab.id 
                ? 'bg-indigo-600/20 text-indigo-400 border-b-2 border-indigo-500' 
                : 'text-slate-500 hover:text-slate-300'
             }`}
           >
             <tab.icon size={16} /> {tab.label}
           </button>
         ))}
      </div>

      {/* ── CONTENT SWITCHER ── */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden group hover:bg-white/10 transition-all border shadow-none">
                 <CardContent className="p-8">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Layers size={24} /></div>
                      <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Fichas</span>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-4xl font-black text-white">{stats?.totalSubmissions || 0}</h4>
                      <p className="text-xs font-bold text-slate-200">Total de submissões registradas</p>
                   </div>
                 </CardContent>
               </Card>
               <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden group hover:bg-white/10 transition-all border shadow-none">
                 <CardContent className="p-8">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><Zap size={24} /></div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                        <TrendingUp size={10} /> +12%
                      </div>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-4xl font-black text-white">{stats?.complianceRate || 0}%</h4>
                      <p className="text-xs font-bold text-slate-200">Nota média de conformidade</p>
                   </div>
                 </CardContent>
               </Card>
               <Card className="bg-white/5 border-white/10 rounded-[32px] overflow-hidden group hover:bg-white/10 transition-all border shadow-none">
                 <CardContent className="p-8">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400"><AlertTriangle size={24} /></div>
                      <span className="px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase">Crítico</span>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-4xl font-black text-white">{stats?.topFailures?.length || 0}</h4>
                      <p className="text-xs font-bold text-slate-200">Perguntas com alta inconformidade</p>
                   </div>
                 </CardContent>
               </Card>
               <Card className="bg-gradient-to-br from-indigo-700 to-purple-800 border-none rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all shadow-xl shadow-indigo-900/20">
                 <CardContent className="p-8">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-white/20 rounded-2xl text-white"><Users size={24} /></div>
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-4xl font-black text-white">{stats?.usersNotStarted || 0}</h4>
                      <p className="text-xs font-bold text-white/90">Membros sem atividade</p>
                   </div>
                   <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                         <div 
                           className="bg-white h-full rounded-full transition-all duration-1000" 
                           style={{ width: `${Math.round(( (stats?.activeUserCount || 0) - (stats?.usersNotStarted || 0)) / (stats?.activeUserCount || 1) * 100)}%` }} 
                         />
                      </div>
                   </div>
                 </CardContent>
               </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <Card className="lg:col-span-2 bg-white/5 border-white/10 rounded-[32px] shadow-none overflow-hidden">
                 <CardHeader className="p-8 border-b border-white/5">
                   <CardTitle className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                     <TrendingUp className="text-indigo-400" /> Tendência de Conformidade (%)
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 h-[350px]">
                   <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={stats?.trendData}>
                       <defs>
                         <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 700}} />
                       <YAxis hide domain={[0, 100]} />
                       <Tooltip 
                         contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '16px', color: '#f1f5f9', fontWeight: 900}}
                         itemStyle={{color: '#818cf8'}}
                       />
                       <Area type="monotone" dataKey="conformidade" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorRate)" />
                     </AreaChart>
                   </ResponsiveContainer>
                 </CardContent>
               </Card>

               <Card className="bg-white/5 border-white/10 rounded-[32px] shadow-none overflow-hidden">
                 <CardHeader className="p-8 border-b border-white/5 font-black flex justify-between">
                   <CardTitle className="text-lg tracking-tight text-white">Status Geral</CardTitle>
                 </CardHeader>
                 <CardContent className="p-8 flex flex-col items-center justify-center">
                    <div className="w-full h-[220px]">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={stats?.donutData}
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={8}
                             dataKey="value"
                           >
                             {stats?.donutData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={SURREAL_COLORS[index % SURREAL_COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                       <div className="p-4 rounded-2xl bg-white/5 flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 mb-2" />
                          <span className="text-lg font-black text-white">{stats?.donutData[0]?.value || 0}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Conforme</span>
                       </div>
                       <div className="p-4 rounded-2xl bg-white/5 flex flex-col items-center">
                          <span className="w-2 h-2 rounded-full bg-rose-500 mb-2" />
                          <span className="text-lg font-black text-white">{stats?.donutData[1]?.value || 0}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Inconforme</span>
                       </div>
                    </div>
                 </CardContent>
               </Card>
            </div>
          </>
        )}

        {/* TAB: ANALYTICS (DEEP TABLE) */}
        {activeTab === 'analytics' && (
          <Card className="bg-white/5 border-white/10 rounded-[32px] shadow-none overflow-hidden">
            <CardHeader className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 text-left">
               <div>
                  <CardTitle className="text-xl font-black tracking-tight text-white">Dados Analíticos Individuais</CardTitle>
                  <p className="text-slate-200 text-sm font-bold">Histórico completo de cada pergunta respondida no período.</p>
               </div>
               <div className="flex gap-2">
                  <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                     <Input 
                       placeholder="Filtrar respostas..." 
                       value={answerFilter}
                       onChange={e => setAnswerFilter(e.target.value)}
                       className="bg-[#1e293b] border-white/10 rounded-xl pl-10 text-xs w-[250px] text-white"
                     />
                  </div>
                  <Button onClick={handleExportExcel} variant="secondary" className="rounded-xl font-black text-xs gap-2 bg-white text-slate-900 overflow-hidden">
                     <FileSpreadsheet size={16} /> EXCEL
                  </Button>
               </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                           <th className="px-8 py-5">Submissão</th>
                           <th className="px-8 py-5">Checklist</th>
                           <th className="px-8 py-5">Regional / Unidade</th>
                           <th className="px-8 py-5">Pergunta</th>
                           <th className="px-8 py-5 text-center">Resposta</th>
                           <th className="px-8 py-5">Plano Ação</th>
                           <th className="px-8 py-5 text-right">Ação</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {(detailedAnswers || [])
                          .filter(ans => {
                             const text = ans.checklist_questions?.text || '';
                             const user = (users || []).find(u => u.id === ans.checklist_submissions?.user_id)?.name || '';
                             return text.toLowerCase().includes(answerFilter.toLowerCase()) || user.toLowerCase().includes(answerFilter.toLowerCase());
                          })
                          .slice(0, 50).map((ans) => {
                           const cl = (checklists || []).find(c => c.id === ans.checklist_submissions?.checklist_id);
                           const unit = (orgUnits || []).find(u => u.id === ans.checklist_submissions?.org_unit_id);
                           const region = (orgTopLevels || []).find(t => t.id === unit?.parent_id);
                           const user = (users || []).find(u => u.id === ans.checklist_submissions?.user_id);

                           return (
                              <tr key={ans.id} className="hover:bg-white/10 transition-colors group">
                                 <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                       <span className="text-sm font-black text-white">{user?.name || 'Anônimo'}</span>
                                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                          {format(new Date(ans.created_at), 'dd MMM yyyy, HH:mm', { locale: ptBR })}
                                       </span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                       <span className="text-sm font-bold text-slate-400">{cl?.title || 'Checklist'}</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6">
                                    <div className="flex flex-col">
                                       <span className="text-[11px] font-black text-indigo-400">{region?.name || 'Geral'}</span>
                                       <span className="text-[11px] font-bold text-slate-500">{unit?.name || 'Unidade'}</span>
                                    </div>
                                 </td>
                                 <td className="px-8 py-6 max-w-[300px]">
                                    <p className="text-xs text-white font-bold line-clamp-2">{ans.checklist_questions?.text}</p>
                                 </td>
                                 <td className="px-8 py-6 text-center">
                                    <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black border uppercase ${
                                       ans.value === 'C' || ans.value === 'CHECKED' 
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                          : ans.value === 'NC' 
                                             ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                                             : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                       {ans.value === 'C' ? 'Conforme' : ans.value === 'NC' ? 'Ñ Conforme' : ans.value}
                                    </span>
                                 </td>
                                 <td className="px-8 py-6">
                                    {ans.action_plans && ans.action_plans.length > 0 ? (
                                       <div className="flex items-center gap-2">
                                          <div className={`w-2.5 h-2.5 rounded-full ${ans.action_plans[0].status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                          <span className="text-[11px] font-bold text-slate-300">Em Aberto</span>
                                       </div>
                                    ) : (
                                       <span className="text-slate-600 text-[11px]">Nenhum</span>
                                    )}
                                 </td>
                                 <td className="px-8 py-6 text-right">
                                    <Button
                                      variant="ghost"
                                      className="text-indigo-400 hover:text-white hover:bg-white/10 rounded-xl font-bold text-[10px] uppercase tracking-widest gap-2"
                                      onClick={() => { setSelectedResponse(ans); setIsResponseModalOpen(true); }}
                                    >
                                      <FileText size={16} /> Ver Resposta
                                    </Button>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            </CardContent>
          </Card>
        )}

        {/* TAB: RANKING */}
        {activeTab === 'ranking' && (
           <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <RankingCard 
                   title="Conformidade Estrutural" 
                   subtitle="As notas médias obtidas através dos checklists." 
                   color="#ec4899" 
                   dataKey="score"
                   valueLabel="%"
                   showLevelSelector={true}
                   activeLevel={activeLevelConformity}
                   onLevelChange={setActiveLevelConformity}
                   data={activeLevelConformity === 4 ? stats?.generalRanking : activeLevelConformity === 1 ? stats?.directorateRanking : activeLevelConformity === 2 ? stats?.regionalRanking : stats?.storeRanking} 
                 />

                 <RankingCard 
                   title="Engajamento com Checklists" 
                   subtitle="Volume preenchido contra o volume gerado/esperado." 
                   color="#6366f1" 
                   dataKey="completion"
                   valueLabel="%"
                   showLevelSelector={true}
                   activeLevel={activeLevelCompletion}
                   onLevelChange={setActiveLevelCompletion}
                   data={activeLevelCompletion === 4 ? stats?.generalRanking : activeLevelCompletion === 1 ? stats?.directorateRanking : activeLevelCompletion === 2 ? stats?.regionalRanking : stats?.storeRanking} 
                 />
              </div>
              <div className="grid grid-cols-1 gap-8">
                 <RankingCard 
                   title="Top Desempenho por Formulário" 
                   subtitle="Formulários com maior taxa de aprovação/preenchimento pela equipe." 
                   color="#10b981" 
                   dataKey="completion"
                   valueLabel="%"
                   data={stats?.checklistRankingData} 
                 />
              </div>
           </div>
        )}

        {/* TAB: USERS / DRILL-DOWN */}
        {activeTab === 'users' && (
          <div className="space-y-8 text-left">
            {!selectedUserId ? (
              <Card className="bg-white/5 border-white/10 rounded-[32px] shadow-none overflow-hidden text-left">
                 <CardHeader className="p-10 border-b border-white/5">
                    <div className="max-w-2xl">
                       <h2 className="text-2xl font-black text-white mb-2">Seletor de Performance Individual</h2>
                       <p className="text-slate-400 font-medium">Analise detalhadamente a saúde de compliance e histórico educacional de cada membro.</p>
                       <div className="mt-8 relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                          <Input 
                            placeholder="Buscar por nome ou e-mail..."
                            value={userSearchText}
                            onChange={(e) => setUserSearchText(e.target.value)}
                            className="bg-[#1e293b] border-white/10 rounded-2xl pl-12 py-6 text-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold placeholder:text-slate-600 text-white"
                          />
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {users
                         .filter(u => u.role === 'USER' && (u.name.toLowerCase().includes(userSearchText.toLowerCase()) || u.email?.toLowerCase().includes(userSearchText.toLowerCase())))
                         .slice(0, 15).map(user => {
                            const unit = orgUnits.find(u => u.id === user.org_unit_id);
                            return (
                               <button 
                                 key={user.id}
                                 onClick={() => setSelectedUserId(user.id)}
                                 className="flex items-center gap-4 p-5 rounded-[24px] bg-white/5 border border-white/5 hover:bg-indigo-600/10 hover:border-indigo-500/50 transition-all group text-left"
                               >
                                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 overflow-hidden shadow-lg group-hover:scale-110 transition-transform">
                                     {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-white">{user.name[0]}</div>}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <h4 className="font-black text-white truncate">{user.name}</h4>
                                     <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{unit?.name || 'Sem Unidade'}</p>
                                  </div>
                                  <div className="p-2 bg-white/5 rounded-xl group-hover:bg-indigo-500 transition-colors">
                                     <ArrowRight size={16} className="text-indigo-400 group-hover:text-white" />
                                  </div>
                               </button>
                            );
                       })}
                    </div>
                 </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                 <button 
                   onClick={() => setSelectedUserId(null)}
                   className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-bold hover:text-white transition-colors"
                 >
                    <ChevronLeft size={18} /> Explorar outros membros
                 </button>
                 
                 <UserProfileCard 
                    user={users.find(u => u.id === selectedUserId) || null}
                    unitName={orgUnits.find(u => u.id === users.find(u => u.id === selectedUserId)?.org_unit_id)?.name}
                    regionName={orgTopLevels.find(t => t.id === orgUnits.find(u => u.id === users.find(u => u.id === selectedUserId)?.org_unit_id)?.parent_id)?.name}
                    stats={{
                       totalChecklists: submissions.filter(s => s.user_id === selectedUserId).length,
                       completedChecklists: submissions.filter(s => s.user_id === selectedUserId && s.status === 'COMPLETED').length,
                       avgConformity: Math.round(
                          (answers.filter(a => submissions.find(s => s.id === a.submission_id && s.user_id === selectedUserId) && a.value === 'C').length / 
                          (answers.filter(a => submissions.find(s => s.id === a.submission_id && s.user_id === selectedUserId) && ['C', 'NC'].includes(a.value)).length || 1)) * 100
                       ),
                       lastActivity: submissions.filter(s => s.user_id === selectedUserId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at || null
                    }}
                    history={userChecklistHistory.map(h => ({
                       id: h.id,
                       title: h.checklists?.title || 'Checklist',
                       status: h.status,
                       completedAt: h.completed_at,
                       createdAt: h.created_at
                    }))}
                    courseHistory={userCourseHistory}
                 />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Response Modal */}
      <Dialog open={isResponseModalOpen} onOpenChange={setIsResponseModalOpen}>
        <DialogContent className="max-w-xl bg-slate-900 border-white/10 rounded-[32px] overflow-hidden text-left" hideCloseIcon>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <DialogHeader className="p-8 pb-4">
             <DialogTitle className="text-2xl font-black text-white">Visualização de Resposta</DialogTitle>
             <p className="text-slate-400 font-bold text-sm">Log específico de checagem. Pode conter informações adicionais anexadas.</p>
          </DialogHeader>
          <div id="exportable-detail" className="p-8 pt-4 space-y-6 bg-slate-900">
             {selectedResponse && (
               <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                     <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Entrevistado / Revisor</p>
                     <p className="font-bold text-white">{(users || []).find((u: any) => u.id === selectedResponse.checklist_submissions?.user_id)?.name || 'Anônimo'}</p>
                     <p className="text-xs font-bold text-slate-500">{format(new Date(selectedResponse.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                     <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Local</p>
                     <p className="font-bold text-white">{(orgUnits || []).find((u: any) => u.id === selectedResponse.checklist_submissions?.org_unit_id)?.name || 'Geral'}</p>
                  </div>
                  <div>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Pergunta Avaliada</p>
                     <p className="text-lg font-bold text-white leading-relaxed">{selectedResponse.checklist_questions?.text}</p>
                  </div>
                  <div>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 mt-6">Resultado</p>
                     <div className={`inline-flex px-4 py-2 rounded-xl border ${
                        selectedResponse.value === 'C' || selectedResponse.value === 'CHECKED' 
                           ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                           : selectedResponse.value === 'NC' 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                     }`}>
                        <span className="font-black uppercase tracking-widest text-xs">
                           {selectedResponse.value === 'C' ? 'Conforme' : selectedResponse.value === 'NC' ? 'Não Conforme' : selectedResponse.value}
                        </span>
                     </div>
                  </div>
                  {/* Photo Emulation */}
                  {selectedResponse.photo_url && (
                     <div className="mt-4 p-4 rounded-xl border border-white/10 bg-black overflow-hidden relative group cursor-pointer aspect-video flex-shrink-0">
                        <img src={selectedResponse.photo_url} alt="Evidência" className="w-full h-full object-contain" />
                     </div>
                  )}
               </div>
             )}
          </div>
          <div className="p-8 pt-0 flex gap-4 mt-4">
             <Button 
               variant="default" 
               className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-2xl"
               onClick={() => {
                  const el = document.getElementById('exportable-detail');
                  if (el) {
                     toast.loading('Gerando PDF...', { id: 'pdf-gen' });
                     html2canvas(el, { backgroundColor: '#0f172a' }).then(canvas => {
                        const imgData = canvas.toDataURL('image/png');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pdfW = pdf.internal.pageSize.getWidth();
                        const pdfH = (canvas.height * pdfW) / canvas.width;
                        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
                        pdf.save(`Checagem_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
                        toast.success('PDF Exportado', { id: 'pdf-gen' });
                     });
                  }
               }}
             >
                <Download size={18} className="mr-2" /> Exportar PDF
             </Button>
             <Button variant="ghost" onClick={() => setIsResponseModalOpen(false)} className="px-8 font-black text-slate-400 hover:text-white rounded-2xl">
                Fechar
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
