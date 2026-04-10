import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Star } from 'lucide-react';

interface WordSearchProps {
  configuration: {
    grid: string[][];
    words: string[];
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  };
  onAnswer: (foundWords: string[]) => void;
  isAnswered?: boolean;
  correctAnswer?: any;
  userAnswer?: any;
}

// Paleta de cores vibrantes e premium para o caça-palavras
const WORD_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#a855f7', // purple
];

export function WordSearchQuestion({ configuration, onAnswer, isAnswered, userAnswer }: WordSearchProps) {
  const [selectedCells, setSelectedCells] = useState<{r: number, c: number}[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [foundWords, setFoundWords] = useState<string[]>(userAnswer?.foundWords || []);
  const [foundPaths, setFoundPaths] = useState<{word: string, cells: {r: number, c: number}[], color: string}[]>([]);
  const [lastFound, setLastFound] = useState<string | null>(null);

  const grid = configuration.grid;
  const targetWords = configuration.words;

  // Carregar caminhos já encontrados se o userAnswer existir
  useEffect(() => {
    if (userAnswer?.foundPaths) {
      setFoundPaths(userAnswer.foundPaths);
    }
  }, [userAnswer]);

  const handleCellClick = (r: number, c: number) => {
    if (isAnswered) return;
    
    setIsSelecting(true);
    setSelectedCells([{r, c}]);
  };

  const handleCellEnter = (r: number, c: number) => {
    if (!isSelecting || isAnswered) return;
    
    setSelectedCells(prev => {
      const start = prev[0];
      if (!start) return [{r, c}];
      
      const dr = Math.abs(r - start.r);
      const dc = Math.abs(c - start.c);
      
      if (dr === 0 || dc === 0 || dr === dc) {
        const path: {r: number, c: number}[] = [];
        const steps = Math.max(dr, dc);
        const sr = r > start.r ? 1 : (r < start.r ? -1 : 0);
        const sc = c > start.c ? 1 : (c < start.c ? -1 : 0);
        
        for (let i = 0; i <= steps; i++) {
          path.push({ r: start.r + i * sr, c: start.c + i * sc });
        }
        return path;
      }
      return prev;
    });
  };

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || isAnswered) return;
    setIsSelecting(false);

    const word = selectedCells.map(cell => grid[cell.r][cell.c]).join('');
    const reversedWord = word.split('').reverse().join('');

    const match = targetWords.find(tw => tw.toUpperCase() === word.toUpperCase() || tw.toUpperCase() === reversedWord.toUpperCase());

    if (match && !foundWords.includes(match)) {
      const color = WORD_COLORS[foundPaths.length % WORD_COLORS.length];
      const newPath = { word: match, cells: [...selectedCells], color };
      
      const newFound = [...foundWords, match];
      const newPaths = [...foundPaths, newPath];
      
      setFoundWords(newFound);
      setFoundPaths(newPaths);
      setLastFound(match);
      onAnswer(newFound);

      // Limpar o "last found" após animação
      setTimeout(() => setLastFound(null), 2000);
    }
    
    setSelectedCells([]);
  }, [isSelecting, isAnswered, selectedCells, grid, targetWords, foundWords, foundPaths, onAnswer]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) handleMouseUp();
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, handleMouseUp]);

  // Mapa de células para cores de palavras encontradas
  const cellHighlights = useMemo(() => {
    const map: Record<string, string> = {};
    foundPaths.forEach(p => {
      p.cells.forEach(cell => {
        map[`${cell.r}-${cell.c}`] = p.color;
      });
    });
    return map;
  }, [foundPaths]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Lista de Palavras com Feedback Visual */}
      <div className="flex flex-wrap justify-center gap-3">
        {targetWords.map((word, idx) => {
          const isFound = foundWords.includes(word);
          const path = foundPaths.find(p => p.word === word);
          return (
            <div 
              key={word} 
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-bold border transition-all duration-500 flex items-center gap-2",
                isFound 
                  ? "shadow-lg scale-105" 
                  : "bg-white/5 border-white/10 text-white/40",
                lastFound === word && "animate-bounce"
              )}
              style={isFound ? { 
                backgroundColor: `${path?.color}20`, 
                borderColor: path?.color,
                color: path?.color 
              } : {}}
            >
              {isFound && <CheckCircle2 size={14} />}
              {word}
            </div>
          );
        })}
      </div>

      {/* Grid do Caça-Palavras */}
      <div className="relative group">
        <div 
          className="inline-grid gap-1.5 p-3 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-white/10 select-none mx-auto shadow-2xl overflow-auto max-w-full"
          style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) => (
            row.map((char, c) => {
              const cellKey = `${r}-${c}`;
              const isSelected = selectedCells.some(cell => cell.r === r && cell.c === c);
              const highlightColor = cellHighlights[cellKey];
              const isFound = !!highlightColor;

              return (
                <div
                  key={cellKey}
                  onMouseDown={() => handleCellClick(r, c)}
                  onMouseEnter={() => handleCellEnter(r, c)}
                  className={cn(
                    "w-9 h-9 md:w-11 md:h-11 flex items-center justify-center rounded-xl text-sm md:text-base font-black transition-all duration-200 cursor-pointer relative z-10",
                    !isFound && !isSelected && "bg-white/5 text-white/70 hover:bg-white/10 hover:scale-105",
                    isSelected && "bg-blue-500 text-white scale-110 z-20 shadow-xl shadow-blue-500/50",
                    isAnswered && "cursor-default"
                  )}
                  style={isFound && !isSelected ? {
                    backgroundColor: `${highlightColor}dd`,
                    color: '#fff',
                    boxShadow: `0 0 15px ${highlightColor}40`,
                    transform: lastFound === foundPaths.find(p => p.cells.some(cell => cell.r === r && cell.c === c))?.word ? 'scale(1.05)' : 'scale(1)'
                  } : {}}
                >
                  {char}
                  {/* Pequena estrela se foi a última encontrada */}
                  {isFound && lastFound === foundPaths.find(p => p.cells.some(cell => cell.r === r && cell.c === c))?.word && (
                    <Star size={8} className="absolute -top-1 -right-1 text-white fill-white animate-pulse" />
                  )}
                </div>
              );
            })
          ))}
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-2">
         <p className="text-sm font-medium text-blue-400">
            {foundWords.length === targetWords.length 
              ? "✨ Incrível! Você encontrou todas as palavras!" 
              : `Progresso: ${foundWords.length} de ${targetWords.length} palavras`}
         </p>
         <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
              style={{ width: `${(foundWords.length / targetWords.length) * 100}%` }}
            />
         </div>
      </div>
    </div>
  );
}
