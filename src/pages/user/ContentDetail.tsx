import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { Viewer } from '../../components/user/Viewer';
import { ArrowLeft, Share2, Heart, Lock } from 'lucide-react';

export const ContentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { contents, repositories, addContentView } = useAppStore();
  const hasTrackedView = useRef(false);

  const content = contents.find(c => c.id === id);
  const repo = content ? repositories.find(r => r.id === content.repositoryId) : null;

  // Regra de Acesso: O conteúdo herda a restrição do repositório
  const isAuthorized = user?.role !== 'USER' || repo?.accessType !== 'RESTRICTED' || repo?.allowedUserIds?.includes(user?.id || '');

  // Registra a visualização (métrica) apenas uma vez ao montar a página
  useEffect(() => {
    if (content && repo && isAuthorized && user && !hasTrackedView.current) {
      addContentView({
        userId: user.id,
        contentId: content.id,
        companyId: content.companyId,
        repositoryId: content.repositoryId,
        contentType: content.type
      });
      hasTrackedView.current = true;
    }
  }, [content, repo, isAuthorized, user, addContentView]);

  if (!content || !repo || content.status !== 'ACTIVE') {
      return <div className="p-12 text-center text-white mt-20">Conteúdo não encontrado ou inativo.</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
         <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Lock size={24} className="text-[var(--c-primary)]" />
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Acesso Negado</h1>
         <p className="max-w-md mb-6">Este conteúdo pertence a um repositório restrito.</p>
         <Link to="/" className="px-6 py-2.5 rounded-md bg-[var(--c-primary)] text-white font-medium hover:bg-opacity-80 transition-colors">
            Voltar ao Início
         </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 min-h-screen">
       <Link to={`/repo/${repo.id}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> Voltar para {repo.name}
       </Link>

       <Viewer content={content} />

       <div className="max-w-6xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-zinc-800 text-[var(--c-primary)]">
                 {content.type}
               </span>
               <h1 className="text-2xl md:text-3xl font-bold text-white">{content.title}</h1>
            </div>
            <p className="text-zinc-400 text-sm md:text-base">{content.description}</p>
          </div>
          <div className="flex gap-3 shrink-0">
             <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-[var(--c-primary)] transition-colors group">
                <Heart size={20} className="group-hover:scale-110 transition-transform" />
             </button>
             <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-[var(--c-primary)] transition-colors group">
                <Share2 size={20} className="group-hover:scale-110 transition-transform" />
             </button>
          </div>
       </div>
    </div>
  );
};