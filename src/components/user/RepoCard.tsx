import { Repository } from '../../types';
import { Link } from 'react-router-dom';

export const RepoCard = ({ repo }: { repo: Repository }) => {
  return (
    <Link to={`/repo/${repo.id}`} className="group block w-48 md:w-56 flex-shrink-0 snap-start">
      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg shadow-lg relative bg-zinc-800 transition-transform duration-300 group-hover:scale-105 group-hover:ring-2 group-hover:ring-[var(--c-primary)]">
        <img 
          src={repo.coverImage} 
          alt={repo.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold leading-tight">{repo.name}</h3>
        </div>
      </div>
    </Link>
  );
};