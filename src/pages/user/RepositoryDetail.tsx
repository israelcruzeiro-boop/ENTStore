import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAppStore, checkRepoAccess } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { ContentCard } from '../../components/user/ContentCard';
import { ArrowLeft, Lock, Calendar, ExternalLink, Search, ArrowDownUp, X, FileText, PlayCircle, FileSpreadsheet, Image as ImageIcon, Presentation, Folder, Link2, ChevronRight, Eye, Star } from 'lucide-react';
import { SimpleLink } from '../../types';

const getPremiumLinkConfig = (type: string) => {
  const t = type?.toLowerCase();
  if (t === 'vídeo' || t === 'video') {
    return { icon: PlayCircle, gradient: 'from-rose-500 to-orange-500', glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  } else if (t === 'pdf') {
    return { icon: FileText, gradient: 'from-red-500 to-rose-600', glow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
  } else if (t === 'planilha') {
    return { icon: FileSpreadsheet, gradient: 'from-emerald-400 to-emerald-600', glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  } else if (t === 'documento') {
    return { icon: FileText, gradient: 'from-blue-500 to-cyan-500', glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  } else if (t === 'imagem') {
    return { icon: ImageIcon, gradient: 'from-fuchsia-500 to-purple-600', glow: 'group-hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' };
  } else if (t === 'apresentação' || t === 'apresentacao') {
    return { icon: Presentation, gradient: 'from-amber-400 to-orange-500', glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  } else if (t === 'drive/pasta' || t === 'pasta') {
    return { icon: Folder, gradient: 'from-indigo-500 to-violet-500', glow: 'group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]', text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
  } else {
    return { icon: Link2, gradient: 'from-zinc-400 to-zinc-600', glow: 'group-hover:shadow-[0_0_20px_rgba(161,161,170,0.4)]', text: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' };
  }
};

export const RepositoryDetail = () => {
  const { id } = useParams();
  const { slug } = useTenant();
  const { user } = useAuth();
  const { repositories, categories: allCategories, contents: allContents, simpleLinks, contentViews, addContentView, contentRatings, rateContent, orgUnits, orgTopLevels } = useAppStore();

  const repo = repositories.find(r => r.id === id && r.status === 'ACTIVE');
  
  const isAuthorized = checkRepoAccess(repo as any, user, orgUnits, orgTopLevels);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLink, setActiveLink] = useState<SimpleLink | null>(null);

  useEffect(() => {
    if (activeLink) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [activeLink]);

  const handleLinkClick = (link: SimpleLink) => {
    setActiveLink(link);
    if (user && link) {
       addContentView({
          userId: user.id,
          contentId: link.id,
          companyId: link.companyId,
          repositoryId: link.repositoryId,
          contentType: link.type || 'LINK'
       });
    }
  };

  const handleRateLink = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rating = Number(e.target.value);
    if (!user || !activeLink || isNaN(rating) || rating < 0 || rating > 10) return;
    rateContent({
      userId: user.id,
      contentId: activeLink.id,
      companyId: activeLink.companyId,
      repositoryId: activeLink.repositoryId,
      rating
    });
  };

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
         <Link to={`/${slug}/home`} className="px-6 py-2.5 rounded-md bg-[var(--c-primary)] text-white font-medium hover:bg-opacity-80 transition-colors">
            Voltar ao Início
         </Link>
      </div>
    );
  }

  const isSimple = repo.type === 'SIMPLE';

  const categories = allCategories.filter(c => c.repositoryId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const contents = allContents.filter(c => c.repositoryId === id && c.status === 'ACTIVE');
  const displayContents = activeCategory ? contents.filter(c => c.categoryId === activeCategory) : contents;

  const rawLinks = simpleLinks.filter(l => l.repositoryId === id && l.status === 'ACTIVE');
  
  const availableTypes = useMemo(() => {
    const types = new Set(rawLinks.map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [rawLinks]);

  const filteredLinks = useMemo(() => {
    return rawLinks.filter(l => {
      const matchSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || l.type === filterType;
      const matchDate = !filterDate || l.date === filterDate;
      return matchSearch && matchType && matchDate;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [rawLinks, searchQuery, filterType, filterDate, sortOrder]);

  const getIframeUrl = (url: string) => {
    let iframeUrl = url;
    try {
      if (iframeUrl.includes('drive.google.com/file/d/')) {
        const match = iframeUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) iframeUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      } else if (iframeUrl.includes('docs.google.com/') && iframeUrl.includes('/d/')) {
        const match = iframeUrl.match(/(.*\/d\/[a-zA-Z0-9_-]+)/);
        if (match && match[1]) iframeUrl = `${match[1]}/preview`;
      } else if (iframeUrl.includes('youtube.com/watch?v=')) {
        const urlObj = new URL(iframeUrl);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) iframeUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (iframeUrl.includes('youtu.be/')) {
        const videoId = iframeUrl.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) iframeUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (iframeUrl.includes('vimeo.com/') && !iframeUrl.includes('player.vimeo.com')) {
        const videoId = iframeUrl.split('vimeo.com/')[1]?.split('/')[0]?.split('?')[0];
        if (videoId) iframeUrl = `https://player.vimeo.com/video/${videoId}`;
      } else if (!iframeUrl.includes('google.com') && iframeUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/i)) {
        iframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      }
    } catch (e) { console.error("Erro ao formatar URL", e); }
    return iframeUrl;
  };

  const activeLinkRatings = activeLink ? contentRatings.filter(r => r.contentId === activeLink.id) : [];
  const activeLinkAvg = activeLinkRatings.length > 0 ? (activeLinkRatings.reduce((acc, curr) => acc + curr.rating, 0) / activeLinkRatings.length).toFixed(1) : '-';
  const activeUserRating = activeLink ? contentRatings.find(r => r.contentId === activeLink.id && r.userId === user?.id)?.rating : undefined;

  return (
    <div className="pb-12 min-h-screen relative">
      <div className="relative h-[30vh] md:h-[40vh] w-full mb-8 bg-zinc-950 overflow-hidden">
         {repo.bannerImage || repo.coverImage ? (
           <img src={repo.bannerImage || repo.coverImage} alt={repo.name} className="w-full h-full object-cover opacity-50 mix-blend-overlay" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950"></div>
         )}
         <div className="absolute inset-0 bg-black/40"></div>
         <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[var(--c-bg)]/80 to-transparent"></div>
         <Link to={`/${slug}/home`} className="absolute top-24 left-4 md:left-12 flex items-center gap-2 text-zinc-300 hover:text-white transition-colors z-10 font-medium">
            <ArrowLeft size={20} /> Voltar
         </Link>
         <div className="absolute bottom-0 left-4 md:left-12 pb-8 pr-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                {isSimple ? 'Lista de Links' : 'Repositório'}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2 leading-tight drop-shadow-xl">{repo.name}</h1>
            <p className="text-zinc-300 max-w-2xl line-clamp-2 md:line-clamp-none text-sm md:text-base drop-shadow-md">{repo.description}</p>
         </div>
      </div>

      <div className="px-4 md:px-12 max-w-7xl mx-auto">
        
        {isSimple ? (
          <div className="space-y-6">
             <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="relative w-full">
                   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                   <input 
                      type="text"
                      placeholder="Pesquisar por título ou link..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-zinc-800 text-white text-sm rounded-xl pl-10 p-3 focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all outline-none placeholder:text-zinc-500"
                   />
                </div>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 w-full">
                   <select 
                     value={filterType} 
                     onChange={(e) => setFilterType(e.target.value)}
                     className="col-span-1 w-full sm:w-48 bg-zinc-950/50 border border-zinc-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent block p-2.5 outline-none cursor-pointer"
                   >
                     <option value="ALL">Todos os Tipos</option>
                     {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>

                   <input 
                     type="date" 
                     value={filterDate} 
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="col-span-1 w-full sm:w-40 bg-zinc-950/50 border border-zinc-800 text-zinc-300 text-sm rounded-xl focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent block p-2.5 outline-none cursor-pointer [color-scheme:dark]"
                   />

                   <button 
                     onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                     className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 w-full sm:w-auto bg-zinc-950/50 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 px-4 py-2.5 rounded-xl text-sm transition-all outline-none font-medium"
                   >
                     <ArrowDownUp size={16} />
                     {sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}
                   </button>
                </div>
             </div>

             <div className="grid gap-3">
               {filteredLinks.map(link => {
                 const conf = getPremiumLinkConfig(link.type);
                 const Icon = conf.icon;
                 
                 const viewsCount = contentViews.filter(v => v.contentId === link.id).length;
                 const linkRatings = contentRatings.filter(r => r.contentId === link.id);
                 const avgRating = linkRatings.length > 0 ? (linkRatings.reduce((acc, curr) => acc + curr.rating, 0) / linkRatings.length).toFixed(1) : '-';

                 return (
                   <button 
                     key={link.id} 
                     onClick={() => handleLinkClick(link)}
                     className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-800/40 transition-all duration-300 gap-4 text-left w-full overflow-hidden relative shadow-sm hover:shadow-xl"
                   >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${conf.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                      <div className="flex items-start sm:items-center gap-5 w-full sm:w-auto relative z-10 pl-1">
                         <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 ${conf.glow}`}>
                            <div className={`absolute inset-0 bg-gradient-to-br ${conf.gradient} opacity-20 group-hover:opacity-30 transition-opacity rounded-2xl`}></div>
                            <div className="absolute inset-0 rounded-2xl border border-white/10"></div>
                            <Icon size={26} className="text-white drop-shadow-md relative z-10" strokeWidth={1.5} />
                         </div>
                         
                         <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-lg sm:text-xl truncate mb-1 group-hover:text-white/90 transition-colors">
                               {link.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                              <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${conf.bg} ${conf.text} ${conf.border}`}>
                                {link.type}
                              </span>
                              <span className="flex items-center gap-1 text-zinc-500">
                                <Calendar size={13} /> {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-zinc-700">•</span>
                              <span className="flex items-center gap-1 text-amber-400">
                                <Star size={13} fill="currentColor" /> {avgRating} <span className="text-zinc-500 font-normal">({linkRatings.length} {linkRatings.length === 1 ? 'avaliação' : 'avaliações'})</span>
                              </span>
                              <span className="text-zinc-700">•</span>
                              <span className="flex items-center gap-1 text-zinc-500" title="Visualizações">
                                <Eye size={13} /> {viewsCount}
                              </span>
                            </div>
                         </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-zinc-300 bg-zinc-950 border border-zinc-800 group-hover:bg-[var(--c-primary)] group-hover:text-white group-hover:border-[var(--c-primary)] transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_0_15px_var(--c-primary)] group-hover:shadow-[var(--c-primary)]/30">
                         Acessar <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                   </button>
                 );
               })}
               {filteredLinks.length === 0 && (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800 text-zinc-500">
                    <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto mb-5 border border-zinc-800 shadow-inner">
                       <Search size={32} className="opacity-40" />
                    </div>
                    <p className="text-xl font-medium text-white mb-2">Nenhum resultado encontrado</p>
                    <p className="text-sm text-zinc-500 max-w-sm mx-auto">Não encontramos nenhum link que corresponda aos filtros aplicados. Tente ajustar a busca.</p>
                  </div>
               )}
             </div>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-4 pt-2">
                <button 
                  onClick={() => setActiveCategory(null)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${!activeCategory ? 'bg-[var(--c-primary)] border-[var(--c-primary)] text-white shadow-[0_4px_20px_var(--c-primary)] shadow-[var(--c-primary)]/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                >
                  Todos os Conteúdos
                </button>
                {categories.map(cat => (
                    <button 
                      key={cat.id} 
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${activeCategory === cat.id ? 'bg-[var(--c-primary)] border-[var(--c-primary)] text-white shadow-[0_4px_20px_var(--c-primary)] shadow-[var(--c-primary)]/30' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 md:gap-10">
                {displayContents.map(content => (
                    <div key={content.id} className="w-full">
                        <ContentCard content={content} fullWidth />
                    </div>
                ))}
                {displayContents.length === 0 && (
                    <div className="col-span-full py-20 text-center text-zinc-500">
                        <Folder size={48} className="opacity-20 mx-auto mb-4" />
                        <p className="text-xl font-medium text-white mb-2">Nenhum conteúdo encontrado</p>
                        <p>Ainda não há materiais liberados para a fase selecionada.</p>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>

      {activeLink && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col w-screen h-screen">
           <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center w-full shrink-0 shadow-md">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-[var(--c-primary)] rounded-md text-white hidden sm:block">
                  <FileText size={18} />
               </div>
               <h2 className="text-white font-semibold truncate max-w-[150px] md:max-w-xs text-sm md:text-base">
                 {activeLink.name}
               </h2>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 bg-zinc-950/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-amber-400 text-xs font-bold flex items-center gap-1 border-r border-zinc-700 pr-2">
                    <Star size={14} fill="currentColor" /> {activeLinkAvg}
                  </span>
                  <select 
                    value={activeUserRating !== undefined ? activeUserRating : -1} 
                    onChange={handleRateLink}
                    className="bg-transparent text-zinc-400 text-xs font-medium focus:outline-none focus:text-white cursor-pointer"
                  >
                    <option value="-1" disabled>Dar Nota (0 a 10)</option>
                    {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                      <option key={val} value={val} className="bg-zinc-900 text-white">Nota {val}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <a 
                      href={activeLink.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-md transition-colors"
                      title="Caso o link apresente erro ou bloqueie a tela"
                    >
                        <span className="hidden sm:inline">Abrir no Navegador</span> <ExternalLink size={16} />
                    </a>
                    <button 
                      onClick={() => setActiveLink(null)}
                      className="text-white flex items-center gap-1.5 md:gap-2 text-xs md:text-sm bg-zinc-700 hover:bg-red-600 px-4 py-2 rounded-md transition-colors font-bold shadow-lg"
                    >
                        <X size={16} /> Fechar
                    </button>
                </div>
             </div>
           </div>
           
           <div className="flex-1 w-full bg-white relative">
              <iframe 
                src={getIframeUrl(activeLink.url)} 
                className="w-full h-full border-0 absolute inset-0"
                title={activeLink.name}
                allowFullScreen
              ></iframe>
           </div>
        </div>
      )}
    </div>
  );
};