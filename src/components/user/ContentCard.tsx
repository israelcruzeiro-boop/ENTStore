import { Play } from 'lucide-react';
import { Content } from '../../types';
import { Link } from 'react-router-dom';

export const ContentCard = ({ content }: { content: Content }) => {
  return (
    <Link to={`/content/${content.id}`} className="group relative block w-64 md:w-80 flex-shrink-0 snap-start transition-transform duration-300 hover:scale-105 hover:z-10">
      <div className="aspect-video w-full overflow-hidden rounded-md bg-zinc-800 relative">
        <img 
          src={content.thumbnailUrl} 
          alt={content.title} 
          className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
          <div className="w-full flex items-center justify-between">
            <span className="text-white font-medium truncate pr-2">{content.title}</span>
            <div className="w-8 h-8 rounded-full bg-[var(--c-primary)] text-white flex items-center justify-center shrink-0">
              <Play size={16} fill="currentColor" />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-400 group-hover:text-white transition-colors">
        <span>{content.type}</span>
      </div>
    </Link>
  );
};