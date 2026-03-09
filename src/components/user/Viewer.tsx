import { Content } from '../../types';
import { FileText, ExternalLink, AlertCircle } from 'lucide-react';

export const Viewer = ({ content }: { content: Content }) => {
  if (content.type === 'VIDEO') {
    return (
      <div className="aspect-video w-full max-w-5xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
        <iframe 
          src={content.embedUrl || content.url} 
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  if (content.type === 'PDF' || content.type === 'DOCUMENT') {
    return (
      <div className="w-full h-[80vh] max-w-5xl mx-auto bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col">
         <div className="bg-zinc-800 p-4 border-b border-zinc-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
                <FileText size={20} className="text-[var(--c-primary)]" />
                <span className="font-medium">{content.title}</span>
            </div>
            <a href={content.url} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm">
                Abrir Externo <ExternalLink size={14} />
            </a>
         </div>
         {/* Simulação de iframe para doc/pdf - Em produção usaria Google Docs Viewer ou PDF.js */}
         <div className="flex-1 flex items-center justify-center bg-zinc-950 p-8 text-center text-zinc-500">
            <div className="max-w-md">
                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>O visualizador de documentos nativo não está disponível neste ambiente de teste.</p>
                <p className="mt-2 text-sm">Em produção, o PDF/Documento "{content.title}" abriria aqui embutido.</p>
                <a href={content.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[var(--c-primary)] text-white rounded-md hover:opacity-90 transition-opacity">
                    Visualizar em nova aba <ExternalLink size={16} />
                </a>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-[var(--c-card)] p-8 rounded-xl shadow-2xl text-center border border-zinc-800">
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExternalLink size={32} className="text-[var(--c-primary)]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-4">{content.title}</h2>
        <p className="text-zinc-400 mb-8">{content.description}</p>
        <a 
          href={content.url} 
          target="_blank" 
          rel="noreferrer" 
          className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--c-primary)] text-white font-medium rounded-full hover:scale-105 transition-transform"
        >
            Acessar Link Externo
        </a>
    </div>
  );
};