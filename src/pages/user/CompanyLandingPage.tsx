import { useParams, Link } from 'react-router-dom';
import React, { useState } from 'react';
import { usePublicCompanyBySlug, usePublicRepositories } from '../../hooks/usePlatformData';
import { Loader2, ArrowLeft, Play, Globe, Star, Folder, Library, Search, MonitorPlay, PlaySquare, LayoutGrid } from 'lucide-react';
import { RepoCard } from '../../components/user/RepoCard';
import { PublicRepoModal } from '../../components/user/PublicRepoModal';
import { Repository } from '../../types';
import { HeaderLayout } from '../../components/user/HeaderLayout';

export const CompanyLandingPage = () => {
  const { companySlug } = useParams();
  const { company, isLoading: loadingCompany } = usePublicCompanyBySlug(companySlug);
  const { repositories, isLoading: loadingRepos } = usePublicRepositories(company?.slug);

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const handleCardClick = (e: React.MouseEvent, repoId: string) => {
    e.preventDefault();
    const repo = repositories.find(r => r.id === repoId);
    if (repo) {
      setSelectedRepo(repo);
      setIsModalOpen(true);
    }
  };

  if (loadingCompany || loadingRepos) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: company?.theme?.background || '#09090b' }}
      >
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  if (!company || !company.landing_page_active || company.landing_page_enabled === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6 font-sans">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
          <Globe className="text-zinc-400" size={32} />
        </div>
        <h1 className="text-2xl font-bold mb-2 tracking-tight">Página Indisponível</h1>
        <p className="text-zinc-500 mb-8 max-w-sm text-center leading-relaxed">A Landing Page pública desta marca não existe ou foi temporariamente desativada.</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 bg-white/5 px-6 py-3 rounded-full transition-colors hover:bg-white/10 font-medium">
          <ArrowLeft size={16} /> Voltar para o início
        </Link>
      </div>
    );
  }

  const theme = company?.theme || { primary: '#2563EB', secondary: '#1e40af', background: '#09090b', text: '#ffffff', card: '#18181b' };
  const heroImage = company.hero_image || 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80';

  // Lógica de Filtro e Busca
  const query = searchQuery.toLowerCase().trim();
  
  const filteredAllRepos = repositories.filter(repo => {
    // Busca por texto
    const matchesSearch = !query || 
      repo.name.toLowerCase().includes(query) || 
      (repo.description && repo.description.toLowerCase().includes(query));
    
    // Filtro por tipo
    const matchesType = !activeFilter || repo.type === activeFilter;
    
    return matchesSearch && matchesType;
  });

  // Categorização de repositórios filtrados
  const featuredRepos = filteredAllRepos.filter(r => r.featured);
  const hubRepos = filteredAllRepos.filter(r => !r.featured && (r.type === 'FULL' || r.type === 'VIDEO_PLAYLIST' || r.type === 'PLAYLIST'));
  const libraryRepos = filteredAllRepos.filter(r => !r.featured && r.type === 'SIMPLE');

  const filters = [
    { id: 'FULL', label: 'Hubs', icon: <MonitorPlay size={14} /> },
    { id: 'PLAYLIST', label: 'Playlists', icon: <PlaySquare size={14} /> },
    { id: 'VIDEO_PLAYLIST', label: 'Vídeos', icon: <PlaySquare size={14} /> },
    { id: 'SIMPLE', label: 'Links', icon: <Library size={14} /> },
  ];

  return (
    <div className="min-h-screen font-sans antialiased selection:bg-white/20" style={{ backgroundColor: theme.background, color: theme.text }}>
      
      <HeaderLayout
        layout={company.landing_page_layout || 'classic'}
        theme={theme}
        image={heroImage}
        title={company.hero_title || company.name}
        subtitle={company.public_bio || company.hero_subtitle}
        logoUrl={company.logo_url}
        isPublic={true}
        align="left"
      />

      <main className="w-full relative z-20 space-y-12 pb-24">
        <div className="flex flex-col gap-8 px-8">
          <div className="relative w-full max-w-sm">
             <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50" size={20} />
             <input
                type="text"
                placeholder="Busca"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-xl border border-[var(--c-primary)]/30 hover:border-[var(--c-primary)]/50 rounded-full py-3 pl-14 pr-6 text-white text-base focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)] transition-all shadow-2xl placeholder:text-white/40"
             />
          </div>

          <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveFilter(null)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${!activeFilter ? 'bg-[var(--c-primary)] text-white border-[var(--c-primary)] shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-black/60'}`}
              >
                Todos
              </button>
              {filters.map(f => (
                <button 
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${activeFilter === f.id ? 'bg-[var(--c-primary)] text-white border-[var(--c-primary)] shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-black/40 text-white/60 border-white/10 hover:text-white hover:bg-black/60'}`}
                >
                  {f.icon} {f.label}
                </button>
              ))}
          </div>
        </div>
        
        {repositories.length === 0 ? (
          <div className="text-center py-32 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-sm shadow-inner max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mx-auto mb-6 border border-white/5">
               <Library className="opacity-30" size={32} />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Nenhum conteúdo público</h3>
            <p className="text-lg opacity-60 font-medium mb-8 max-w-md mx-auto">No momento não há repositórios abertos para visualização externa.</p>
            <Link to={`/${company.link_name || company.slug}/login`} className="text-sm font-bold opacity-80 hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
              Faça login para acessar o Hub <ArrowLeft className="rotate-180" size={16}/>
            </Link>
          </div>
        ) : (
          <div className="space-y-20">
            {/* Seção 1: Destaques */}
            {/* Seção 1: Destaques */}
            {featuredRepos.length > 0 && (
              <section className="px-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: `${theme.text}10` }}>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
                       <Star size={20} fill="currentColor" />
                    </div>
                    Em Destaque
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                   {featuredRepos.map(repo => (
                      <div key={repo.id} className="transition-transform hover:-translate-y-1 duration-300">
                         <RepoCard repo={{...repo, company_id: company.id}} fullWidth={true} onCardClick={handleCardClick} />
                      </div>
                   ))}
                </div>
              </section>
            )}

            {/* Seção 2: Hubs (Cursos/Trilhas) */}
            {hubRepos.length > 0 && (
              <section className="px-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: `${theme.text}10` }}>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl text-white shadow-lg" style={{ backgroundImage: `linear-gradient(135deg, ${theme.primary}, #000)` }}>
                       <Globe size={20} />
                    </div>
                    Hubs de Conteúdo
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                   {hubRepos.map(repo => (
                      <div key={repo.id} className="transition-transform hover:-translate-y-1 duration-300">
                         <RepoCard repo={{...repo, company_id: company.id}} fullWidth={true} onCardClick={handleCardClick} />
                      </div>
                   ))}
                </div>
              </section>
            )}

            {/* Seção 3: Biblioteca (Playlists/Simple) */}
            {libraryRepos.length > 0 && (
              <section className="px-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: `${theme.text}10` }}>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-zinc-800 text-white shadow-lg border border-white/10">
                       <Folder size={20} />
                    </div>
                    Biblioteca & Mídias
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                   {libraryRepos.map(repo => (
                      <div key={repo.id} className="transition-transform hover:-translate-y-1 duration-300">
                         <RepoCard repo={{...repo, company_id: company.id}} fullWidth={true} onCardClick={handleCardClick} />
                      </div>
                   ))}
                </div>
              </section>
            )}
            {/* Seção de Resultados Vazios */}
            {filteredAllRepos.length === 0 && (
              <div className="text-center py-32 rounded-[2rem] border border-white/5 bg-white/5 backdrop-blur-sm shadow-inner w-full max-w-3xl">
                <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mx-auto mb-6 border border-white/5">
                   <Search className="opacity-30" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">Nenhum resultado</h3>
                <p className="text-lg opacity-60 font-medium mb-8 max-w-md mx-auto">Não encontramos nada para "{searchQuery}" com o filtro selecionado.</p>
                <button onClick={() => { setSearchQuery(''); setActiveFilter(null); }} className="text-sm font-bold text-[var(--c-primary)] hover:underline flex items-center justify-center gap-2 mx-auto">
                   Limpar filtros e busca
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      
      <footer className="relative z-10 text-center border-t py-12 opacity-50 px-4 md:px-8 flex flex-col items-center justify-center gap-4" style={{ borderColor: `${theme.text}10` }}>
         {company.logo_url && (
           <img src={company.logo_url} alt={company.name} className="h-6 object-contain grayscale opacity-50" />
         )}
         <p className="text-sm font-medium tracking-wide">© {new Date().getFullYear()} {company.name}. Todos os direitos reservados.</p>
         <p className="text-xs max-w-sm mt-2 opacity-50">Plataforma desenvolvida para armazenamento e distribuição otimizada de mídias e documentos.</p>
      </footer>

      {/* Public Repo Popup */}
      <PublicRepoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        repository={selectedRepo} 
        theme={theme} 
      />
    </div>
  );
};
