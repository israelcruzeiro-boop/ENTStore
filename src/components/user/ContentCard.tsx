import { Play, Eye, Star, Image as ImageIcon } from 'lucide-react';
import { Content, ContentViewMetric, ContentRating } from '../../types';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';

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
    <Link to={`/${slug}/content/${content.id}`} className={`group relative block flex-shrink-0 snap-start outline-none transition-all duration-300 hover:scale-105 focus-visible:scale-105 hover:z-10 focus-visible:z-10 ${fullWidth ? 'w-full' : 'w-64 md:w-[320px]'}`}>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-[#111] relative shadow-lg flex items-center justify-center group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:ring-1 group-hover:ring-white/30 group-focus-visible:ring-2 group-focus-visible:ring-white transition-all transform-gpu">
        {displayThumbnail ? (
          <img 
            src={displayThumbnail} 
            alt={content.title} 
            className="w-full h-full object-cover transition-opacity group-hover:opacity-70"
          />
        ) : (
          <ImageIcon size={32} className="text-zinc-600 opacity-50" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/95 via-[#050505]/20 to-transparent flex items-end p-4">
          <div className="w-full flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
            <span className="text-white font-bold tracking-tight truncate pr-2 drop-shadow-md text-sm md:text-base">{content.title}</span>
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110 shadow-xl border border-white/10">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 flex flex-col gap-2 px-1">
        <div className="flex items-center justify-between text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">
          <span className="px-2 py-0.5 rounded border border-zinc-700 bg-zinc-800/50 font-medium tracking-wide">
            {content.type}
          </span>
          <span className="flex items-center gap-1.5 font-medium bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800/80 text-zinc-400">
            <Eye size={12} /> {viewCount}
          </span>
        </div>
        
        <div className="flex items-center gap-1 font-medium text-amber-400 text-xs">
          <Star size={12} fill="currentColor" /> {avgRating} 
          <span className="text-zinc-500 font-normal ml-0.5">
            ({contentRatings.length} {contentRatings.length === 1 ? 'avaliação' : 'avaliações'})
          </span>
        </div>
      </div>
    </Link>
  );
};