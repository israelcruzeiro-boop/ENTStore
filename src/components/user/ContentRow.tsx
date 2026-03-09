import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ContentRowProps {
  title: string;
  children: React.ReactNode;
}

export const ContentRow = ({ title, children }: ContentRowProps) => {
  return (
    <div className="mb-10 pl-4 md:pl-12">
      <h2 className="text-xl md:text-2xl font-semibold text-[var(--c-text)] mb-4 flex items-center group cursor-pointer w-fit">
        {title}
        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[var(--c-primary)]" />
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 snap-x snap-mandatory hide-scrollbar pr-12">
        {children}
      </div>
    </div>
  );
};