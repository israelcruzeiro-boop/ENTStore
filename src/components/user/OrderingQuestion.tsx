import { useState } from 'react';
import { cn } from '../../lib/utils';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface OrderingProps {
  configuration: {
    items: string[];
  };
  onAnswer: (orderedItems: string[]) => void;
  isAnswered?: boolean;
  userAnswer?: any;
}

export function OrderingQuestion({ configuration, onAnswer, isAnswered, userAnswer }: OrderingProps) {
  const [items, setItems] = useState<string[]>(userAnswer?.items || [...configuration.items].sort(() => Math.random() - 0.5));

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isAnswered) return;
    
    const newItems = [...items];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= items.length) return;
    
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, movedItem);
    
    setItems(newItems);
    onAnswer(newItems);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3">
        {items.map((item, idx) => (
          <div 
            key={`${item}-${idx}`}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl border transition-all",
              "bg-white/5 border-white/10 hover:bg-white/10",
              isAnswered && "opacity-80"
            )}
          >
            <div className="flex flex-col gap-1 shrink-0">
               <button 
                onClick={() => moveItem(idx, 'up')}
                disabled={isAnswered || idx === 0}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-20 transition-colors"
               >
                <ArrowUp size={14} />
               </button>
               <button 
                onClick={() => moveItem(idx, 'down')}
                disabled={isAnswered || idx === items.length - 1}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-20 transition-colors"
               >
                <ArrowDown size={14} />
               </button>
            </div>

            <div className="h-10 w-10 flex items-center justify-center bg-[var(--c-primary)] text-white rounded-lg font-bold shrink-0 shadow-lg shadow-[var(--c-primary-alpha)]">
              {idx + 1}
            </div>

            <span className="flex-1 font-medium text-white/90">{item}</span>
            
            <GripVertical className="text-white/20 shrink-0" size={20} />
          </div>
        ))}
      </div>
      <p className="text-xs text-white/40 text-center italic">Use as setas para colocar os itens na ordem correta.</p>
    </div>
  );
}
