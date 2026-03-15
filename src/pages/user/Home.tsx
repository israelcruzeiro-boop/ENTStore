import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext'; // Restaurado pois é necessário para o slug
import { useOrgStructure, useRepositories, useContents, useSimpleLinks, useCompanyMetrics } from '../../hooks/useSupabaseData';
import { checkRepoAccess } from '../../lib/permissions';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';
import { Search, Library, PlayCircle, Link as LinkIcon, ExternalLink, MonitorPlay } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeaderLayout } from '../../components/user/HeaderLayout';


export const UserHome = () => {
  const { company, user } = useAuth();
  const { slug } = useTenant();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // SWR Hooks para dados do Supabase
  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { contents, isLoading: loadingContents } = useContents({ companyId: company?.id });
  const { simpleLinks, isLoading: loadingLinks } = useSimpleLinks({ companyId: company?.id });
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);
  const { contentViews, contentRatings, isLoading: loadingMetrics } = useCompanyMetrics(company?.id);

  const isLoading = loadingRepos || loadingContents || loadingLinks || loadingOrg || loadingMetrics;

  // Filtra dados do Supabase usando a função global de validação
  const companyRepos = repositories.filter(r => {
     if (r.company_id !== company?.id || r.status !== 'ACTIVE') return false;
     return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });
  
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repository_id) && c.status === 'ACTIVE');
  const companyLinks = simpleLinks.filter(l => repoIds.includes(l.repository_id) && l.status === 'ACTIVE');

  // Separação entre Hubs (Completos/Playlists) e Bibliotecas (Simples)
  const hubRepos = companyRepos.filter(r => r.type === 'FULL' || r.type === 'PLAYLIST' || r.type === 'VIDEO_PLAYLIST' || !r.type);
  const libraryRepos = companyRepos.filter(r => r.type === 'SIMPLE');

  // Listas padrão para a Home (quando a busca está vazia)
  const featuredHubs = hubRepos.filter(r => r.featured);
  const featuredLibs = libraryRepos.filter(r => r.featured);
  const recentContents = companyContents.filter(c => c.recent);

  // Listas para a Busca
  const query = searchQuery.toLowerCase().trim();
  const filteredHubs = query ? hubRepos.filter(r => r.name.toLowerCase().includes(query)) : [];
  const filteredLibs = query ? libraryRepos.filter(r => r.name.toLowerCase().includes(query)) : [];
  const filteredContents = query ? companyContents.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)) : [];
  const filteredLinks = query ? companyLinks.filter(l => l.name.toLowerCase().includes(query) || l.url.toLowerCase().includes(query)) : [];

  const hero_image = company?.hero_image || (companyRepos.length > 0 ? (companyRepos[0].banner_image || companyRepos[0].cover_image) : null);
  const hero_title = company?.hero_title || (companyRepos.length > 0 ? companyRepos[0].name : `Bem-vindo à ${company?.name}`);
  const hero_subtitle = company?.hero_subtitle || (companyRepos.length > 0 ? companyRepos[0].description : 'Explore os hubs e bibliotecas exclusivas da sua plataforma corporativa.');

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredHubsByMain = activeFilter ? hubRepos.filter(r => r.type === activeFilter) : hubRepos;
  const filteredLibsByMain = activeFilter ? libraryRepos.filter(r => r.type === activeFilter) : libraryRepos;

  const filters = [
    { id: 'FULL', label: 'Hubs', icon: <MonitorPlay size={14} /> },
    { id: 'PLAYLIST', label: 'Playlists', icon: <PlayCircle size={14} /> },
    { id: 'VIDEO_PLAYLIST', label: 'Vídeos', icon: <PlayCircle size={14} /> },
    { id: 'SIMPLE', label: 'Links', icon: <Library size={14} /> },
  ];

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
         navigate(`/${slug}/busca?q=${encodeURIComponent(searchQuery)}`);
      }
  };

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: company?.theme?.background || '#050505' }}
      >
        <div className="w-12 h-12 border-4 border-[var(--c-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-10 pt-0 min-h-screen text-white">
      <HeaderLayout 
        layout={company?.landing_page_layout || 'classic'}
        theme={company?.theme || { primary: '#2563EB', secondary: '#1D4ED8', background: '#09090b', card: '#18181b', text: '#ffffff' }}
        image={hero_image || ''}
        title={hero_title}
        subtitle={hero_subtitle}
        position={company?.hero_position}
        brightness={company?.hero_brightness}
        align="left"
      >
        <div className="relative max-w-sm mt-8">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" size={20} />
           <input
              type="text"
              placeholder="Busca"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="w-full bg-white/5 backdrop-blur-xl border border-[var(--c-primary)]/30 hover:border-[var(--c-primary)]/50 rounded-full py-3 pl-14 pr-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)] transition-all shadow-2xl placeholder:text-white/40"
           />
        </div>
      </HeaderLayout>

      <div className="w-full px-4 md:px-8 mt-4 relative z-20">
         <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setActiveFilter(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${!activeFilter ? 'bg-[var(--c-primary)] text-white border-[var(--c-primary)] shadow-[0_0_20px_var(--c-primary-rgb),0.3]' : 'bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-black/60'}`}
            >
              Todos
            </button>
            {filters.map(f => (
              <button 
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeFilter === f.id ? 'bg-[var(--c-primary)] text-white border-[var(--c-primary)] shadow-[0_0_20px_var(--c-primary-rgb),0.3]' : 'bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-black/60'}`}
              >
                {f.icon} {f.label}
              </button>
            ))}
         </div>
      </div>

      <div className="w-full mt-6 md:mt-8 px-4 md:px-8 relative z-10">
         {query ? (
// ... resto do componente ...
           <div className="space-y-12 animate-in fade-in duration-300">
             {filteredHubs.length === 0 && filteredLibs.length === 0 && filteredContents.length === 0 && filteredLinks.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                     <Search size={28} className="text-zinc-600" />
                  </div>
                  <p className="text-xl text-white font-medium mb-2">Nenhum resultado</p>
                  <p className="text-zinc-400">Não encontramos nada para "{query}".</p>
                </div>
             ) : (
                <>
                  {filteredHubs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <MonitorPlay size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl font-bold text-white">Hubs</h2>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
                        {filteredHubs.map(repo => (
                           <RepoCard key={repo.id} repo={repo} fullWidth />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredLibs.length > 0 && (
                    <div className={filteredHubs.length > 0 ? "border-t border-zinc-800/50 pt-8" : ""}>
                      <div className="flex items-center gap-2 mb-6">
                        <Library size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl font-bold text-white">Bibliotecas</h2>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
                        {filteredLibs.map(repo => (
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
                           <ContentCard key={content.id} content={content} fullWidth views={contentViews} ratings={contentRatings} />
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
                          <Link key={link.id} to={`/${slug}/repo/${link.repository_id}`} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 flex justify-between items-center group transition-all">
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
                </>
             )}
           </div>
         ) : (
           <div className="animate-in fade-in duration-300">
             {featuredHubs.length > 0 && !activeFilter && (
               <ContentRow title="Hubs em Destaque">
                 {featuredHubs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {featuredLibs.length > 0 && !activeFilter && (
               <ContentRow title="Bibliotecas em Destaque">
                 {featuredLibs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {recentContents.length > 0 && !activeFilter && (
               <ContentRow title="Adicionados Recentemente">
                 {recentContents.map(content => (
                   <ContentCard key={content.id} content={content} views={contentViews} ratings={contentRatings} />
                 ))}
               </ContentRow>
             )}

             {filteredHubsByMain.length > 0 && (
               <ContentRow title={activeFilter ? filters.find(f => f.id === activeFilter)?.label + ' Disponíveis' : "Hubs"}>
                 {filteredHubsByMain.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {filteredLibsByMain.length > 0 && (
               <ContentRow title={activeFilter ? filters.find(f => f.id === activeFilter)?.label + ' Disponíveis' : "Biblioteca"}>
                 {filteredLibsByMain.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {companyRepos.length === 0 && (
                <div className="py-20 flex items-center justify-center flex-col text-zinc-500">
                  <h2 className="text-2xl font-bold text-white mb-2">Sem conteúdo</h2>
                  <p>Nenhum hub ou biblioteca disponível para o seu acesso no momento.</p>
                </div>
             )}
           </div>
         )}
      </div>
    </div>
  );
};