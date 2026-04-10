import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Circle } from 'lucide-react';

interface CourseNeonStatusProps {
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
  className?: string;
}

export const CourseNeonStatus: React.FC<CourseNeonStatusProps> = ({ status, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'COMPLETED':
        return {
          label: 'Concluído',
          icon: <CheckCircle2 size={10} />,
          // Neon Verde: Fundo esmeralda ultra translúcido, texto esmeralda brilhante, sombra de glow esmeralda
          container: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.4)]",
          dot: "bg-emerald-400 shadow-[0_0_8px_#10b981]"
        };
      case 'IN_PROGRESS':
        return {
          label: 'Em Andamento',
          icon: <Clock size={10} />,
          // Neon Azul: Fundo ciano translúcido, texto ciano, sombra de glow azul
          container: "bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.4)]",
          dot: "bg-blue-400 shadow-[0_0_8px_#3b82f6] animate-pulse"
        };
      case 'NOT_STARTED':
      default:
        return {
          label: 'Não Iniciado',
          icon: <Circle size={10} />,
          // Glassmorphism: Quase invisível, borda branca sutil
          container: "bg-white/5 text-white/70 border-white/10 backdrop-blur-sm",
          dot: "bg-white/20"
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500",
      config.container,
      className
    )}>
      <div className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      <span className="drop-shadow-sm">{config.label}</span>
      <div className="ml-0.5 opacity-60">
        {config.icon}
      </div>
    </div>
  );
};
