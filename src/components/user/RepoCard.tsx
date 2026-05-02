import { Repository } from '../../types';
import { Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { Folder, PlaySquare, MonitorPlay, Music } from 'lucide-react';

export const RepoCard = ({ repo, fullWidth = false, onCardClick }: { repo: Repository, fullWidth?: boolean, onCardClick?: (e: React.MouseEvent, repoId: string) => void }) => {
  const isSimple = repo.type === 'SIMPLE';
  const isPlaylist = repo.type === 'PLAYLIST';
  const isVideoPlaylist = repo.type === 'VIDEO_PLAYLIST';
  const { slug } = useTenant();

  return (
    <Link 
      to={`/${slug}/repo/${repo.id}`} 
      onClick={(e) => {
        if (onCardClick) {
          e.preventDefault();
          onCardClick(e, repo.id);
        }
      }}
      className={`group user-card block flex-shrink-0 snap-start outline-none ${fullWidth ? 'w-full' : 'w-32 md:w-40'}`}
    >
      <div className="aspect-[2/3] user-template-panel w-full overflow-hidden rounded-xl shadow-lg relative bg-[var(--c-card)] transition-all duration-300 transform-gpu group-hover:scale-105 group-hover:shadow-[0_0_30px_rgb(var(--c-primary-rgb)/0.18)] group-hover:ring-1 group-hover:ring-[var(--c-primary)]/35 group-focus-visible:scale-105 group-focus-visible:ring-2 group-focus-visible:ring-[var(--c-primary)]">
        {repo.cover_image ? (
          <img 
            src={repo.cover_image} 
            alt={repo.name} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center theme-surface-soft">
            {isSimple ? <Folder className="text-zinc-600" size={28} /> : isPlaylist ? <Music className="text-zinc-600" size={32} /> : isVideoPlaylist ? <PlaySquare className="text-zinc-600" size={32} /> : <MonitorPlay className="text-zinc-600" size={32} />}
          </div>
        )}

        {/* Badge de Tipo com Ícone */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <div className="p-1.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-2xl flex items-center justify-center group-hover:bg-black/60 transition-colors">
            {isPlaylist ? <Music size={12} strokeWidth={2.5} /> : isVideoPlaylist ? <PlaySquare size={12} strokeWidth={2.5} /> : isSimple ? <Folder size={12} strokeWidth={2.5} /> : <MonitorPlay size={12} strokeWidth={2.5} />}
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <h3 className="text-white font-bold leading-snug text-xs md:text-sm drop-shadow-md">{repo.name}</h3>
        </div>
      </div>
    </Link>
  );
};
