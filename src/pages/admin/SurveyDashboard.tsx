import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanies, useUsers, useOrgStructure } from '../../hooks/usePlatformData';
import {
  useSurvey,
  useSurveyQuestions,
  useSurveyResponses,
  useSurveyAnswers
} from '../../hooks/useSurveys';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar, Treemap
} from 'recharts';
import {
  LayoutDashboard, Database, Download, MessageSquareText,
  Activity, ArrowLeft, Target, Users, Search, ListChecks,
  TrendingUp, Store, Calendar, Hash, Star, ThumbsUp,
  BarChart3, PieChart as PieIcon, Type, Gauge, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { SURVEY_QUESTION_TYPE_LABELS, SurveyQuestionType, SurveyAnswer, SurveyQuestion } from '../../types/surveys';

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL TYPES
// ─────────────────────────────────────────────────────────────────────────────
type IconType = React.ComponentType<{ size?: number | string; className?: string }>;
type Datum = { name: string; value: number };
type NumberDatum = { value: number; count: number };
type DateDatum = { label: string; count: number };
type WordDatum = { text: string; count: number };
type LengthDatum = { bucket: string; count: number };
type TextRow = { text: string; userName: string; storeName: string; date: string };
type TextDataset = { words: WordDatum[]; lengths: LengthDatum[]; rows: TextRow[] };
type AnyValue = Record<string, unknown>;
type ResponseRow = { id: string; userName: string; storeName: string; date: string; cells: Record<string, string> };

// ─────────────────────────────────────────────────────────────────────────────
// PALETTE — anti-purple, BI-grade, high contrast
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = ['#f59e0b', '#06b6d4', '#10b981', '#ef4444', '#3b82f6', '#ec4899', '#84cc16', '#f97316'];
const NPS_COLORS = { detractor: '#ef4444', passive: '#f59e0b', promoter: '#10b981' };

// ─────────────────────────────────────────────────────────────────────────────
// CHART OPTIONS PER QUESTION TYPE
// ─────────────────────────────────────────────────────────────────────────────
const CHART_OPTIONS: Record<SurveyQuestionType, { value: string; label: string; icon: IconType }[]> = {
  SINGLE_CHOICE: [
    { value: 'bar', label: 'Barras', icon: BarChart3 },
    { value: 'donut', label: 'Donut', icon: PieIcon },
    { value: 'pie', label: 'Pizza', icon: PieIcon },
    { value: 'column', label: 'Colunas', icon: BarChart3 },
  ],
  MULTIPLE_CHOICE: [
    { value: 'bar', label: 'Barras', icon: BarChart3 },
    { value: 'donut', label: 'Donut', icon: PieIcon },
    { value: 'treemap', label: 'Treemap', icon: BarChart3 },
  ],
  YES_NO: [
    { value: 'donut', label: 'Donut', icon: PieIcon },
    { value: 'bar', label: 'Barras', icon: BarChart3 },
    { value: 'cards', label: 'Cards', icon: Sparkles },
  ],
  RATING: [
    { value: 'bar', label: 'Barras', icon: BarChart3 },
    { value: 'donut', label: 'Donut', icon: PieIcon },
    { value: 'summary', label: 'Resumo', icon: Gauge },
  ],
  NPS: [
    { value: 'bar', label: 'Distribuição', icon: BarChart3 },
    { value: 'donut', label: 'Categorias', icon: PieIcon },
    { value: 'gauge', label: 'Score', icon: Gauge },
  ],
  SHORT_TEXT: [
    { value: 'cloud', label: 'Nuvem', icon: Sparkles },
  ],
  LONG_TEXT: [
    { value: 'cloud', label: 'Nuvem', icon: Sparkles },
  ],
  DATE: [
    { value: 'area', label: 'Linha', icon: TrendingUp },
    { value: 'bar', label: 'Por mês', icon: BarChart3 },
  ],
  NUMBER: [
    { value: 'histogram', label: 'Histograma', icon: BarChart3 },
    { value: 'summary', label: 'Resumo', icon: Gauge },
  ],
};

const QUESTION_ICON: Record<SurveyQuestionType, IconType> = {
  SHORT_TEXT: Type, LONG_TEXT: Type,
  SINGLE_CHOICE: ListChecks, MULTIPLE_CHOICE: ListChecks,
  RATING: Star, NPS: Activity, DATE: Calendar, NUMBER: Hash, YES_NO: ThumbsUp
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIPS
// ─────────────────────────────────────────────────────────────────────────────
type TooltipPayloadItem = { name?: string; value?: number | string; color?: string; fill?: string };
type TooltipProps = { active?: boolean; payload?: TooltipPayloadItem[]; label?: string | number };
const DarkTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-950/95 border border-white/10 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl">
      {label !== undefined && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>}
      {payload.map((p, i: number) => (
        <p key={i} className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          {p.name}: <span className="text-amber-400">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
const getAnswerText = (val: AnyValue | null | undefined, q: SurveyQuestion): string => {
  if (!val) return '—';
  const cfg = q.configuration as AnyValue;
  switch (q.question_type) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
      return (val.text as string) || '—';
    case 'SINGLE_CHOICE': {
      const opts = (cfg?.options as { id: string; label: string }[]) || [];
      const opt = opts.find(o => o.id === val.option_id);
      return opt?.label || (val.other_text as string) || '—';
    }
    case 'MULTIPLE_CHOICE': {
      const opts = (cfg?.options as { id: string; label: string }[]) || [];
      const ids = (val.option_ids as string[]) || [];
      const labels = ids.map(id => opts.find(o => o.id === id)?.label).filter(Boolean) as string[];
      if (val.other_text) labels.push(val.other_text as string);
      return labels.join(', ') || '—';
    }
    case 'YES_NO':
      return val.value === true ? ((cfg?.yes_label as string) || 'Sim') : ((cfg?.no_label as string) || 'Não');
    case 'RATING':
    case 'NPS':
    case 'NUMBER':
      return String(val.value ?? '—');
    case 'DATE':
      return val.date ? format(new Date(val.date as string), 'dd/MM/yyyy', { locale: ptBR }) : '—';
    default:
      return JSON.stringify(val);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION VIEWS
// ─────────────────────────────────────────────────────────────────────────────

const ChoiceChart = ({ data, type }: { data: Datum[]; type: string }) => {
  if (!data?.length || data.every(d => d.value === 0)) {
    return <EmptyState message="Sem dados suficientes para esta pergunta." />;
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 12, fontWeight: 600 }} width={140} />
          <RechartsTooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28} label={{ position: 'right', fill: '#fff', fontSize: 12, fontWeight: 900 }}>
            {data.map((_e, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'column') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ left: -10, right: 10, top: 16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <RechartsTooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="value" radius={[8, 8, 0, 0]} label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 900 }}>
            {data.map((_e, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (type === 'treemap') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={data.map((d, i) => ({ ...d, fill: PALETTE[i % PALETTE.length] }))}
          dataKey="value"
          stroke="#0f172a"
          content={<CustomTreemapCell />}
        />
      </ResponsiveContainer>
    );
  }

  // donut / pie
  const isPie = type === 'pie';
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={isPie ? 0 : 60}
          outerRadius={100}
          paddingAngle={isPie ? 0 : 4}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((_e, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="#0f172a" strokeWidth={2} />)}
        </Pie>
        <RechartsTooltip content={<DarkTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

type TreemapCellProps = { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; fill?: string };
const CustomTreemapCell = (props: TreemapCellProps) => {
  const { x = 0, y = 0, width = 0, height = 0, name, value, fill } = props;
  if (width < 30 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="#0f172a" strokeWidth={2} />
      <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight={900}>{name}</text>
      <text x={x + 8} y={y + 34} fill="#fff" fontSize={14} fontWeight={900}>{value}</text>
    </g>
  );
};

const YesNoChart = ({ data, type }: { data: Datum[]; type: string }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyState message="Sem respostas registradas." />;

  if (type === 'cards') {
    return (
      <div className="grid grid-cols-2 gap-4 h-[280px]">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={i} className="relative overflow-hidden rounded-2xl border border-white/10 p-6 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${PALETTE[i]}22, transparent)` }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{d.name}</p>
                <p className="text-6xl font-bold mt-2" style={{ color: PALETTE[i] }}>{pct}%</p>
              </div>
              <p className="text-sm font-semibold text-slate-300">{d.value} respostas</p>
              <div className="absolute bottom-0 left-0 h-1 transition-all" style={{ width: `${pct}%`, background: PALETTE[i] }} />
            </div>
          );
        })}
      </div>
    );
  }

  return <ChoiceChart data={data} type={type} />;
};

const NPSChart = ({ data, type, score }: { data: Datum[]; type: string; score: number | null }) => {
  if (!data?.length) return <EmptyState message="Sem dados de NPS." />;

  if (type === 'gauge' && score !== null) {
    const radial = [{ name: 'NPS', value: score, fill: score >= 50 ? NPS_COLORS.promoter : score >= 0 ? NPS_COLORS.passive : NPS_COLORS.detractor }];
    return (
      <div className="relative h-[280px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={radial} startAngle={180} endAngle={-180}>
            <RadialBar background={{ fill: 'rgba(255,255,255,0.05)' }} dataKey="value" cornerRadius={20} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Score NPS</p>
          <p className="text-7xl font-bold text-white tracking-tighter">{score}</p>
          <p className="text-xs font-semibold text-slate-400 mt-1">{score >= 50 ? 'Excelente' : score >= 0 ? 'Bom' : 'Crítico'}</p>
        </div>
      </div>
    );
  }

  if (type === 'donut') {
    let det = 0, pas = 0, pro = 0;
    data.forEach(d => {
      const v = Number(d.name);
      if (v <= 6) det += d.value;
      else if (v <= 8) pas += d.value;
      else pro += d.value;
    });
    const cat = [
      { name: 'Detratores', value: det, color: NPS_COLORS.detractor },
      { name: 'Neutros', value: pas, color: NPS_COLORS.passive },
      { name: 'Promotores', value: pro, color: NPS_COLORS.promoter },
    ];
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={cat} innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {cat.map((c, i) => <Cell key={i} fill={c.color} stroke="#0f172a" strokeWidth={2} />)}
          </Pie>
          <RechartsTooltip content={<DarkTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // bar — distribution 0–10
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -20, right: 10, top: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <RechartsTooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, i: number) => {
            const v = Number(entry.name);
            const color = v >= 9 ? NPS_COLORS.promoter : v >= 7 ? NPS_COLORS.passive : NPS_COLORS.detractor;
            return <Cell key={i} fill={color} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const StarRating = ({ value, max = 5, size = 16 }: { value: number; max?: number; size?: number }) => {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const fill = i + 1 <= Math.floor(value) ? 1 : i < value ? 0.5 : 0;
        return (
          <div key={i} className="relative">
            <Star size={size} className="text-slate-700" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="text-amber-400 fill-amber-400" />
            </div>
          </div>
        );
      })}
      <span className="ml-2 text-sm font-bold text-slate-400">{value.toFixed(1)}</span>
    </div>
  );
};

const RatingView = ({ data, type, max }: { data: Datum[]; type: string; max: number }) => {
  if (!data?.length || data.every(d => d.value === 0)) return <EmptyState message="Sem avaliações registradas." />;

  if (type === 'summary') {
    const total = data.reduce((s, d) => s + d.value, 0);
    const sum = data.reduce((s, d) => s + (Number(d.name) * d.value), 0);
    const avgVal = total ? sum / total : 0;
    const avg = avgVal.toFixed(2);
    const top = data.reduce((a, b) => (a.value > b.value ? a : b), data[0]);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 flex flex-col justify-between min-h-[180px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">Avaliação Geral</p>
            <p className="text-6xl font-bold text-white tracking-tighter mb-2">{avg}</p>
            <StarRating value={avgVal} max={max} size={24} />
          </div>
          <p className="text-xs font-semibold text-slate-400">Baseado em {total} respostas</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 flex flex-col justify-between min-h-[180px]">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Distribuição</p>
            <div className="space-y-1.5 mt-2">
              {[...Array(max)].map((_, i) => {
                const starVal = max - i;
                const d = data.find(x => Number(x.name) === starVal);
                const count = d?.value || 0;
                const pct = total ? (count / total) * 100 : 0;
                return (
                  <div key={starVal} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-3">{starVal}</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500/80" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-400">Nota mais votada: {top.name}</p>
        </div>
      </div>
    );
  }

  return <ChoiceChart data={data} type={type} />;
};

const TextResponsesTable = ({ rows, anonymous }: { rows: TextRow[]; anonymous: boolean }) => {
  const [filter, setFilter] = useState('');
  const filtered = useMemo(() => {
    if (!filter) return rows;
    const q = filter.toLowerCase();
    return rows.filter(r =>
      r.text?.toLowerCase().includes(q) ||
      r.userName?.toLowerCase().includes(q) ||
      r.storeName?.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm font-bold text-slate-500 bg-white/5 rounded-2xl border border-white/5">Nenhuma resposta textual registrada.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Filtrar por nome, loja ou texto da resposta…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="bg-slate-950/50 border-white/10 rounded-lg pl-9 h-9 text-xs font-bold text-white placeholder:text-slate-500"
          />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 shrink-0">{filtered.length} de {rows.length}</span>
      </div>
      <div className="rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
              <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/10">
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.03] transition-colors align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-xs font-bold text-white">{anonymous ? 'Anônimo' : (r.userName || '—')}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                      <Store size={10} /> {r.storeName || 'Sem loja'}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-[11px] font-bold text-slate-400">{r.date ? format(new Date(r.date), 'dd MMM yy · HH:mm', { locale: ptBR }) : '—'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-slate-200 max-w-[640px] whitespace-pre-wrap">{r.text}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

type TextViewProps = { type: string; words: WordDatum[]; lengths: LengthDatum[]; rows: TextRow[]; anonymous: boolean };
const TextView = ({ type: _type, words, lengths: _lengths, rows, anonymous }: TextViewProps) => {
  const WordCloud = () => {
    if (!words?.length) return <EmptyState message="Sem texto coerente para extrair palavras-chave." />;
    const max = Math.max(...words.map(w => w.count));
    return (
      <div className="flex flex-wrap gap-2 items-center justify-center p-4 h-[220px] overflow-y-auto content-center rounded-2xl bg-slate-950/40 border border-white/5 no-scrollbar">
        {words.map((w, i: number) => (
          <span
            key={i}
            className="px-3 py-1 rounded-full font-bold border"
            style={{
              fontSize: 11 + (w.count / max) * 18 + 'px',
              color: PALETTE[i % PALETTE.length],
              borderColor: PALETTE[i % PALETTE.length] + '40',
              background: PALETTE[i % PALETTE.length] + '15',
            }}
          >
            {w.text} <span className="opacity-60 text-[10px]">{w.count}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <WordCloud />
      <div className="border-t border-white/5 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <FileSpreadsheet size={14} className="text-amber-400" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-slate-300">Respostas individuais</h4>
        </div>
        <TextResponsesTable rows={rows} anonymous={anonymous} />
      </div>
    </div>
  );
};

const NumberView = ({ data, type }: { data: NumberDatum[]; type: string }) => {
  if (!data?.length) return <EmptyState message="Sem números registrados." />;

  if (type === 'summary') {
    const values = data.flatMap(d => Array(d.count).fill(d.value));
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = (sum / values.length).toFixed(2);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return (
      <div className="grid grid-cols-3 gap-3 h-[280px]">
        {[
          { label: 'Média', value: avg, color: '#f59e0b' },
          { label: 'Mín', value: min, color: '#06b6d4' },
          { label: 'Máx', value: max, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-white/10 p-5 flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${s.color}1a, transparent)` }}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
            <p className="text-5xl font-bold tracking-tighter" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-semibold text-slate-500">{values.length} respostas</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -20, right: 10, top: 16 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="value" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <RechartsTooltip content={<DarkTooltip />} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#06b6d4" />
      </BarChart>
    </ResponsiveContainer>
  );
};

const DateView = ({ data, type }: { data: DateDatum[]; type: string }) => {
  if (!data?.length) return <EmptyState message="Sem datas registradas." />;

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ left: -20, right: 10, top: 16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
          <RechartsTooltip content={<DarkTooltip />} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: -20, right: 10, top: 16 }}>
        <defs>
          <linearGradient id="dateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <RechartsTooltip content={<DarkTooltip />} />
        <Area dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#dateGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center h-[220px] rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
    <p className="text-sm font-bold text-slate-500 italic">{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const SurveyDashboard = () => {
  const { companySlug, surveyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  const { users } = useUsers(company?.id);
  const { orgUnits } = useOrgStructure(company?.id);

  const { survey, isLoading: ls } = useSurvey(surveyId);
  const { questions, isLoading: lq } = useSurveyQuestions(surveyId);
  const { responses, isLoading: lr } = useSurveyResponses(surveyId);

  const { answers, isLoading: la } = useSurveyAnswers(surveyId);

  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'table'>('overview');
  const [tableFilter, setTableFilter] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const configKey = `survey_dashboard_config_v2:${surveyId}:${user?.id}`;
  const [chartTypes, setChartTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(configKey);
      if (saved) setChartTypes(JSON.parse(saved));
    } catch { /* noop */ }
  }, [configKey]);

  const setChartType = (qId: string, type: string) => {
    const next = { ...chartTypes, [qId]: type };
    setChartTypes(next);
    localStorage.setItem(configKey, JSON.stringify(next));
  };

  const isLoading = ls || lq || lr || la;

  // ── Build response × user × store lookup
  type ResponseWithJoins = {
    id: string;
    user_id?: string | null;
    org_unit_id?: string | null;
    created_at?: string | null;
    completed_at?: string | null;
    users?: { name?: string; email?: string; avatar_url?: string; org_unit_id?: string } | null;
    org_unit?: { id?: string; name?: string } | null;
  };
  const responseLookup = useMemo(() => {
    const map: Record<string, { userName: string; storeName: string; date: string }> = {};
    const resps = (responses || []) as any[];
    
    resps.forEach(r => {
      // A API pode retornar joins como objeto ou array de 1 item
      const uData = Array.isArray(r.users) ? r.users[0] : r.users;
      const unitData = Array.isArray(r.org_unit) ? r.org_unit[0] : r.org_unit;
      
      const store =
        unitData?.name ||
        orgUnits.find(ou => ou.id === r.org_unit_id)?.name ||
        (uData?.org_unit_id ? orgUnits.find(ou => ou.id === uData.org_unit_id)?.name : null);

      map[r.id] = {
        userName: uData?.name || 'Desconhecido',
        storeName: store || '—',
        date: r.created_at || r.completed_at || '',
      };
    });
    return map;
  }, [responses, orgUnits]);

  // ── ANALYTICS
  const stats = useMemo(() => {
    if (!survey || !questions || !responses || !answers) return null;

    const allResps = responses as any[];
    const allAnsList = answers as SurveyAnswer[];
    
    // Aplicar Filtro de Usuário se selecionado
    const respList = selectedUserId === 'all' 
      ? allResps 
      : allResps.filter(r => r.user_id === selectedUserId);
      
    const ansList = selectedUserId === 'all'
      ? allAnsList
      : allAnsList.filter(a => respList.some(r => r.id === a.response_id));

    const totalResponses = respList.length;
    const uniqueUsers = new Set(respList.map(r => r.user_id).filter(Boolean)).size;
    const uniqueStores = new Set(respList.map(r => r.org_unit_id).filter(Boolean)).size;

    let npsScore: number | null = null;
    const npsQuestion = questions.find(q => q.question_type === 'NPS');
    if (npsQuestion) {
      const npsAns = ansList.filter(a => a.question_id === npsQuestion.id);
      if (npsAns.length > 0) {
        let det = 0, pro = 0;
        npsAns.forEach(a => {
          const v = (a.value as AnyValue)?.value as number;
          if (v <= 6) det++; else if (v >= 9) pro++;
        });
        npsScore = Math.round(((pro - det) / npsAns.length) * 100);
      }
    }

    const chartDataMap: Record<string, Datum[] | NumberDatum[] | DateDatum[] | TextDataset> = {};

    questions.forEach(q => {
      const qAns = ansList.filter(a => a.question_id === q.id);
      const cfg = q.configuration as AnyValue;

      switch (q.question_type) {
        case 'SINGLE_CHOICE': {
          const counts: Record<string, number> = {};
          qAns.forEach(a => {
            const v = (a.value as AnyValue)?.option_id as string | undefined;
            if (v) counts[v] = (counts[v] || 0) + 1;
          });
          const opts = (cfg?.options as { id: string; label: string }[]) || [];
          chartDataMap[q.id!] = opts.map(opt => ({ name: opt.label, value: counts[opt.id] || 0 }));
          break;
        }
        case 'MULTIPLE_CHOICE': {
          const counts: Record<string, number> = {};
          qAns.forEach(a => {
            ((a.value as AnyValue)?.option_ids as string[] || []).forEach(id => {
              counts[id] = (counts[id] || 0) + 1;
            });
          });
          const opts = (cfg?.options as { id: string; label: string }[]) || [];
          chartDataMap[q.id!] = opts.map(opt => ({ name: opt.label, value: counts[opt.id] || 0 }));
          break;
        }
        case 'YES_NO': {
          let yes = 0, no = 0;
          qAns.forEach(a => {
            if ((a.value as AnyValue)?.value === true) yes++;
            else if ((a.value as AnyValue)?.value === false) no++;
          });
          chartDataMap[q.id!] = [
            { name: (cfg?.yes_label as string) || 'Sim', value: yes },
            { name: (cfg?.no_label as string) || 'Não', value: no }
          ];
          break;
        }
        case 'NPS': {
          const dist: Record<number, number> = {};
          for (let i = 0; i <= 10; i++) dist[i] = 0;
          qAns.forEach(a => {
            const v = (a.value as AnyValue)?.value as number;
            if (v !== undefined && dist[v] !== undefined) dist[v]++;
          });
          chartDataMap[q.id!] = Object.keys(dist).map(k => ({ name: k, value: dist[Number(k)] }));
          break;
        }
        case 'RATING': {
          const max = (cfg?.max as number) || 5;
          const dist: Record<number, number> = {};
          for (let i = 1; i <= max; i++) dist[i] = 0;
          qAns.forEach(a => {
            const v = (a.value as AnyValue)?.value as number;
            if (v !== undefined && dist[v] !== undefined) dist[v]++;
          });
          chartDataMap[q.id!] = Object.keys(dist).map(k => ({ name: k, value: dist[Number(k)] }));
          break;
        }
        case 'NUMBER': {
          const counts: Record<number, number> = {};
          qAns.forEach(a => {
            const v = (a.value as AnyValue)?.value;
            if (typeof v === 'number') counts[v] = (counts[v] || 0) + 1;
          });
          chartDataMap[q.id!] = Object.keys(counts)
            .map(k => ({ value: Number(k), count: counts[Number(k)] }))
            .sort((a, b) => a.value - b.value);
          break;
        }
        case 'DATE': {
          const buckets: Record<string, number> = {};
          qAns.forEach(a => {
            const d = (a.value as AnyValue)?.date as string | undefined;
            if (d) {
              const key = format(new Date(d), 'MMM/yy', { locale: ptBR });
              buckets[key] = (buckets[key] || 0) + 1;
            }
          });
          chartDataMap[q.id!] = Object.keys(buckets).map(k => ({ label: k, count: buckets[k] }));
          break;
        }
        case 'SHORT_TEXT':
        case 'LONG_TEXT': {
          const wordMap: Record<string, number> = {};
          const lenBuckets: Record<string, number> = { '0-20': 0, '21-50': 0, '51-100': 0, '101-200': 0, '200+': 0 };
          const rows: TextRow[] = [];
          qAns.forEach(a => {
            const txt = (a.value as AnyValue)?.text as string | undefined;
            if (!txt) return;
            const len = txt.length;
            if (len <= 20) lenBuckets['0-20']++;
            else if (len <= 50) lenBuckets['21-50']++;
            else if (len <= 100) lenBuckets['51-100']++;
            else if (len <= 200) lenBuckets['101-200']++;
            else lenBuckets['200+']++;

            const words = txt.toLowerCase().match(/\b([a-zà-ú]{4,})\b/gi);
            if (words) words.forEach(w => { wordMap[w] = (wordMap[w] || 0) + 1; });

            const lookup = responseLookup[a.response_id] || { userName: '—', storeName: '—', date: a.created_at || '' };
            rows.push({ text: txt, ...lookup });
          });
          chartDataMap[q.id!] = {
            words: Object.keys(wordMap).map(k => ({ text: k, count: wordMap[k] })).sort((a, b) => b.count - a.count).slice(0, 25),
            lengths: Object.keys(lenBuckets).map(k => ({ bucket: k, count: lenBuckets[k] })),
            rows: rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
          };
          break;
        }
      }
    });

    const eligible = users?.length || 0;
    const completionRate = eligible > 0 ? Math.round((uniqueUsers / eligible) * 100) : 0;

    return { totalResponses, uniqueUsers, uniqueStores, npsScore, chartDataMap, completionRate };
  }, [survey, questions, responses, answers, users, responseLookup]);

  // ── Build full per-response × per-question table
  const rawRows = useMemo<ResponseRow[]>(() => {
    if (!responses || !questions || !answers) return [];
    
    const allResps = responses as any[];
    const allAnsList = answers as SurveyAnswer[];

    const list = selectedUserId === 'all'
      ? allResps
      : allResps.filter(r => r.user_id === selectedUserId);

    return list.map(r => {
      const lookup = responseLookup[r.id] || { userName: '—', storeName: '—', date: '' };
      const cells: Record<string, string> = {};
      questions.forEach(q => {
        const a = allAnsList.find(x => x.response_id === r.id && x.question_id === q.id);
        cells[q.id!] = a ? getAnswerText(a.value as AnyValue, q) : '—';
      });
      return { id: r.id, ...lookup, cells };
    });
  }, [responses, questions, answers, responseLookup, selectedUserId]);

  const filteredRawRows = useMemo(() => {
    if (!tableFilter) return rawRows;
    const q = tableFilter.toLowerCase();
    return rawRows.filter(r =>
      r.userName.toLowerCase().includes(q) ||
      r.storeName.toLowerCase().includes(q) ||
      Object.values(r.cells).some(v => String(v).toLowerCase().includes(q))
    );
  }, [rawRows, tableFilter]);

  const handleExportFull = useCallback(async () => {
    try {
      toast.info('Gerando relatório completo, aguarde...');
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Helper: captura um elemento e adiciona ao PDF com paginação
      const captureAndAdd = async (el: HTMLElement, isFirstSection: boolean) => {
        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: '#0b1120',
          useCORS: true,
          logging: false,
          windowWidth: 1280,
        });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidth = pdfWidth - 16; // 8mm margin each side
        const imgH = (imgProps.height * imgWidth) / imgProps.width;

        // Se a imagem cabe em uma página
        if (imgH <= pdfHeight - 16) {
          if (!isFirstSection) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 8, 8, imgWidth, imgH);
        } else {
          // Paginação: divide a imagem em fatias
          const pageContentHeight = pdfHeight - 16;
          const scaleFactor = imgWidth / imgProps.width;
          const srcPageH = pageContentHeight / scaleFactor;
          let srcY = 0;
          let isFirst = isFirstSection;

          while (srcY < imgProps.height) {
            if (!isFirst) pdf.addPage();
            isFirst = false;
            const sliceH = Math.min(srcPageH, imgProps.height - srcY);
            const destH = sliceH * scaleFactor;

            // Cria canvas slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = imgProps.width;
            sliceCanvas.height = sliceH;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(canvas, 0, srcY, imgProps.width, sliceH, 0, 0, imgProps.width, sliceH);
              const sliceData = sliceCanvas.toDataURL('image/png');
              pdf.addImage(sliceData, 'PNG', 8, 8, imgWidth, destH);
            }
            srcY += sliceH;
          }
        }
      };

      // Salva tab ativa e renderiza todas as seções
      const savedTab = activeTab;

      // 1. Capturar Overview
      setActiveTab('overview');
      await new Promise(r => setTimeout(r, 600));
      const overviewEl = document.getElementById('dashboard-content');
      if (overviewEl) await captureAndAdd(overviewEl, true);

      // 2. Capturar Analytics
      setActiveTab('analytics');
      await new Promise(r => setTimeout(r, 600));
      const analyticsEl = document.getElementById('dashboard-content');
      if (analyticsEl) await captureAndAdd(analyticsEl, false);

      // 3. Capturar Tabela Raw
      setActiveTab('table');
      await new Promise(r => setTimeout(r, 600));
      const tableEl = document.getElementById('dashboard-content');
      if (tableEl) await captureAndAdd(tableEl, false);

      // Restaura tab original
      setActiveTab(savedTab);

      pdf.save(`Relatorio_Completo_${survey?.title || 'Pesquisa'}_${format(new Date(), 'dd_MM_yyyy')}.pdf`);
      toast.success('Relatório PDF completo exportado com sucesso!');
    } catch {
      toast.error('Erro ao gerar relatório PDF.');
    }
  }, [activeTab, survey?.title]);

  const handleExportCSV = () => {
    if (!questions || !rawRows.length) return;
    const headers = ['Colaborador', 'Loja', 'Data', ...questions.map(q => q.question_text)];
    const rows = rawRows.map(r => [
      r.userName, r.storeName,
      r.date ? format(new Date(r.date), 'dd/MM/yyyy HH:mm') : '',
      ...questions.map(q => `"${(r.cells[q.id!] || '').replace(/"/g, '""')}"`)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respostas_${survey?.title || 'pesquisa'}_${format(new Date(), 'dd_MM_yyyy')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado.');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xl font-bold text-slate-400 animate-pulse uppercase tracking-widest">Calculando resultados…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 p-4 md:p-8 font-sans" id="dashboard-content">

      {/* HEADER — asymmetric */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-10">
        <div className="space-y-2 max-w-3xl">
          <button
            onClick={() => navigate(`/admin/${companySlug}/surveys`)}
            className="flex items-center gap-2 text-amber-500 hover:text-amber-400 font-bold text-xs uppercase tracking-[0.3em] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar para Pesquisas
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter flex items-center gap-3">
            <Target className="text-amber-500" size={40} />
            {survey?.title}
          </h1>
          {survey?.description && (
            <p className="text-sm text-slate-400 font-medium max-w-2xl">{survey.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {survey?.status === 'ACTIVE' ? 'Ativa' : survey?.status === 'DRAFT' ? 'Rascunho' : 'Arquivada'}
            </span>
            {survey?.anonymous && (
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-700/50 text-slate-300 border border-white/10">
                Anônima
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {questions?.length || 0} perguntas
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {!survey?.anonymous && (
            <div className="min-w-[200px]">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white font-bold h-10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-amber-500" />
                    <SelectValue placeholder="Filtrar Usuário" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  {responses && [...new Set((responses as any[]).map(r => r.user_id).filter(Boolean))].map(uid => {
                    const rid = (responses as any[]).find(r => r.user_id === uid)?.id;
                    const name = rid ? responseLookup[rid]?.userName : 'Usuário';
                    return (
                      <SelectItem key={uid as string} value={uid as string}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleExportCSV} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold rounded-xl gap-2 h-10">
            <FileSpreadsheet size={16} /> CSV
          </Button>
          <Button onClick={handleExportFull} className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold rounded-xl gap-2 h-10">
            <Download size={16} /> PDF Completo
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 overflow-x-auto pb-px mb-8 no-scrollbar border-b border-white/5">
        {[
          { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
          { id: 'analytics', label: 'Análise por pergunta', icon: Database },
          { id: 'table', label: 'Respostas (raw)', icon: ListChecks }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'analytics' | 'table')}
            className={`flex items-center gap-2 px-5 py-3 font-bold text-[11px] tracking-widest uppercase transition-all shrink-0 -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-500 hover:text-slate-300 border-transparent'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Strip — asymmetric: hero KPI on left, grid on right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Hero KPI */}
              <Card className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 border-none rounded-3xl overflow-hidden shadow-2xl shadow-amber-900/30 relative">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
                <CardContent className="p-8 relative">
                  <div className="flex items-center gap-2 text-white/80 mb-2">
                    <MessageSquareText size={18} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Total de Respostas</p>
                  </div>
                  <p className="text-7xl font-black text-white tracking-tighter leading-none">{stats?.totalResponses ?? 0}</p>
                  <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">Adesão</p>
                      <p className="text-2xl font-bold text-white">{stats?.completionRate || 0}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">Únicos</p>
                      <p className="text-2xl font-bold text-white">{stats?.uniqueUsers || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Secondary metrics */}
              <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                <Card className="bg-white/[0.03] border-white/10 rounded-2xl shadow-none hover:bg-white/[0.05] transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-cyan-400 mb-3">
                      <Store size={18} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Lojas</p>
                    </div>
                    <p className="text-4xl font-bold text-white tracking-tighter">{stats?.uniqueStores || 0}</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">distintas alcançadas</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/[0.03] border-white/10 rounded-2xl shadow-none hover:bg-white/[0.05] transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-emerald-400 mb-3">
                      <Users size={18} />
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Base elegível</p>
                    </div>
                    <p className="text-4xl font-bold text-white tracking-tighter">{users?.length || 0}</p>
                    <p className="text-[10px] font-semibold text-slate-500 mt-1">colaboradores</p>
                  </CardContent>
                </Card>

                {stats?.npsScore !== null ? (
                  <Card className="bg-white/[0.03] border-white/10 rounded-2xl shadow-none col-span-2">
                    <CardContent className="p-6 flex items-center gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity size={18} style={{ color: stats!.npsScore! >= 50 ? NPS_COLORS.promoter : stats!.npsScore! >= 0 ? NPS_COLORS.passive : NPS_COLORS.detractor }} />
                          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">NPS Consolidado</p>
                        </div>
                        <p className="text-5xl font-bold tracking-tighter" style={{ color: stats!.npsScore! >= 50 ? NPS_COLORS.promoter : stats!.npsScore! >= 0 ? NPS_COLORS.passive : NPS_COLORS.detractor }}>
                          {stats!.npsScore}
                        </p>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <div className="text-center p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-rose-300">Detrator</p>
                          <p className="text-lg font-bold text-white">0–6</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-amber-300">Neutro</p>
                          <p className="text-lg font-bold text-white">7–8</p>
                        </div>
                        <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-300">Promotor</p>
                          <p className="text-lg font-bold text-white">9–10</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white/[0.03] border-white/10 rounded-2xl shadow-none col-span-2">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-amber-400 mb-3">
                        <Calendar size={18} />
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Última resposta</p>
                      </div>
                      <p className="text-2xl font-bold text-white tracking-tight">
                        {responses && responses.length > 0 && responses[0].created_at
                          ? format(new Date(responses[0].created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                          : 'Sem respostas ainda'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Question structure */}
            <div>
              <h3 className="font-bold text-base text-white mt-4 mb-4 tracking-tight uppercase flex items-center gap-2 text-[13px]">
                <Database size={16} className="text-amber-500" /> Estrutura da pesquisa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {questions?.map((q, idx) => {
                  const Icon = QUESTION_ICON[q.question_type as SurveyQuestionType] || Target;
                  const total = ((answers || []) as SurveyAnswer[]).filter(a => a.question_id === q.id).length;
                  return (
                    <div
                      key={q.id}
                      className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/[0.06] hover:border-amber-500/30 transition-all cursor-pointer group"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Icon size={20} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Q{idx + 1} · {SURVEY_QUESTION_TYPE_LABELS[q.question_type as SurveyQuestionType]}</p>
                        <p className="text-sm font-bold text-white truncate">{q.question_text}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-bold text-white">{total}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">respostas</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: ANALYTICS PER QUESTION */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {questions?.map((q, idx) => {
              const qType = q.question_type as SurveyQuestionType;
              const options = CHART_OPTIONS[qType] || [];
              const currentType = chartTypes[q.id!] || options[0]?.value || 'bar';
              const rawData = stats?.chartDataMap[q.id!];
              const Icon = QUESTION_ICON[qType] || Target;
              const isText = qType === 'SHORT_TEXT' || qType === 'LONG_TEXT';

              const renderViz = () => {
                if (isText) {
                  const td = (rawData as TextDataset | undefined) || { words: [], lengths: [], rows: [] };
                  return (
                    <TextView
                      type={currentType}
                      words={td.words}
                      lengths={td.lengths}
                      rows={td.rows}
                      anonymous={!!survey?.anonymous}
                    />
                  );
                }
                if (qType === 'YES_NO') return <YesNoChart data={(rawData as Datum[]) || []} type={currentType} />;
                if (qType === 'NPS') return <NPSChart data={(rawData as Datum[]) || []} type={currentType} score={stats?.npsScore ?? null} />;
                if (qType === 'RATING') return <RatingView data={(rawData as Datum[]) || []} type={currentType} max={((q.configuration as AnyValue)?.max as number) || 5} />;
                if (qType === 'NUMBER') return <NumberView data={(rawData as NumberDatum[]) || []} type={currentType} />;
                if (qType === 'DATE') return <DateView data={(rawData as DateDatum[]) || []} type={currentType} />;
                return <ChoiceChart data={(rawData as Datum[]) || []} type={currentType} />;
              };

              return (
                <Card key={q.id} className={`bg-white/[0.03] border-white/10 rounded-3xl shadow-none flex flex-col ${isText ? 'xl:col-span-2' : ''}`}>
                  <CardHeader className="p-6 border-b border-white/5 flex flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Icon size={18} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1">
                          Q{idx + 1} · {SURVEY_QUESTION_TYPE_LABELS[qType]}
                        </p>
                        <CardTitle className="text-base font-bold text-white leading-snug break-words whitespace-normal">
                          {q.question_text}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex bg-slate-950/60 border border-white/10 rounded-xl p-1 shrink-0">
                      {options.map(opt => {
                        const OptIcon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setChartType(q.id!, opt.value)}
                            title={opt.label}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${
                              currentType === opt.value
                                ? 'bg-amber-500 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <OptIcon size={11} />
                            <span className="hidden sm:inline">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 flex-1">
                    {renderViz()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* TAB 3: RAW RESPONSES */}
        {activeTab === 'table' && (
          <Card className="bg-white/[0.03] border-white/10 rounded-3xl shadow-none overflow-hidden">
            <CardHeader className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between gap-4 text-left">
              <div>
                <CardTitle className="text-lg font-bold tracking-tight text-white">Todas as respostas</CardTitle>
                <p className="text-slate-400 text-xs font-bold mt-1">
                  {responses?.length || 0} envios · clique nas colunas para ver as respostas completas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    placeholder="Filtrar (nome, loja, resposta)…"
                    value={tableFilter}
                    onChange={e => setTableFilter(e.target.value)}
                    className="bg-slate-950/50 border-white/10 rounded-lg pl-9 h-9 text-xs font-bold min-w-[280px] text-white placeholder:text-slate-500"
                  />
                </div>
                <Button onClick={handleExportCSV} variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold rounded-lg gap-2 h-9 text-xs">
                  <FileSpreadsheet size={14} /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[calc(100vh-360px)]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
                    <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/10">
                      <th className="px-4 py-3 sticky left-0 bg-slate-950/95 z-20">Colaborador</th>
                      <th className="px-4 py-3">Loja</th>
                      <th className="px-4 py-3">Data</th>
                      {questions?.map((q, idx) => (
                        <th key={q.id} className="px-4 py-3 min-w-[200px]">
                          <span className="text-amber-400">Q{idx + 1}</span> · {q.question_text}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRawRows.map(r => (
                      <tr key={r.id} className="hover:bg-white/[0.03] transition-colors align-top">
                        <td className="px-4 py-3 sticky left-0 bg-[#0b1120] hover:bg-slate-900/95 z-10">
                          <div className="text-xs font-bold text-white whitespace-nowrap">
                            {survey?.anonymous ? 'Anônimo' : r.userName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                            <Store size={10} /> {r.storeName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[11px] font-bold text-slate-400">
                            {r.date ? format(new Date(r.date), 'dd MMM yy · HH:mm', { locale: ptBR }) : '—'}
                          </div>
                        </td>
                        {questions?.map(q => (
                          <td key={q.id} className="px-4 py-3 align-top">
                            <div className="text-xs font-medium text-slate-200 max-w-[400px] whitespace-pre-wrap">
                              {r.cells[q.id!] || '—'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRawRows.length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-sm font-bold text-slate-500 italic">Nenhum registro encontrado.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};
