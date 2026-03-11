import { Play, Eye } from 'lucide-react';
import { Content } from '../../types';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

export const ContentCard = ({ content }: { content: Content }) => {
  const { contentViews } = useAppStore();
  
  // Conta quantas vezes esse conteúdo específico foi visualizado
  const views = contentViews.filter(v => v.contentId === content.id).length;

  return (
    <Link to={`/content/${content.id}`} className="group relative block w-64 md:w-80 flex-shrink-0 snap-start transition-transform duration-300 hover:scale-105 hover:z-10">
      <div className="aspect-video w-full overflow-hidden rounded-md bg-zinc-800 relative shadow-md">
        <img 
          src={content.thumbnailUrl} 
          alt={content.title} 
          className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <div className="w-full flex items-center justify-between">
            <span className="text-white font-medium truncate pr-2">{content.title}</span>
            <div className="w-8 h-8 rounded-full bg-[var(--c-primary)] text-white flex items-center justify-center shrink-0 shadow-lg shadow-[var(--c-primary)]/40">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors px-1">
        <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/50 font-medium tracking-wide">
          {content.type}
        </span>
        <span className="flex items-center gap-1.5 font-medium bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800/80 text-zinc-400">
           <Eye size={12} /> {views}
        </span>
      </div>
    </Link>
  );
};