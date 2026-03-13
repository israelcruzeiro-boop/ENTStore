import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore, checkRepoAccess } from '../../store/useAppStore';
import { ContentCard } from '../../components/user/ContentCard';
import { RepoCard } from '../../components/user/RepoCard';
import { Search as SearchIcon, ExternalLink, PlayCircle, Link as LinkIcon, Library } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

export const UserBusca = () => {
  const { company, user } = useAuth();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { repositories, contents, simpleLinks, orgUnits, orgTopLevels } = useAppStore();
  
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);

  const companyRepos = repositories.filter(r => {
     if (r.companyId !== company?.id || r.status !== 'ACTIVE') return false;
     return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });
  
  const repoIds = companyRepos.map(r => r.id);

  const filteredRepos = companyRepos.filter(r => r.name.toLowerCase().includes(query.toLowerCase()));
  
  const filteredContents = contents.filter(c => 
    repoIds.includes(c.repositoryId) && 
    c.status === 'ACTIVE' && 
    (c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
  );

  const filteredLinks = simpleLinks.filter(l => 
    repoIds.includes(l.repositoryId) && 
    l.status === 'ACTIVE' && 
    (l.name.toLowerCase().includes(query.toLowerCase()) || l.url.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-7xl mx-auto min-h-screen">
      <div className="relative mb-10 max-w-2xl mx-auto">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-400" size={24} />
        <input 
          type="text"
          placeholder="Buscar conteúdos, hubs, links..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-full py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all shadow-lg"
          autoFocus
        />
      </div>

      {!query ? (
         <div className="text-center text-zinc-500 mt-20 flex flex-col items-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
               <SearchIcon size={40} className="text-zinc-600" />
            </div>
            <p className="text-xl text-white font-medium mb-2">Pronto para buscar?</p>
            <p className="text-zinc-400 max-w-sm">Digite o que você procura para pesquisarmos em todos os hubs e bibliotecas liberados para você.</p>
         </div>
      ) : (
        <div className="space-y-12">
          {filteredRepos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Library size={20} className="text-[var(--c-primary)]" />
                <h2 className="text-xl font-bold text-white">Hubs e Bibliotecas</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
                {filteredRepos.map(repo => (
                   <RepoCard key={repo.id} repo={repo} fullWidth />
                ))}
              </div>
            </div>
          )}

          {filteredContents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 border-t border-zinc-800/50 pt-8">
                <PlayCircle size={20} className="text-[var(--c-primary)]" />
                <h2 className="text-xl font-bold text-white">Conteúdos em Hubs</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredContents.map(content => (
                   <ContentCard key={content.id} content={content} fullWidth />
                ))}
              </div>
            </div>
          )}

          {filteredLinks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-6 border-t border-zinc-800/50 pt-8">
                <LinkIcon size={20} className="text-[var(--c-primary)]" />
                <h2 className="text-xl font-bold text-white">Links em Bibliotecas</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {filteredLinks.map(link => (
                  <Link key={link.id} to={`/${slug}/repo/${link.repositoryId}`} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 flex justify-between items-center group transition-all">
                    <div className="overflow-hidden">
                      <h3 className="text-white font-medium group-hover:text-[var(--c-primary)] transition-colors truncate">{link.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5 truncate">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-medium">{link.type}</span> 
                        {link.url}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-[var(--c-primary)] flex items-center justify-center transition-colors shrink-0 ml-4">
                       <ExternalLink size={16} className="text-zinc-400 group-hover:text-white" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {filteredRepos.length === 0 && filteredContents.length === 0 && filteredLinks.length === 0 && (
            <div className="text-center text-zinc-500 mt-20">
              <p className="text-xl text-white font-medium mb-2">Nenhum resultado</p>
              <p className="text-zinc-400">Não encontramos nada para "{query}".</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};