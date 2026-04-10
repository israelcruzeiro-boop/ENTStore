import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { cn } from '../../lib/utils';
import { CheckCircle2, Star, Maximize2 } from 'lucide-react';

interface WordSearchProps {
  configuration: {
    grid: string[][];
    words: string[];
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  };
  onAnswer: (answer: { foundWords: string[], foundPaths: { word: string, cells: { r: number, c: number }[], color: string }[] }) => void;
  isAnswered?: boolean;
  correctAnswer?: unknown;
  userAnswer?: { foundWords: string[], foundPaths: { word: string, cells: { r: number, c: number }[], color: string }[] };
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
  const gridRef = useRef<HTMLDivElement>(null);

  const grid = configuration.grid;
  const targetWords = configuration.words;

  // Resetar estado quando a configuração mudar (ex: nova pergunta)
  useEffect(() => {
    setFoundWords(userAnswer?.foundWords || []);
    setFoundPaths(userAnswer?.foundPaths || []);
    setSelectedCells([]);
    setIsSelecting(false);
    setLastFound(null);
  }, [configuration, userAnswer]);

  const isSelectingRef = useRef(false);
  const selectedCellsRef = useRef<{r: number, c: number}[]>([]);

  const setSelection = useCallback((cells: {r: number, c: number}[]) => {
     selectedCellsRef.current = cells;
     setSelectedCells(cells);
  }, []);



  const handleCellClick = useCallback((r: number, c: number) => {
    if (isAnswered) return;
    
    isSelectingRef.current = true;
    setIsSelecting(true);
    setSelection([{r, c}]);
    
    // Feedback tátil se disponível
    if (window.navigator.vibrate) window.navigator.vibrate(10);
  }, [isAnswered, setSelection]);

