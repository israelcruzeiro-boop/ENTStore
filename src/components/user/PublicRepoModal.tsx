import React, { useEffect, useState } from 'react';
import { usePublicRepositoryContents, usePublicRepositorySimpleLinks } from '../../hooks/usePlatformData';
import { Repository, Theme, Content, SimpleLink } from '../../types';
import { X, PlaySquare, FileText, Music, Image as ImageIcon, ExternalLink, ArrowLeft, Globe, FileCode } from 'lucide-react';
import { Viewer } from './Viewer';

interface PublicRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: Repository | null;
  theme: Theme;
}

export function PublicRepoModal({ isOpen, onClose, repository, theme }: PublicRepoModalProps) {
  const { contents, isLoading: contentsLoading } = usePublicRepositoryContents(isOpen && repository ? repository.id : undefined);
  const { simpleLinks, isLoading: linksLoading } = usePublicRepositorySimpleLinks(isOpen && repository ? repository.id : undefined);
  const [activeItem, setActiveItem] = useState<Content | SimpleLink | null>(null);

  // Reset active item when modal closing
  useEffect(() => {
    if (!isOpen) {
      setActiveItem(null);
    }
  }, [isOpen]);

  // Helper para formatar URL de embed em links diretos, opcional
  const getDirectUrl = (url: string) => {
     if (!url) return '#';
     return url.startsWith('http') ? url : `https://${url}`;
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  if (!repository) return null;

  const isLoading = contentsLoading || linksLoading;
  const isVideoPlaylist = repository.type === 'VIDEO_PLAYLIST';
  const isPlaylist = repository.type === 'PLAYLIST';
  const isSimple = repository.type === 'SIMPLE';

  const hasItems = contents.length > 0 || simpleLinks.length > 0;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 lg:p-12">
          {/* Backdrop Fosco Imersivo */}
          <div 
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />

          {/* Modal Container */}
          <div 
            className="relative w-full max-w-4xl max-h-full flex flex-col bg-zinc-900 border border-white/10 shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto"
          >
            
            {/* Fake Cover / Header */}
            <div 
                className="relative h-40 md:h-56 w-full flex-shrink-0"
            >
                  {repository.cover_image ? (
                    <img src={repository.cover_image} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: theme.primary }} />
                  )}
                  {/* Gradient Overlay for Text Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/60 to-transparent" />
                  
                  {/* Close Button */}
                  <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                  >
                    <X size={20} />
                  </button>

                  {/* Title Area */}
                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20">
                            {isVideoPlaylist ? 'Vídeos' : isPlaylist ? 'Áudios' : isSimple ? 'Links / Arquivos' : 'Biblioteca Completa'}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
                        {repository.name}
                      </h2>
                  </div>
              </div>

              {/* Header area quando em visualização de item */}
              {activeItem && (
                <div className="flex items-center gap-4 p-4 md:p-6 bg-zinc-900 border-b border-white/5 shrink-0">
                  <button 
                    onClick={() => setActiveItem(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors font-bold text-sm uppercase tracking-widest"
                  >
                    <ArrowLeft size={18} /> Voltar para a lista
                  </button>
                  <div className="h-4 w-[1px] bg-white/10 hidden md:block"></div>
                  <h3 className="text-white font-bold truncate text-base md:text-lg flex-1">
                    {'title' in activeItem ? activeItem.title : activeItem.name}
                  </h3>
                </div>
              )}

              {/* Scrollable Body area */}
              <div className="flex-1 overflow-y-auto w-full p-6 md:p-8 custom-scrollbar">
                
                {activeItem ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Viewer 
                      content={{
                        ...activeItem,
                        title: 'title' in activeItem ? activeItem.title : activeItem.name,
                        type: 'type' in activeItem ? (activeItem.type as Content['type']) : 'LINK'
                      } as Content} 
                    />
                  </div>
                ) : (
                  <>
                    {repository.description && (
                      <p className="text-lg text-zinc-300 font-medium mb-8 leading-relaxed">
                        {repository.description}
                      </p>
                    )}

                    {isLoading ? (
                      <div className="space-y-4">
                         {[1, 2, 3, 4].map(i => (
                           <div key={i} className="w-full h-20 rounded-xl bg-white/5 animate-pulse" />
                         ))}
                      </div>
                    ) : !hasItems ? (
                      <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p className="text-lg">Nenhum conteúdo adicionado a essa pasta ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                          {/* Contents */}
                          {contents.length > 0 && (
                              <div className="space-y-3">
                                  {contents.map(item => (
                                      <button 
                                          onClick={() => setActiveItem(item)}
                                          key={item.id} 
                                          className="w-full group relative flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 text-left"
                                      >
                                          <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center text-white/70 group-hover:scale-105 transition-transform" style={{ color: theme.primary }}>
                                              {item.type === 'VIDEO' ? <PlaySquare size={24} /> :
                                               item.type === 'MUSIC' ? <Music size={24} /> :
                                               item.type === 'PDF' ? <FileText size={24} /> :
                                               item.type === 'DOCUMENT' ? <FileText size={24} /> : <ImageIcon size={24} />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h4 className="text-white font-bold text-base md:text-lg truncate group-hover:text-white/90 transition-all duration-300">
                                                  {item.title}
                                              </h4>
                                              {item.description && <p className="text-sm text-zinc-400 truncate mt-0.5">{item.description}</p>}
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                              <ExternalLink size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          )}

                          {/* Links */}
                          {simpleLinks.length > 0 && (
                              <div className="space-y-3 mt-6">
                                  {simpleLinks.map(link => {
                                      // Lógica de ícone dinâmico baseada no campo type
                                      const getLinkIcon = () => {
                                          const typeUpper = link.type?.toUpperCase() || '';
                                          if (typeUpper.includes('VIDEO')) return <PlaySquare size={24} />;
                                          if (typeUpper.includes('MUSIC') || typeUpper.includes('AUDIO')) return <Music size={24} />;
                                          if (typeUpper.includes('PDF') || typeUpper.includes('DOC')) return <FileText size={24} />;
                                          if (typeUpper.includes('CODE')) return <FileCode size={24} />;
                                          return <Globe size={24} />;
                                      };

                                      return (
                                          <button 
                                              onClick={() => setActiveItem(link)}
                                              key={link.id} 
                                              className="w-full group relative flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 transition-all hover:bg-white/10 text-left"
                                          >
                                              <div className="w-12 h-12 rounded-lg bg-black/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform" style={{ color: theme.primary }}>
                                                  {getLinkIcon()}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <h4 className="text-white font-bold text-base md:text-lg truncate group-hover:text-white/90 transition-all duration-300">
                                                      {link.name}
                                                  </h4>
                                                  <div className="flex items-center gap-3 mt-0.5">
                                                      {link.type && <span className="text-sm text-zinc-400 truncate opacity-80">{link.type}</span>}
                                                      {link.date && (
                                                          <>
                                                              <div className="h-3 w-[1px] bg-white/10"></div>
                                                              <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{link.date}</span>
                                                          </>
                                                      )}
                                                  </div>
                                              </div>
                                              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <ExternalLink size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                    )}
                  </>
                )}
              </div>



            </div>
          </div>
      )}
    </>
  );
}
