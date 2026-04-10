import { useState, useRef } from 'react';
import { cn } from '../../lib/utils';
import { MapPin } from 'lucide-react';

interface HotspotProps {
  image_url: string;
  configuration: {
    hotspots: Array<{
      id: string;
      x: number; // Porcentagem (0-100)
      y: number; // Porcentagem (0-100)
      radius: number; // Porcentagem
    }>;
  };
  onAnswer: (clickedPoint: {x: number, y: number}) => void;
  isAnswered?: boolean;
  userAnswer?: any;
}

export function HotspotQuestion({ image_url, configuration, onAnswer, isAnswered, userAnswer }: HotspotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastClick, setLastClick] = useState<{x: number, y: number} | null>(userAnswer || null);

  const handleClick = (e: React.MouseEvent) => {
    if (isAnswered || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const clickData = { x, y };
    setLastClick(clickData);
    onAnswer(clickData);
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
      <div 
        ref={containerRef}
        onClick={handleClick}
        className={cn(
          "relative rounded-2xl overflow-hidden border border-white/10 bg-black/20 group",
          !isAnswered && "cursor-crosshair"
        )}
      >
        <img 
          src={image_url} 
          alt="Hotspot Question" 
          className="w-full h-auto block"
        />

        {/* Feedback visual da área de brilho/interação no hover */}
        {!isAnswered && (
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
        )}

        {/* Marcador do clique do usuário */}
        {lastClick && (
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${lastClick.x}%`, top: `${lastClick.y}%` }}
          >
            <div className="relative">
              <div className="absolute inset-0 animate-ping bg-white rounded-full opacity-75" />
              <div className="relative h-8 w-8 bg-[var(--c-primary)] text-white rounded-full flex items-center justify-center shadow-[0_0_20px_var(--c-primary-alpha)] border-2 border-white">
                <MapPin size={16} />
              </div>
            </div>
          </div>
        )}
      </div>
      
      <p className="text-xs text-white/40 text-center italic">Clique no local correto da imagem acima.</p>
    </div>
  );
}