  const handleCellEnter = useCallback((r: number, c: number) => {
    if (!isSelectingRef.current || isAnswered) return;
    
    const prev = selectedCellsRef.current;
    const start = prev[0];
    if (!start) {
      setSelection([{r, c}]);
      return;
    }
    
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
      
      // Evitar redundância se o caminho for o mesmo
      if (JSON.stringify(path) !== JSON.stringify(prev)) {
         setSelection(path);
      }
    }
  }, [isAnswered, setSelection]);

  const normalizeWord = useCallback((w: string) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "").toUpperCase(), []);

  const finalizeSelection = useCallback(() => {
    const currentCells = selectedCellsRef.current;

    if (!isSelectingRef.current || isAnswered || currentCells.length < 2) {
      if (currentCells.length < 2) {
        setSelection([]);
        isSelectingRef.current = false;
        setIsSelecting(false);
      }
      return;
    }
    
    isSelectingRef.current = false;
    setIsSelecting(false);

    const word = currentCells.map(cell => grid[cell.r][cell.c]).join('');
    const reversedWord = word.split('').reverse().join('');
    
    const normalWord = normalizeWord(word);
    const normalReversedWord = normalizeWord(reversedWord);

    const matchOriginal = targetWords.find(tw => {
      const twNormal = normalizeWord(tw);
      return twNormal === normalWord || twNormal === normalReversedWord;
    });

    console.log('[DEBUG WORD SEARCH]', { word, normalWord, normalReversedWord, targetWords, matchFound: !!matchOriginal });

    if (matchOriginal && !foundWords.includes(matchOriginal)) {
      const color = WORD_COLORS[foundPaths.length % WORD_COLORS.length];
      const newPath = { word: matchOriginal, cells: [...currentCells], color };
      
      const newFound = [...foundWords, matchOriginal];
      const newPaths = [...foundPaths, newPath];
      
      setFoundWords(newFound);
      setFoundPaths(newPaths);
      setLastFound(matchOriginal);
      onAnswer({ foundWords: newFound, foundPaths: newPaths });

      if (window.navigator.vibrate) window.navigator.vibrate([10, 30, 10]);

      // Limpar o "last found" após animação
      setTimeout(() => setLastFound(null), 2000);
    }
    
    setSelection([]);
  }, [isAnswered, grid, targetWords, foundWords, foundPaths, onAnswer, normalizeWord, setSelection]);

  // Touch Handlers
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSelectingRef.current || isAnswered || !gridRef.current) return;
    
    // Impede o scroll da página enquanto seleciona no mobile
    if (e.cancelable) e.preventDefault();
    
    const touch = e.touches[0];
    const rect = gridRef.current.getBoundingClientRect();
    
    // Cálculo preciso da célula baseado na posição do toque relativa ao grid
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const numRows = grid.length;
    const numCols = grid[0]?.length || 0;
    
    if (numCols === 0) return;

    const cellWidth = rect.width / numCols;
    const cellHeight = rect.height / numRows;
    
    const r = Math.floor(y / cellHeight);
    const c = Math.floor(x / cellWidth);
    
    // Só processa se estiver dentro dos limites do grid
    if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
      handleCellEnter(r, c);
    }
  }, [isAnswered, handleCellEnter, grid]);

  useEffect(() => {
    const handleGlobalUp = () => {
      // Como o event listener é global, dependemos da ref atualizada para saber se estamos selecionando
      if (isSelectingRef.current) {
         finalizeSelection();
      }
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [finalizeSelection]);

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
    <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Lista de Palavras com Feedback Visual */}
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {targetWords.map((word, idx) => {
          const isFound = foundWords.includes(word);
          const path = foundPaths.find(p => p.word === word);
          return (
            <div 
              key={word} 
              className={cn(
                "px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-sm font-bold border transition-all duration-500 flex items-center gap-1.5 md:gap-2",
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
              {isFound && <CheckCircle2 size={12} className="md:w-[14px] md:h-[14px]" />}
              {word}
            </div>
          );
        })}
      </div>

      {/* Grid do Caça-Palavras com Suporte Mobile e Scroll Horizontal */}
      <div className="relative group w-full flex justify-center overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10">
        <div 
          ref={gridRef}
          onTouchMove={handleTouchMove}
          className={cn(
            "inline-grid gap-1 md:gap-1.5 p-2 md:p-3 bg-slate-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl border border-white/10 select-none shadow-2xl transition-transform duration-300",
            isSelecting && "scale-[1.02] md:scale-100", // Leve "zoom" no mobile ao interagir
            "touch-none" // CRÍTICO: Impede o scroll do navegador ao arrastar
          )}
          style={{ 
            gridTemplateColumns: `repeat(${grid[0]?.length || 0}, minmax(0, 1fr))`,
            touchAction: 'none'
          }}
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
                  data-row={r}
                  data-col={c}
                  onMouseDown={() => handleCellClick(r, c)}
                  onMouseEnter={() => handleCellEnter(r, c)}
                  onTouchStart={(e) => {
                    // Previne comportamentos padrão e inicia seleção
                    e.preventDefault();
                    handleCellClick(r, c);
                  }}
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 md:w-11 md:h-11 flex items-center justify-center rounded-lg md:rounded-xl text-xs md:text-base font-black transition-all duration-200 cursor-pointer relative z-10",
                    !isFound && !isSelected && "bg-white/5 text-white/70 hover:bg-white/10 hover:scale-105",
                    isSelected && "bg-blue-500 text-white scale-110 z-20 shadow-xl shadow-blue-500/50",
                    isAnswered && "cursor-default"
                  )}
                  style={isFound && !isSelected ? {
                    backgroundColor: `${highlightColor}cc`,
                    color: '#fff',
                    boxShadow: `0 0 15px ${highlightColor}40`,
                    transform: lastFound === foundPaths.find(p => p.cells.some(cell => cell.r === r && cell.c === c))?.word ? 'scale(1.05)' : 'scale(1)'
                  } : {}}
                >
                  {char}
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
         <p className="text-[10px] md:text-sm font-medium text-blue-400">
            {foundWords.length === targetWords.length 
              ? "✨ Incrível! Você encontrou todas as palavras!" 
              : `Progresso: ${foundWords.length} de ${targetWords.length} palavras`}
         </p>
         <div className="w-32 md:w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
              style={{ width: `${(foundWords.length / targetWords.length) * 100}%` }}
            />
         </div>
         <p className="md:hidden text-[8px] text-slate-500 uppercase flex items-center gap-1">
           <Maximize2 size={8} /> Deslize o dedo para selecionar
         </p>
      </div>
    </div>
  );
}

