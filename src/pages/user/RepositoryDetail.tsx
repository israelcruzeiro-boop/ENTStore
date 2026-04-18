import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgStructure, useRepositories, useCategories, useContents, useSimpleLinks, addContentView, rateContent, useRepositoryMetrics } from '../../hooks/useSupabaseData';
import { checkRepoAccess } from '../../lib/permissions';
import { ContentCard } from '../../components/user/ContentCard';
import { MusicPlayer, VideoPlayer, extractYouTubeId, isYouTubeShorts } from '../../components/user/Viewer';
import { ArrowLeft, Lock, Calendar, ExternalLink, Search, ArrowDownUp, X, FileText, PlayCircle, FileSpreadsheet, ImageIcon, Presentation, Folder, Link2, ChevronRight, Eye, Star, Music, Play, Pause, PlaySquare, Download } from 'lucide-react';
import { SimpleLink } from '../../types';
import { toast } from 'sonner';
import { HeaderLayout } from '../../components/user/HeaderLayout';
import { downloadFile } from '../../utils/download';


const getPremiumLinkConfig = (type: string) => {
  const t = type?.toLowerCase();
  if (t === 'vídeo' || t === 'video') {
    return { icon: PlayCircle, gradient: 'from-rose-500 to-orange-500', glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]', text: 'text-rose-400', bg: 'bg-rose-500/10', border_index: 'border-rose-500/20' };
  } else if (t === 'pdf') {
    return { icon: FileText, gradient: 'from-red-500 to-rose-600', glow: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]', text: 'text-red-400', bg: 'bg-red-500/10', border_index: 'border-red-500/20' };
  } else if (t === 'planilha') {
    return { icon: FileSpreadsheet, gradient: 'from-emerald-400 to-emerald-600', glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border_index: 'border-emerald-500/20' };
  } else if (t === 'documento') {
    return { icon: FileText, gradient: 'from-blue-500 to-cyan-500', glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]', text: 'text-blue-400', bg: 'bg-blue-500/10', border_index: 'border-blue-500/20' };
  } else if (t === 'imagem' || t === 'image') {
    return { icon: ImageIcon, gradient: 'from-blue-500 to-sky-600', glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]', text: 'text-blue-400', bg: 'bg-blue-500/10', border_index: 'border-blue-500/20' };
  } else if (t === 'apresentação' || t === 'apresentacao') {
    return { icon: Presentation, gradient: 'from-amber-400 to-orange-500', glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]', text: 'text-amber-400', bg: 'bg-amber-500/10', border_index: 'border-amber-500/20' };
  } else if (t === 'drive/pasta' || t === 'pasta') {
    return { icon: Folder, gradient: 'from-blue-600 to-cyan-500', glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]', text: 'text-blue-400', bg: 'bg-blue-500/10', border_index: 'border-blue-500/20' };
  } else if (t === 'música' || t === 'musica' || t === 'music') {
    return { icon: Music, gradient: 'from-purple-500 to-indigo-600', glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]', text: 'text-purple-400', bg: 'bg-purple-500/10', border_index: 'border-purple-500/20' };
  } else {
    return { icon: Link2, gradient: 'from-zinc-400 to-zinc-600', glow: 'group-hover:shadow-[0_0_20px_rgba(161,161,170,0.4)]', text: 'text-zinc-300', bg: 'bg-zinc-500/10', border_index: 'border-zinc-500/20' };
  }
};

