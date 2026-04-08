import { Play, Eye, Star, Image as ImageIcon, Download } from 'lucide-react';
import { Content, ContentViewMetric, ContentRating } from '../../types';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { downloadFile } from '../../utils/download';

interface ContentCardProps {
  content: Content;
  fullWidth?: boolean;
  views?: ContentViewMetric[];
  ratings?: ContentRating[];
}

export const ContentCard = ({ content, fullWidth = false, views: viewsProp, ratings: ratingsProp }: ContentCardProps) => {
  const { slug } = useTenant();
  
  const viewCount = viewsProp ? viewsProp.filter(v => v.content_id === content.id).length : 0;
  
  const contentRatings = ratingsProp ? ratingsProp.filter(r => r.content_id === content.id) : [];
  const avgRating = contentRatings.length > 0 ? (contentRatings.reduce((acc, curr) => acc + curr.rating, 0) / contentRatings.length).toFixed(1) : '-';

  const getDisplayThumbnail = () => {
    if (content.thumbnail_url) return content.thumbnail_url;
    
    if (content.type === 'VIDEO' || content.type === 'MUSIC') {
      const url = content.embed_url || content.url;
      // Regex aprimorada para incluir Shorts
      const ytMatch = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
      if (ytMatch && ytMatch[1]) {
         return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
      }
    }
    return null;
  };

  const displayThumbnail = getDisplayThumbnail();

  return (
    <Link to={`/${slug}/content/${content.id}`} className={`group relative block flex-shrink-0 snap-start outline-none transition-all duration-300 hover:z-10 focus-visible:z-10 ${fullWidth ? 'w-full' : 'w-56 md:w-[280px]'}`}>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-zinc-900 relative flex items-center justify-center group-hover:ring-2 group-hover:ring-[var(--c-primary)]/50 group-focus-visible:ring-2 group-focus-visible:ring-white transition-all transform-gpu">
        {displayThumbnail ? (
          <img 
            src={displayThumbnail} 
            alt={content.title} 
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"
          />
        ) : (
          <ImageIcon size={24} className="text-zinc-700 opacity-40" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <div className="w-full flex items-center justify-between">
            <span className="text-white font-medium tracking-tight truncate pr-2 text-xs md:text-sm">{content.title}</span>
            <div className="flex gap-2 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  downloadFile(content.url, content.title);
                }}
                className="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-[var(--c-primary)]"
                title="Baixar agora"
              >
                <Download size={12} />
              </button>
              <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all shadow-lg">
                <Play size={12} fill="currentColor" className="ml-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-2.5 flex flex-col gap-1.5 px-0.5">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span className="px-1.5 py-0.5 rounded-md border border-zinc-800 bg-zinc-900/50 font-bold tracking-wider uppercase">
            {content.type}
          </span>
          <span className="flex items-center gap-1 font-medium text-zinc-600">
            <Eye size={10} /> {viewCount}
          </span>
        </div>
        
        <div className="flex items-center gap-1 font-bold text-amber-500/80 text-[10px] uppercase tracking-tighter">
          <Star size={10} fill="currentColor" /> {avgRating} 
          <span className="text-zinc-600 font-medium ml-0.5">
            ({contentRatings.length})
          </span>
        </div>
      </div>
    </Link>
  );
};