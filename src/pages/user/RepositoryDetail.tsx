import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { ContentCard } from '../../components/user/ContentCard';
import { ArrowLeft, Lock, Calendar, ExternalLink, Link as LinkIcon, Search, ArrowDownUp, X, FileText, PlayCircle, FileSpreadsheet, Image as ImageIcon, Presentation, Folder, Link2 } from 'lucide-react';
import { SimpleLink } from '../../types';

// Helper para definir Cores e Ícones dinamicamente
const getLinkTypeConfig = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'vídeo':
    case 'video':
      return { icon: PlayCircle, colorClass: 'text-rose-500 border-zinc-700 group-hover:text-rose-400 group-hover:border-rose-500 group-hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]' };
    case 'pdf':
      return { icon: FileText, colorClass: 'text-red-500 border-zinc-700 group-hover:text-red-400 group-hover:border-red-500 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]' };
    case 'planilha':
      return { icon: FileSpreadsheet, colorClass: 'text-emerald-500 border-zinc-700 group-hover:text-emerald-400 group-hover:border-emerald-500 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]' };
    case 'documento':
      return { icon: FileText, colorClass: 'text-blue-500 border-zinc-700 group-hover:text-blue-400 group-hover:border-blue-500 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]' };
    case 'imagem':
      return { icon: ImageIcon, colorClass: 'text-fuchsia-500 border-zinc-700 group-hover:text-fuchsia-400 group-hover:border-fuchsia-500 group-hover:shadow-[0_0_15px_rgba(217,70,239,0.3)]' };
    case 'apresentação':
    case 'apresentacao':
      return { icon: Presentation, colorClass: 'text-amber-500 border-zinc-700 group-hover:text-amber-400 group-hover:border-amber-500 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]' };
    case 'drive/pasta':
    case 'pasta':
      return { icon: Folder, colorClass: 'text-indigo-500 border-zinc-700 group-hover:text-indigo-400 group-hover:border-indigo-500 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]' };
    default:
      return { icon: Link2, colorClass: 'text-zinc-400 border-zinc-700 group-hover:text-[var(--c-primary)] group-hover:border-[var(--c-primary)] group-hover:shadow-[0_0_15px_var(--c-primary)]' };
  }
};

export const RepositoryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { repositories, categories: allCategories, contents: allContents, simpleLinks } = useAppStore();

  const repo = repositories.find(r => r.id === id && r.status === 'ACTIVE');
  
  const isAuthorized = user?.role !== 'USER' || repo?.accessType !== 'RESTRICTED' || repo?.allowedUserIds?.includes(user?.id || '');

  // Estados para os filtros e busca (Repositório Simples)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Estado para o Visualizador Interno de Links Simples
  const [activeLink, setActiveLink] = useState<SimpleLink | null>(null);

  // Trava o scroll da página principal enquanto o visualizador estiver aberto
  useEffect(() => {
    if (activeLink) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeLink]);

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

  // Aplica os filtros, busca e ordenação
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

  // Motor Inteligente de URLs para o Iframe
  const getIframeUrl = (url: string) => {
    let iframeUrl = url;
    try {
      if (iframeUrl.includes('drive.google.com/file/d/')) {
        const match = iframeUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          iframeUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
        }
      } else if (iframeUrl.includes('docs.google.com/') && iframeUrl.includes('/d/')) {
        const match = iframeUrl.match(/(.*\/d\/[a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          iframeUrl = `${match[1]}/preview`;
        }
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
    } catch (e) {
      console.error("Erro ao formatar URL do documento", e);
    }
    return iframeUrl;
  };

  return (
    <div className="pb-12 min-h-screen relative">
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
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
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
             {/* Barra de Busca e Filtros - VERSÃO COMPACTA */}
             <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2.5 shadow-md">
                
                {/* Busca (Largura Total) */}
                <div className="relative w-full">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                   <input 
                      type="text"
                      placeholder="Buscar links..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg pl-9 p-2 focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] transition-all outline-none"
                   />
                </div>
                
                {/* Filtros em Grid no Mobile / Flex no Desktop */}
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full">
                   <select 
                     value={filterType} 
                     onChange={(e) => setFilterType(e.target.value)}
                     className="col-span-1 w-full sm:w-40 bg-zinc-950 border border-zinc-700 text-white text-sm rounded-lg focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] block p-2 outline-none"
                   >
                     <option value="ALL">Tipos (Todos)</option>
                     {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>

                   <input 
                     type="date" 
                     value={filterDate} 
                     onChange={(e) => setFilterDate(e.target.value)}
                     className="col-span-1 w-full sm:w-36 bg-zinc-950 border border-zinc-700 text-zinc-400 text-sm rounded-lg focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] block p-2 outline-none"
                   />

                   <button 
                     onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                     className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 w-full sm:w-auto bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors outline-none"
                   >
                     <ArrowDownUp size={14} />
                     {sortOrder === 'desc' ? 'Recentes' : 'Antigos'}
                   </button>
                </div>
             </div>

             {/* Lista de Links Dinâmica */}
             <div className="space-y-3">
               {filteredLinks.map(link => {
                 const typeConfig = getLinkTypeConfig(link.type);
                 const Icon = typeConfig.icon;

                 return (
                   <button 
                     key={link.id} 
                     onClick={() => setActiveLink(link)}
                     className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all gap-4 shadow-sm text-left w-full relative overflow-hidden"
                   >
                      <div className="flex items-start sm:items-center gap-4 relative z-10 w-full sm:w-auto">
                         <div className={`w-12 h-12 rounded-full bg-black/50 border flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 ${typeConfig.colorClass}`}>
                            <Icon size={20} strokeWidth={1.5} />
                         </div>
                         <div className="flex-1">
                            <h3 className="text-white font-medium text-lg transition-colors group-hover:text-zinc-200">{link.name}</h3>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-medium">
                              <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400 group-hover:border-zinc-700 transition-colors">
                                {link.type}
                              </span>
                              <span className="text-zinc-600">•</span>
                              <span className="flex items-center gap-1 text-zinc-500"><Calendar size={12} /> {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                         </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400 font-medium px-4 py-2 rounded-lg group-hover:text-white group-hover:bg-zinc-800 transition-colors shrink-0">
                         Abrir <ExternalLink size={14} />
                      </div>
                   </button>
                 );
               })}
               {filteredLinks.length === 0 && (
                  <div className="text-center py-20 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 text-zinc-500">
                    <Search size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg text-zinc-400">Nenhum link encontrado.</p>
                    <p className="text-sm mt-1">Limpe os filtros ou tente outra busca.</p>
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

      {/* MODAL DE VISUALIZAÇÃO DE LINK (FULLSCREEN OVERLAY) */}
      {activeLink && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col w-screen h-screen">
           {/* Header do Visualizador */}
           <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center w-full shrink-0 shadow-md">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-[var(--c-primary)] rounded-md text-white hidden sm:block">
                  <FileText size={18} />
               </div>
               <h2 className="text-white font-semibold truncate max-w-[200px] md:max-w-md text-sm md:text-base">
                 {activeLink.name}
               </h2>
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
           
           {/* Iframe que exibe o documento */}
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