export const RepositoryDetail = () => {
  const { id } = useParams();
  const { slug } = useTenant();
  const { company, user } = useAuth();

  // SWR Hooks para dados do Supabase
  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { categories, isLoading: loadingCats } = useCategories(id);
  const { contents, isLoading: loadingContents } = useContents({ repositoryId: id });
  const { simpleLinks, isLoading: loadingLinks } = useSimpleLinks({ repositoryId: id });
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);
  const { contentViews, contentRatings, isLoading: loadingMetrics, mutate: mutateMetrics } = useRepositoryMetrics(id);

  const isLoading = loadingRepos || loadingCats || loadingContents || loadingLinks || loadingOrg || loadingMetrics;

  const repo = repositories.find(r => r.id === id && r.status === 'ACTIVE');
  const isAuthorized = repo ? checkRepoAccess(repo, user, orgUnits, orgTopLevels) : false;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeLink, setActiveLink] = useState<SimpleLink | null>(null);
  
  // Playlist States
  const [currentMusicIndex, setCurrentMusicIndex] = useState<number>(-1);
  const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number>(-1);
  const [isVideoPlaylistPlaying, setIsVideoPlaylistPlaying] = useState(false);

  useEffect(() => {
    if (activeLink) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [activeLink]);

  const handleLinkClick = async (link: SimpleLink) => {
    setActiveLink(link);
    if (user && link) {
       try {
         await addContentView({
            user_id: user.id,
            content_id: link.id,
            company_id: link.company_id,
            repository_id: link.repository_id,
            content_type: link.type || 'LINK'
         });
       } catch (error) {
         console.error('Falha ao registrar visualização:', error);
       }
    }
  };

  const handleRateLink = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rating = Number(e.target.value);
    if (!user || !activeLink || isNaN(rating) || rating < 0 || rating > 10) return;
    
    const promise = rateContent({
        user_id: user.id,
        content_id: activeLink.id,
        company_id: activeLink.company_id,
        repository_id: activeLink.repository_id,
        rating
    });

    toast.promise(promise, {
      loading: 'Enviando sua avaliação...',
      success: 'Avaliação registrada com sucesso!',
      error: (err) => `Erro ao avaliar: ${err.message || 'Verifique sua conexão'}`
    });

    try {
      await promise;
      mutateMetrics();
    } catch (error) {
      console.error('Falha ao registrar avaliação:', error);
    }
  };

  const isSimple = repo?.type === 'SIMPLE';
  const isPlaylist = repo?.type === 'PLAYLIST';
  const isVideoPlaylist = repo?.type === 'VIDEO_PLAYLIST';
  const isAnyPlaylist = isPlaylist || isVideoPlaylist;

  const musicContents = useMemo(() => {
    const base = contents.filter(c => c.status === 'ACTIVE' && c.type === 'MUSIC');
    return activeCategory ? base.filter(c => c.category_id === activeCategory) : base;
  }, [contents, activeCategory]);

  const videoContents = useMemo(() => {
    const base = contents.filter(c => c.status === 'ACTIVE' && c.type === 'VIDEO');
    return activeCategory ? base.filter(c => c.category_id === activeCategory) : base;
  }, [contents, activeCategory]);

  const activeContents = isPlaylist ? musicContents : isVideoPlaylist ? videoContents : [];
  const currentIndex = isPlaylist ? currentMusicIndex : isVideoPlaylist ? currentVideoIndex : -1;
  const setCurrentIndex = isPlaylist ? setCurrentMusicIndex : isVideoPlaylist ? setCurrentVideoIndex : () => {};
  const currentItem = currentIndex >= 0 ? activeContents[currentIndex] : null;
  const setIsPlaying = isPlaylist ? setIsPlaylistPlaying : isVideoPlaylist ? setIsVideoPlaylistPlaying : () => {};

  const handleNextMusic = () => { if (currentMusicIndex < musicContents.length - 1) setCurrentMusicIndex(currentMusicIndex + 1); };
  const handlePrevMusic = () => { if (currentMusicIndex > 0) setCurrentMusicIndex(currentMusicIndex - 1); };
  const handleMusicEnded = () => { if (currentMusicIndex < musicContents.length - 1) handleNextMusic(); else { setIsPlaylistPlaying(false); setCurrentMusicIndex(-1); } };

  const handleNextVideo = () => { if (currentVideoIndex < videoContents.length - 1) setCurrentVideoIndex(currentVideoIndex + 1); };
  const handlePrevVideo = () => { if (currentVideoIndex > 0) setCurrentVideoIndex(currentVideoIndex - 1); };
  const handleVideoEnded = () => { if (currentVideoIndex < videoContents.length - 1) handleNextVideo(); else setCurrentVideoIndex(0); };

  const handleNextItem = isPlaylist ? handleNextMusic : isVideoPlaylist ? handleNextVideo : () => {};
  const handlePrevItem = isPlaylist ? handlePrevMusic : isVideoPlaylist ? handlePrevVideo : () => {};
  const handleItemEnded = isPlaylist ? handleMusicEnded : isVideoPlaylist ? handleVideoEnded : () => {};

  const displayContents = useMemo(() => {
     const base = contents.filter(c => c.status === 'ACTIVE');
     return activeCategory ? base.filter(c => c.category_id === activeCategory) : base;
  }, [contents, activeCategory]);

  const availableTypes = useMemo(() => {
    const types = new Set(simpleLinks.filter(l => l.status === 'ACTIVE').map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [simpleLinks]);

  const filteredLinks = useMemo(() => {
    return simpleLinks.filter(l => l.status === 'ACTIVE').filter(l => {
      const matchSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || l.type === filterType;
      const matchDate = !filterDate || l.date === filterDate;
      return matchSearch && matchType && matchDate;
    }).sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [simpleLinks, searchQuery, filterType, filterDate, sortOrder]);

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
      } else if (iframeUrl.includes('youtube.com/shorts/')) {
        const videoId = iframeUrl.split('youtube.com/shorts/')[1]?.split('?')[0];
        if (videoId) iframeUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (iframeUrl.includes('vimeo.com/') && !iframeUrl.includes('player.vimeo.com')) {
        const videoId = iframeUrl.split('vimeo.com/')[1]?.split('/')[0]?.split('?')[0];
        if (videoId) iframeUrl = `https://player.vimeo.com/video/${videoId}`;
      } else if (!iframeUrl.includes('google.com') && iframeUrl.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i)) {
        iframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      }
    } catch (e) { console.error("Erro ao formatar URL", e); }
    return iframeUrl;
  };

  const activeLinkRatings = activeLink ? contentRatings.filter(r => r.content_id === activeLink.id) : [];
  const activeLinkAvg = activeLinkRatings.length > 0 ? (activeLinkRatings.reduce((acc, curr) => acc + curr.rating, 0) / activeLinkRatings.length).toFixed(1) : '-';
  const activeUserRating = activeLink ? contentRatings.find(r => r.content_id === activeLink.id && r.user_id === user?.id)?.rating : undefined;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-12 relative">
      <HeaderLayout
        layout={company?.landing_page_layout || 'classic'}
        theme={company?.theme || { primary: '#2563EB', secondary: '#1D4ED8', background: '#09090b', card: '#18181b', text: '#ffffff' }}
        image={repo.banner_image || repo.cover_image || ''}
        title={repo.name}
        subtitle={repo.description}
        position={repo.banner_position}
        brightness={repo.banner_brightness}
        badge={isSimple ? 'Lista de Links' : isPlaylist ? 'Playlist' : 'Repositório'}
      >
        {isPlaylist && musicContents.length > 0 && currentMusicIndex === -1 && (
          <button 
            onClick={() => { setCurrentMusicIndex(0); setIsPlaylistPlaying(true); }}
            className="mt-8 flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-black text-[10px] hover:scale-105 transition-transform shadow-[0_10px_20px_rgba(255,255,255,0.15)] group relative z-10"
          >
            <PlayCircle className="fill-black group-hover:scale-110 transition-transform" size={16} /> OUVIR AGORA
          </button>
        )}
      </HeaderLayout>

      <div className="px-0 md:px-12 max-w-7xl mx-auto relative z-20">
        <div className="pt-8 mb-4 flex items-center justify-between">
            <Link to={`/${slug}/home`} className="tour-repo-nav flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-medium text-sm">
               <ArrowLeft size={18} /> Voltar
            </Link>
        </div>
        
        {isSimple ? (
          <div className="space-y-6">
             <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
                <div className="relative w-full">
                   <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                   <input type="text" placeholder="Pesquisar por título ou link..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-zinc-950/50 border border-zinc-800 text-white text-sm rounded-xl pl-10 p-3 focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent transition-all outline-none placeholder:text-zinc-500" />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-3 w-full">
                   <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="col-span-1 w-full sm:w-48 bg-zinc-950/50 border border-zinc-800 text-white text-sm rounded-xl focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent block p-2.5 outline-none cursor-pointer"><option value="ALL">Todos os Tipos</option>{availableTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
                   <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="col-span-1 w-full sm:w-40 bg-zinc-950/50 border border-zinc-800 text-zinc-300 text-sm rounded-xl focus:ring-2 focus:ring-[var(--c-primary)] focus:border-transparent block p-2.5 outline-none cursor-pointer [color-scheme:dark]" />
                   <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 w-full sm:w-auto bg-zinc-950/50 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 px-4 py-2.5 rounded-xl text-sm transition-all outline-none font-medium"><ArrowDownUp size={16} />{sortOrder === 'desc' ? 'Mais Recentes' : 'Mais Antigos'}</button>
                </div>
             </div>
             <div className="grid gap-3">
               {filteredLinks.map((link, idx) => {
                 const conf = getPremiumLinkConfig(link.type || '');
                 const Icon = conf.icon;
                 const viewsCount = contentViews.filter(v => v.content_id === link.id).length;
                 const linkRatings = contentRatings.filter(r => r.content_id === link.id);
                 const avgRating = linkRatings.length > 0 ? (linkRatings.reduce((acc, curr) => acc + curr.rating, 0) / linkRatings.length).toFixed(1) : '-';
                 return (
                   <button key={link.id} onClick={() => handleLinkClick(link)} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-800/40 transition-all duration-300 gap-4 text-left w-full overflow-hidden relative shadow-sm hover:shadow-xl ${idx === 0 ? 'tour-repo-item' : ''}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${conf.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      <div className="flex items-start sm:items-center gap-5 w-full sm:w-auto relative z-10 pl-1">
                         <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 ${conf.glow}`}><div className={`absolute inset-0 bg-gradient-to-br ${conf.gradient} opacity-20 group-hover:opacity-30 transition-opacity rounded-2xl`}></div><div className="absolute inset-0 rounded-2xl border border-white/10"></div><Icon size={26} className="text-white drop-shadow-md relative z-10" strokeWidth={1.5} /></div>
                         <div className="flex-1 min-w-0"><h3 className="text-white font-semibold text-lg sm:text-xl truncate mb-1 group-hover:text-white/90 transition-colors">{link.name}</h3><div className="flex flex-wrap items-center gap-3 text-xs font-medium"><span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${conf.bg} ${conf.text} border-transparent`}>{link.type}</span><span className="flex items-center gap-1 text-zinc-500"><Calendar size={13} /> {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span><span className="text-zinc-700">•</span><span className="flex items-center gap-1 text-amber-400"><Star size={13} fill="currentColor" /> {avgRating} <span className="text-zinc-500 font-normal">({linkRatings.length} {linkRatings.length === 1 ? 'avaliação' : 'avaliações'})</span></span><span className="text-zinc-700">•</span><span className="flex items-center gap-1 text-zinc-500" title="Visualizações"><Eye size={13} /> {viewsCount}</span></div></div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl text-zinc-300 bg-zinc-950 border border-zinc-800 group-hover:bg-[var(--c-primary)] group-hover:text-white group-hover:border-[var(--c-primary)] transition-all duration-300 shrink-0 shadow-sm group-hover:shadow-[0_0_15px_var(--c-primary)] group-hover:shadow-[var(--c-primary)]/30">Acessar <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" /></div>
                   </button>
                 );
               })}
             </div>
          </div>
        ) : isAnyPlaylist ? (
          <div className="relative mb-20">
             {currentItem && (
               <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                 <img 
                   src={currentItem.thumbnail_url || `https://img.youtube.com/vi/${extractYouTubeId(currentItem.url)}/maxresdefault.jpg`} 
                   className="w-full h-full object-cover opacity-20 blur-[100px] scale-150 transition-all duration-1000"
                   alt="bg-glow"
                 />
                 <div className="absolute inset-0 bg-black/40"></div>
               </div>
             )}

              <div className="bg-white/[0.02] backdrop-blur-2xl md:border border-white/10 rounded-none md:rounded-3xl overflow-hidden shadow-2xl relative z-10">
                <div className="px-0 md:px-8 py-6 border-b border-white/5">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                         <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight uppercase leading-none">
                            {isPlaylist ? 'PLAYLIST' : 'VÍDEOS'} <span className="text-[var(--c-primary)]">.</span>
                         </h2>
                         <p className="text-zinc-500 font-medium uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-2">
                           {isPlaylist ? <PlayCircle size={12} /> : <PlaySquare size={12} />} {isPlaylist ? 'Audio Selection' : 'Video Selection'}
                         </p>
                      </div>
                      
                      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        <button 
                          onClick={() => setActiveCategory(null)}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${!activeCategory ? 'bg-white text-black' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                        >
                          Tudo
                        </button>
                        {categories.map(cat => (
                            <button 
                              key={cat.id} 
                              onClick={() => setActiveCategory(cat.id)}
                              className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${activeCategory === cat.id ? 'bg-white text-black' : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'}`}
                            >
                                {cat.name}
                            </button>
                        ))}
                      </div>
                   </div>
                </div>

                <div className="flex flex-col xl:flex-row p-0 md:p-8 gap-8 items-start">
                   <div className="w-full xl:w-[75%] xl:sticky xl:top-8">
                      {currentItem ? (
                         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {(() => {
                              const isShorts = currentItem.url ? isYouTubeShorts(currentItem.url) : false;
                              return (
                                <div className={`relative group/player md:rounded-2xl overflow-hidden shadow-2xl md:border border-white/10 ring-1 ring-white/5 bg-black mx-auto transition-all duration-500 ${isShorts ? 'aspect-[9/16] max-w-[380px]' : 'aspect-video w-full'}`}>
                                   {isPlaylist ? (
                                     <MusicPlayer 
                                       youtubeId={extractYouTubeId(currentItem.url)} 
                                       thumbnailUrl={currentItem.thumbnail_url || (extractYouTubeId(currentItem.url) ? `https://img.youtube.com/vi/${extractYouTubeId(currentItem.url)}/hqdefault.jpg` : null)}
                                       title={currentItem.title}
                                       onEnded={handleItemEnded}
                                       onNext={handleNextItem}
                                       onPrevious={handlePrevItem}
                                       hasNext={currentIndex < activeContents.length - 1}
                                       hasPrevious={currentIndex > 0}
                                     />
                                   ) : (
                                     <VideoPlayer
                                       youtubeId={extractYouTubeId(currentItem.url)} 
                                       title={currentItem.title}
                                       isShorts={isShorts}
                                       onEnded={handleItemEnded}
                                       onNext={handleNextItem}
                                       onPrevious={handlePrevItem}
                                       hasNext={currentIndex < activeContents.length - 1}
                                       hasPrevious={currentIndex > 0}
                                     />
                                   )}
                                </div>
                              );
                            })()}
                            
                            <div className="mt-8 group px-6 md:px-0">
                               <div className="flex items-center gap-2 mb-3">
                                  <div className="w-8 h-[1px] bg-[var(--c-primary)] rounded-full"></div>
                                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-[9px]">Informações {isPlaylist ? 'da Faixa' : 'do Vídeo'}</span>
                               </div>
                               <h3 className="text-white text-2xl font-bold mb-3 tracking-tight leading-tight group-hover:text-[var(--c-primary)] transition-colors">{currentItem.title}</h3>
                               <p className="text-zinc-400 text-base leading-relaxed font-normal max-w-2xl">{currentItem.description || (isPlaylist ? 'Esta faixa faz parte da seleção exclusiva do repositório.' : 'Este vídeo faz parte da seleção exclusiva do repositório.')}</p>
                            </div>
                         </div>
                      ) : (
                         <div className="w-full aspect-video bg-white/[0.03] rounded-2xl border border-white/10 flex flex-col items-center justify-center text-zinc-500 backdrop-blur-sm group hover:border-[var(--c-primary)]/30 transition-all duration-300">
                            <div className="relative mb-6">
                               <div className="absolute inset-0 bg-[var(--c-primary)] blur-3xl opacity-10 group-hover:opacity-20 transition-opacity"></div>
                               <div className="w-20 h-20 bg-zinc-900/80 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 relative z-10">
                                  {isPlaylist ? <Music size={32} className="text-[var(--c-primary)]" strokeWidth={1.5} /> : <PlaySquare size={32} className="text-[var(--c-primary)]" strokeWidth={1.5} />}
                               </div>
                            </div>
                            <h3 className="text-xl font-bold text-white/90 uppercase tracking-tight">Inicie sua Imersão</h3>
                            <p className="text-[10px] mt-2 opacity-50 font-bold uppercase tracking-widest">{isPlaylist ? 'Selecione uma faixa para começar' : 'Selecione um vídeo para começar'}</p>
                         </div>
                      )}
                   </div>

                   <div className="w-full xl:w-[40%]">
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-white border border-white/5">
                               <Play size={18} fill="currentColor" />
                            </div>
                            <div>
                               <h3 className="text-sm font-bold text-white leading-none uppercase tracking-wide">PRÓXIMAS</h3>
                               <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Fila de Reprodução</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <span className="block text-lg font-bold text-white leading-none tracking-tight">{activeContents.length}</span>
                            <span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">itens</span>
                         </div>
                      </div>

                      <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                         {activeContents.length > 0 ? activeContents.map((item, idx) => {
                            const isActive = currentIndex === idx;
                            const trackNumber = (idx + 1).toString().padStart(2, '0');
                            return (
                              <button
                                key={item.id}
                                onClick={() => { setCurrentIndex(idx); setIsPlaying(true); }}
                                className={`w-full group flex items-center gap-4 p-2.5 rounded-xl transition-all duration-300 border relative overflow-hidden ${isActive ? 'bg-white/[0.06] border-white/10 shadow-lg' : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/5'} ${idx === 0 ? 'tour-repo-item' : ''}`}
                              >
                                {isActive && (
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--c-primary)]"></div>
                                )}
                                
                                <div className="w-6 shrink-0 flex items-center justify-center">
                                   {isActive ? (
                                      <div className="flex items-end gap-0.5 h-3 pb-0.5">
                                         <div className="w-0.5 h-1.5 bg-[var(--c-primary)] rounded-full animate-[musicBar_0.5s_infinite_alternate]" />
                                         <div className="w-0.5 h-3 bg-[var(--c-primary)] rounded-full animate-[musicBar_0.7s_infinite_alternate]" />
                                         <div className="w-0.5 h-2 bg-[var(--c-primary)] rounded-full animate-[musicBar_0.4s_infinite_alternate]" />
                                      </div>
                                   ) : (
                                      <span className="text-[10px] font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors">{trackNumber}</span>
                                   )}
                                </div>

                                <div className={`relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-all duration-300 ${isActive ? 'ring-2 ring-[var(--c-primary)]/30' : ''}`}>
                                   <img src={item.thumbnail_url || `https://img.youtube.com/vi/${extractYouTubeId(item.url)}/hqdefault.jpg`} className="w-full h-full object-cover" alt={item.title} />
                                   {!isActive && (
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Play size={16} className="text-white fill-white" />
                                     </div>
                                   )}
                                </div>

                                <div className="flex-1 min-w-0 text-left py-0.5">
                                   <h4 className={`font-medium text-xs md:text-sm transition-colors leading-tight truncate ${isActive ? 'text-[var(--c-primary)]' : 'text-zinc-300 group-hover:text-white'}`}>{item.title}</h4>
                                   <p className={`text-[10px] mt-1 truncate font-medium uppercase tracking-wider ${isActive ? 'text-white/30' : 'text-zinc-600 group-hover:text-zinc-500'}`}>{item.description || (isPlaylist ? 'Áudio' : 'Vídeo')}</p>
                                </div>
                                
                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="p-1.5 rounded-lg hover:bg-white/5">
                                      {isActive ? <Pause size={16} className="text-[var(--c-primary)]" /> : (isPlaylist ? <PlayCircle size={16} className="text-zinc-500" /> : <PlaySquare size={16} className="text-zinc-500" />)}
                                   </div>
                                </div>
                              </button>
                            );
                         }) : (
                           <div className="py-16 text-center text-zinc-700 bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                              <PlayCircle size={32} className="mx-auto mb-4 opacity-10" />
                              <p className="font-bold text-sm text-white/20 uppercase tracking-wide">Nenhum conteúdo</p>
                              <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5 opacity-20">Nesta fase ou categoria</p>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayContents.map((content, idx) => (
                <div 
                  key={content.id} 
                  className={`bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all group ${idx === 0 ? 'tour-repo-item' : ''}`}
                >
                  <ContentCard content={content} fullWidth views={contentViews} ratings={contentRatings} />
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
                       <option key={val} value={val} className="bg-zinc-900 text-white">
                         {val <= 6 ? '🔴' : val <= 8 ? '🟡' : '🟢'} Nota {val}
                       </option>
                     ))}
                   </select>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <button 
                      onClick={() => downloadFile(activeLink.url, activeLink.name)}
                      className="tour-repo-download text-white flex items-center gap-1.5 md:gap-2 text-xs md:text-sm bg-[var(--c-primary)] hover:bg-opacity-90 px-3 py-2 rounded-md transition-colors font-bold shadow-lg"
                      title="Baixar arquivo para o seu dispositivo"
                    >
                        <Download size={16} /> <span className="hidden sm:inline">Baixar</span>
                    </button>
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
           
           <div 
             className="flex-1 w-full relative flex flex-col items-center justify-center p-4"
             style={{ backgroundColor: company?.theme?.background || '#050505' }}
           >
              {(() => {
                const type = activeLink.type?.toLowerCase();
                const isMusic = type === 'música' || type === 'musica' || type === 'music';
                
                if (isMusic) {
                  const ytId = extractYouTubeId(activeLink.url);
                  const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
                  return (
                    <div className="w-full max-w-4xl">
                      <MusicPlayer 
                        youtubeId={ytId} 
                        thumbnailUrl={thumb} 
                        title={activeLink.name} 
                      />
                    </div>
                  );
                }

                return (
                  <iframe 
                    src={getIframeUrl(activeLink.url)} 
                    className="w-full h-full border-0 absolute inset-0 bg-white"
                    title={activeLink.name}
                    allowFullScreen
                  ></iframe>
                );
              })()}
           </div>
        </div>
      )}
    </div>
  );
};