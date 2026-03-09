import { Content } from '../../types';
import { ExternalLink } from 'lucide-react';

export const Viewer = ({ content }: { content: Content }) => {
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
  
  if (content.type === 'DOCUMENT') {
    // Usa o Google Docs Viewer para forçar a renderização de doc, docx, xls, pptx dentro do iframe
    iframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(content.url)}&embedded=true`;
  }

  // Renderizador para PDF, Documentos e Links (Formato "Navegador" vertical)
  return (
    <div className="w-full max-w-6xl mx-auto bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col h-[75vh] max-h-[900px]">
      {/* Barra de Navegação Falsa / Top Bar */}
      <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center w-full z-10 shrink-0">
         <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex gap-1.5 shrink-0">
               <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
               <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            </div>
            <span className="text-zinc-500 text-xs font-mono truncate hidden sm:block bg-zinc-950 px-3 py-1 rounded-md border border-zinc-800 w-64 md:w-96">
               {content.url}
            </span>
         </div>
         <a 
           href={content.url} 
           target="_blank" 
           rel="noreferrer" 
           className="text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md transition-colors shrink-0"
           title="Abrir em uma nova aba caso o link bloqueie a visualização interna"
         >
             Abrir em nova aba <ExternalLink size={14} />
         </a>
      </div>
      
      {/* Container do Iframe (Fundo branco ajuda a ler PDFs e Docs que tenham fundo transparente) */}
      <div className="flex-1 w-full bg-white relative">
        <iframe 
          src={iframeUrl} 
          className="w-full h-full border-0 absolute inset-0"
          title={content.title}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};