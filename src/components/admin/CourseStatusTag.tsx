import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CourseStatusTagProps {
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CourseStatusTag: React.FC<CourseStatusTagProps> = ({ 
  status, 
  className,
  size = 'md' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Concluído',
          icon: <CheckCircle2 size={size === 'sm' ? 10 : 12} />,
          styles: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        };
      case 'IN_PROGRESS':
        return {
          label: 'Em Andamento',
          icon: <Clock size={size === 'sm' ? 10 : 12} />,
          styles: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
      case 'NOT_STARTED':
        return {
          label: 'Não Iniciado',
          icon: <AlertCircle size={size === 'sm' ? 10 : 12} />,
          styles: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
      default:
        return {
          label: status,
          icon: <AlertCircle size={size === 'sm' ? 10 : 12} />,
          styles: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 font-black uppercase tracking-[0.1em] border shadow-sm",
        size === 'sm' ? "text-[8px] px-2 py-0.5 rounded-md" : "text-[10px] px-3 py-1 rounded-lg",
        status === 'COMPLETED' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]" :
        status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.15)]" :
        "bg-slate-500/10 text-slate-400 border-slate-500/20",
        className
      )}
    >
      <div className={cn(
        "w-1 h-1 rounded-full animate-pulse",
        status === 'COMPLETED' ? "bg-emerald-400 shadow-[0_0_5px_#10b981]" :
        status === 'IN_PROGRESS' ? "bg-blue-400 shadow-[0_0_5px_#3b82f6]" :
        "bg-slate-400"
      )} />
      {config.label}
    </Badge>
  );
};
