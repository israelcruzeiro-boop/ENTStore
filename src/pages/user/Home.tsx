import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';
import { Search, Library, PlayCircle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UserHome = () => {
  const { company, user } = useAuth();
  const { repositories, contents, simpleLinks } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtra dados da Store local pela empresa logada, status ATIVO e Regras de Acesso
  const companyRepos = repositories.filter(r => {
     if (r.companyId !== company?.id || r.status !== 'ACTIVE') return false;
     
     // Regra de Acesso: Se for restrito, apenas os IDs permitidos (ou Admins) podem ver
     if (r.accessType === 'RESTRICTED' && user?.role === 'USER') {
         if (!r.allowedUserIds?.includes(user.id)) return false;
     }
     
     return true;
  });
  
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repositoryId) && c.status === 'ACTIVE');
  const companyLinks = simpleLinks.filter(l => repoIds.includes(l.repositoryId) && l.status === 'ACTIVE');

  // Separação entre Hubs (Completos) e Bibliotecas (Simples)
  const hubRepos = companyRepos.filter(r => r.type === 'FULL');
  const libraryRepos = companyRepos.filter(r => r.type === 'SIMPLE');

  // Listas padrão para a Home (quando a busca está vazia)
  const featuredHubs = hubRepos.filter(r => r.featured);
  const featuredLibs = libraryRepos.filter(r => r.featured);
  const recentContents = companyContents.filter(c => c.recent);

  // Listas para a Busca
  const query = searchQuery.toLowerCase().trim();
  const filteredRepos = query ? companyRepos.filter(r => r.name.toLowerCase().includes(query)) : [];
  const filteredContents = query ? companyContents.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)) : [];
  const filteredLinks = query ? companyLinks.filter(l => l.name.toLowerCase().includes(query) || l.url.toLowerCase().includes(query)) : [];

  // Define os dados do Hero Banner baseados na configuração da empresa, ou usa Fallbacks (primeiro repositório)
  const heroImage = company?.heroImage || (companyRepos.length > 0 ? (companyRepos[0].bannerImage || companyRepos[0].coverImage) : null);
  const heroTitle = company?.heroTitle || (companyRepos.length > 0 ? companyRepos[0].name : `Bem-vindo à ${company?.name}`);
  const heroSubtitle = company?.heroSubtitle || (companyRepos.length > 0 ? companyRepos[0].description : 'Explore os hubs e bibliotecas exclusivas da sua plataforma corporativa.');

  return (
    <div className="pb-10 pt-0 min-h-screen">
      {/* Hero Banner */}
      <div className="relative w-full h-[55vh] min-h-[420px] max-h-[550px] mb-8 flex items-center bg-[var(--c-bg)] overflow-hidden">
        {heroImage ? (
          <div className="absolute inset-0 bg-black">
            <img 
              src={heroImage} 
              alt="Hero" 
              className="w-full h-full object-cover object-top opacity-80"
            />
            {/* Gradientes para mesclar a imagem com o texto e o fundo da tela */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent w-full md:w-3/4"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[var(--c-bg)]/20 to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-[var(--c-primary)] opacity-50"></div>
        )}
        
        <div className="relative z-10 w-full px-4 md:px-12 max-w-2xl mt-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
            {heroTitle}
          </h1>
          <p className="text-lg text-zinc-300 mb-6 line-clamp-3 drop-shadow-md">
            {heroSubtitle}
          </p>
          
          {/* Barra de Pesquisa Moderna */}
          <div className="relative max-w-md">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
             <input
                type="text"
                placeholder="O que você quer aprender hoje?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/70 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-full py-3.5 pl-12 pr-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)] transition-all shadow-lg placeholder:text-zinc-400"
             />
          </div>
        </div>
      </div>

      {/* Área de Conteúdo */}
      <div className="mt-8">
         {query ? (
           /* RESULTADOS DA BUSCA */
           <div className="px-4 md:px-12 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-300">
             {filteredRepos.length === 0 && filteredContents.length === 0 && filteredLinks.length === 0 ? (
                <div className="text-center text-zinc-500 py-12">
                  <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                     <Search size={28} className="text-zinc-600" />
                  </div>
                  <p className="text-xl text-white font-medium mb-2">Nenhum resultado</p>
                  <p className="text-zinc-400">Não encontramos nada para "{query}".</p>
                </div>
             ) : (
                <>
                  {filteredRepos.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-6">
                        <Library size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl font-bold text-white">Hubs e Bibliotecas</h2>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
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
                          <Link key={link.id} to={`/repo/${link.repositoryId}`} className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 flex justify-between items-center group transition-all">
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
           /* LISTAS PADRÃO (Sem busca) */
           <div className="animate-in fade-in duration-300">
             
             {featuredHubs.length > 0 && (
               <ContentRow title="Hubs em Destaque">
                 {featuredHubs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {featuredLibs.length > 0 && (
               <ContentRow title="Bibliotecas em Destaque">
                 {featuredLibs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {recentContents.length > 0 && (
               <ContentRow title="Adicionados Recentemente">
                 {recentContents.map(content => (
                   <ContentCard key={content.id} content={content} />
                 ))}
               </ContentRow>
             )}

             {hubRepos.length > 0 && (
               <ContentRow title="Hubs">
                 {hubRepos.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {libraryRepos.length > 0 && (
               <ContentRow title="Biblioteca">
                 {libraryRepos.map(repo => (
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