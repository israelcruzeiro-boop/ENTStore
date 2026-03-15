import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface ContentRowProps {
  title: string;
  children: React.ReactNode;
}

export const ContentRow = ({ title, children }: ContentRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();
      // Verificação extra para conteúdos carregados dinamicamente
      const timeoutId = setTimeout(checkScroll, 800);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        clearTimeout(timeoutId);
      };
    }
  }, [children]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="mb-8 md:mb-10 group/row relative">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3 flex items-center group cursor-pointer w-fit tracking-wide">
        {title}
        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[var(--c-primary)]" />
      </h2>
      
      <div className="relative">
        {/* Seta Esquerda */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll('left')}
            className="hidden md:flex absolute -left-4 top-[calc(50%-1.5rem)] -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl group/btn"
            aria-label="Anterior"
          >
            <ChevronLeft size={28} className="group-hover/btn:-translate-x-0.5 transition-transform" />
          </button>
        )}

        <div 
          ref={scrollRef}
          className="flex gap-4 md:gap-5 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          {children}
        </div>

        {/* Seta Direita */}
        {showRightArrow && (
          <button 
            onClick={() => scroll('right')}
            className="hidden md:flex absolute -right-4 top-[calc(50%-1.5rem)] -translate-y-1/2 z-20 w-12 h-12 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-300 shadow-2xl group/btn"
            aria-label="Próximo"
          >
            <ChevronRight size={28} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};