import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { ContentCard } from '../../components/user/ContentCard';
import { ArrowLeft, Lock, Filter, Calendar, ExternalLink, Link as LinkIcon } from 'lucide-react';

export const RepositoryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { repositories, categories: allCategories, contents: allContents, simpleLinks } = useAppStore();

  const repo = repositories.find(r => r.id === id && r.status === 'ACTIVE');
  
  const isAuthorized = user?.role !== 'USER' || repo?.accessType !== 'RESTRICTED' || repo?.allowedUserIds?.includes(user?.id || '');

  // Estados para os filtros (Apenas para Repositório Simples)
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  if (!repo) {
     return <div className="p-12 text-center text-zinc-500 mt-20">Repositório inativo ou não encontrado.</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
         <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Lock size={24} className="text-[var(--c-primary)]" />
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
         <p className="max-w-md mb-6">Você não tem permissão para acessar os conteúdos deste repositório.</p>
         <Link to="/" className="px-6 py-2.5 rounded-md bg-[var(--c-primary)] text-white font-medium hover:bg-opacity-80 transition-colors">
            Voltar ao Início
         </Link>
      </div>
    );
  }

  const isSimple = repo.type === 'SIMPLE';

  // --- DADOS REPOSITÓRIO COMPLETO ---
  const categories = allCategories.filter(c => c.repositoryId === id);
  const contents = allContents.filter(c => c.repositoryId === id && c.status === 'ACTIVE');

  // --- DADOS REPOSITÓRIO SIMPLES ---
  const rawLinks = simpleLinks.filter(l => l.repositoryId === id && l.status === 'ACTIVE');
  
  // Extrai tipos únicos para o filtro
  const availableTypes = useMemo(() => {
    const types = new Set(rawLinks.map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [rawLinks]);

  // Aplica os filtros
  const filteredLinks = useMemo(() => {
    return rawLinks.filter(l => {
      const matchType = filterType === 'ALL' || l.type === filterType;
      const matchDate = !filterDate || l.date === filterDate;
      return matchType && matchDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawLinks, filterType, filterDate]);

  return (
    <div className="pb-12 min-h-screen">
      {/* Banner */}
      <div className="relative h-[30vh] md:h-[40vh] w-full mb-8 bg-zinc-900 overflow-hidden">
         {repo.bannerImage || repo.coverImage ? (
           <img src={repo.bannerImage || repo.coverImage} alt={repo.name} className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950"></div>
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[var(--c-bg)]/80 to-transparent"></div>
         <Link to="/" className="absolute top-24 left-4 md:left-12 flex items-center gap-2 text-zinc-300 hover:text-white transition-colors z-10 font-medium">
            <ArrowLeft size={20} /> Voltar
         </Link>
         <div className="absolute bottom-0 left-4 md:left-12 pb-8 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--c-primary)] text-white">
                {isSimple ? 'Lista de Links' : 'Repositório'}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-lg">{repo.name}</h1>
            <p className="text-zinc-300 max-w-2xl line-clamp-2 md:line-clamp-none text-sm md:text-base drop-shadow-md">{repo.description}</p>
         </div>
      </div>

      <div className="px-4 md:px-12 max-w-7xl mx-auto">
        
        {isSimple ? (
          /* =========================================
             LAYOUT: REPOSITÓRIO SIMPLES (LINKS)
             ========================================= */
          <div className="space-y-6">
             {/* Barra de Filtros */}
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                <div className="flex items-center gap-2 text-zinc-400 mr-2 shrink-0">
                  <Filter size={18} /> <span className="text-sm font-medium">Filtros:</span>
                </div>
                
                <div className="flex-1 w-full sm:w-auto">
                   <select 
                     value={filterType} 
                     onChange={(e) => setFilterType(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] block p-2.5"
                   >
                     <option value="ALL">Todos os Tipos</option>
                     {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>

                <div className="flex-1 w-full sm:w-auto">
                   <input 
                     type="date" 
                     value={filterDate} 
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] block p-2.5 style-date"
                   />
                </div>

                {(filterType !== 'ALL' || filterDate) && (
                   <button 
                     onClick={() => {setFilterType('ALL'); setFilterDate('');}}
                     className="text-xs text-zinc-400 hover:text-white underline whitespace-nowrap px-2"
                   >
                     Limpar Filtros
                   </button>
                )}
             </div>

             {/* Lista de Links */}
             <div className="space-y-3">
               {filteredLinks.map(link => (
                 <a 
                   key={link.id} 
                   href={link.url} 
                   target="_blank" 
                   rel="noreferrer"
                   className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[var(--c-primary)] hover:bg-zinc-800/50 transition-all gap-4"
                 >
                    <div className="flex items-start sm:items-center gap-4">
                       <div className="w-10 h-10 rounded-full bg-black/50 border border-zinc-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform group-hover:text-[var(--c-primary)] group-hover:border-[var(--c-primary)] text-zinc-400">
                          <LinkIcon size={18} />
                       </div>
                       <div>
                          <h3 className="text-white font-medium text-lg group-hover:text-[var(--c-primary)] transition-colors">{link.name}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 font-medium">
                            <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">{link.type}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          </div>
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-sm text-[var(--c-primary)] font-medium bg-[var(--c-primary)]/10 px-4 py-2 rounded-lg group-hover:bg-[var(--c-primary)] group-hover:text-white transition-colors shrink-0">
                       Acessar <ExternalLink size={16} />
                    </div>
                 </a>
               ))}
               {filteredLinks.length === 0 && (
                  <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-zinc-500">
                    <LinkIcon size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-lg">Nenhum link encontrado.</p>
                    <p className="text-sm">Tente limpar os filtros ou verifique mais tarde.</p>
                  </div>
               )}
             </div>
          </div>
        ) : (
          /* =========================================
             LAYOUT: REPOSITÓRIO COMPLETO (NETFLIX)
             ========================================= */
          <div>
            <div className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar border-b border-zinc-800 pb-2">
                <button className="px-4 py-2 text-white border-b-2 border-[var(--c-primary)] font-medium whitespace-nowrap">Todos os Conteúdos</button>
                {categories.map(cat => (
                    <button key={cat.id} className="px-4 py-2 text-zinc-500 hover:text-zinc-300 font-medium whitespace-nowrap transition-colors">
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {contents.map(content => (
                    <div key={content.id} className="w-full">
                        <ContentCard content={content} />
                    </div>
                ))}
                {contents.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500">
                        Nenhum conteúdo liberado neste repositório ainda.
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};