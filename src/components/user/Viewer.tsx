import { useState, useEffect } from 'react';
import { Content } from '../../types';
import { ExternalLink, Maximize, Minimize, FileText } from 'lucide-react';

export const Viewer = ({ content }: { content: Content }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Trava o scroll da página quando o modal de tela cheia estiver aberto
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  // Renderizador para Vídeos (Imersivo, formato 16:9, sem bordas falsas)
  if (content.type === 'VIDEO') {
    let videoSrc = content.embedUrl || content.url;

    // Conversão automática de links padrão para links de embed (Iframe Seguro)
    if (videoSrc) {
      try {
        if (videoSrc.includes('youtube.com/watch?v=')) {
          const urlObj = new URL(videoSrc);
          const videoId = urlObj.searchParams.get('v');
          if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoSrc.includes('youtu.be/')) {
          const videoId = videoSrc.split('youtu.be/')[1]?.split('?')[0];
          if (videoId) videoSrc = `https://www.youtube.com/embed/${videoId}`;
        } else if (videoSrc.includes('vimeo.com/') && !videoSrc.includes('player.vimeo.com')) {
          const videoId = videoSrc.split('vimeo.com/')[1]?.split('/')[0]?.split('?')[0];
          if (videoId) videoSrc = `https://player.vimeo.com/video/${videoId}`;
        }
      } catch (e) {
        console.error("Erro ao converter URL de vídeo", e);
      }
    }

    return (
      <div className="aspect-video w-full max-w-6xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative group">
        <iframe 
          src={videoSrc} 
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // Define a URL base baseada no tipo de documento
  let iframeUrl = content.url;
  
  try {
    // 1. Google Drive Links genéricos (PDFs, imagens no Drive, etc)
    if (iframeUrl.includes('drive.google.com/file/d/')) {
      const match = iframeUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        iframeUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    // 2. Google Docs, Sheets, Slides (links diretos do editor)
    else if (iframeUrl.includes('docs.google.com/') && iframeUrl.includes('/d/')) {
      const match = iframeUrl.match(/(.*\/d\/[a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        iframeUrl = `${match[1]}/preview`;
      }
    }
    // 3. Documentos externos (.doc, .xls, .ppt) hospedados em outros lugares
    else if (content.type === 'DOCUMENT' && !iframeUrl.includes('google.com')) {
      // Usa o Google Docs Viewer para forçar a renderização dentro do iframe
      iframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(content.url)}&embedded=true`;
    }
  } catch (e) {
    console.error("Erro ao formatar URL do documento", e);
  }

  // Renderizador para PDF, Documentos e Links (Formato "Navegador" vertical)
  return (
    <>
      {/* VISUALIZAÇÃO PADRÃO (INLINE) */}
      <div className="w-full max-w-6xl mx-auto bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col h-[75vh] max-h-[900px]">
        {/* Barra de Navegação Falsa / Top Bar */}
        <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center w-full z-10 shrink-0">
           <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex gap-1.5 shrink-0">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-zinc-500 text-xs font-mono truncate hidden sm:block bg-zinc-950 px-3 py-1 rounded-md border border-zinc-800 w-48 md:w-96">
                 {content.url}
              </span>
           </div>
           
           <div className="flex items-center gap-2 shrink-0">
               <button 
                 onClick={() => setIsFullscreen(true)}
                 className="text-white flex items-center gap-1.5 text-xs md:text-sm bg-[var(--c-primary)] hover:bg-opacity-80 px-4 py-1.5 rounded-md transition-colors font-bold shadow-lg"
               >
                   <Maximize size={16} /> Tela Cheia
               </button>
               <a 
                 href={content.url} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="text-zinc-300 hover:text-white items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md transition-colors hidden md:flex"
                 title="Abrir em uma nova aba caso o link bloqueie a visualização interna"
               >
                   Nova aba <ExternalLink size={14} />
               </a>
           </div>
        </div>
        
        {/* Container do Iframe Inline */}
        <div className="flex-1 w-full bg-white relative">
          <iframe 
            src={iframeUrl} 
            className="w-full h-full border-0 absolute inset-0"
            title={content.title}
            allowFullScreen
          ></iframe>
        </div>
      </div>

      {/* MODAL DE TELA CHEIA (POPUP OVERLAY) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col w-screen h-screen">
           {/* Header do Popup */}
           <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center w-full shrink-0 shadow-md">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-[var(--c-primary)] rounded-md text-white hidden sm:block">
                  <FileText size={18} />
               </div>
               <h2 className="text-white font-semibold truncate max-w-[200px] md:max-w-md text-sm md:text-base">
                 {content.title}
               </h2>
             </div>
             <div className="flex items-center gap-2 md:gap-3">
                <a 
                  href={content.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-md transition-colors"
                >
                    <span className="hidden sm:inline">Abrir no Navegador</span> <ExternalLink size={16} />
                </a>
                <button 
                  onClick={() => setIsFullscreen(false)}
                  className="text-white flex items-center gap-1.5 md:gap-2 text-xs md:text-sm bg-zinc-700 hover:bg-red-600 px-4 py-2 rounded-md transition-colors font-bold shadow-lg"
                >
                    <Minimize size={16} /> Fechar
                </button>
             </div>
           </div>
           
           {/* Container do Iframe Fullscreen */}
           <div className="flex-1 w-full bg-white relative">
              <iframe 
                src={iframeUrl} 
                className="w-full h-full border-0 absolute inset-0"
                title={content.title}
                allowFullScreen
              ></iframe>
           </div>
        </div>
      )}
    </>
  );
};