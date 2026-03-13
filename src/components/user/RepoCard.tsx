import { Repository } from '../../types';
import { Link, useParams } from 'react-router-dom';
import { Folder, PlaySquare } from 'lucide-react';

export const RepoCard = ({ repo, fullWidth = false }: { repo: Repository, fullWidth?: boolean }) => {
  const isSimple = repo.type === 'SIMPLE';
  const { slug } = useParams();

  return (
    <Link to={`/${slug}/repo/${repo.id}`} className={`group block flex-shrink-0 snap-start ${fullWidth ? 'w-full' : 'w-28 md:w-32'}`}>
      <div className="aspect-square w-full overflow-hidden rounded-lg shadow-md relative bg-zinc-800 transition-transform duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-[var(--c-primary)]">
        {repo.coverImage ? (
          <img 
            src={repo.coverImage} 
            alt={repo.name} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800/80">
            {isSimple ? <Folder className="text-zinc-600" size={28} /> : <PlaySquare className="text-zinc-600" size={32} />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-2 md:p-3">
          <h3 className="text-white font-bold leading-tight text-[11px] sm:text-xs md:text-sm">{repo.name}</h3>
        </div>
      </div>
    </Link>
  );
};