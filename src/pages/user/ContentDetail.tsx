import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { Viewer } from '../../components/user/Viewer';
import { ArrowLeft, Share2, Heart, Lock, Eye, Star } from 'lucide-react';

export const ContentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { contents, repositories, contentViews, addContentView, contentRatings, rateContent } = useAppStore();
  const hasTrackedView = useRef(false);

  const content = contents.find(c => c.id === id);
  const repo = content ? repositories.find(r => r.id === content.repositoryId) : null;

  // Métricas
  const viewsCount = contentViews.filter(v => v.contentId === content?.id).length;
  const ratings = contentRatings.filter(r => r.contentId === content?.id);
  const avgRating = ratings.length > 0 ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1) : '-';
  const userRating = contentRatings.find(r => r.contentId === content?.id && r.userId === user?.id)?.rating;

  // Regra de Acesso
  const isAuthorized = user?.role !== 'USER' || repo?.accessType !== 'RESTRICTED' || repo?.allowedUserIds?.includes(user?.id || '');

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

  const handleRate = (rating: number) => {
    if (!user || !content) return;
    rateContent({
      userId: user.id,
      contentId: content.id,
      companyId: content.companyId,
      repositoryId: content.repositoryId,
      rating
    });
  };

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
            
            <div className="flex items-center gap-4 mb-2">
              <span className="flex items-center gap-1.5 text-sm text-amber-400 font-medium">
                <Star size={16} fill="currentColor" /> {avgRating} <span className="text-zinc-500 font-normal">({ratings.length} {ratings.length === 1 ? 'avaliação' : 'avaliações'})</span>
              </span>
              <span className="text-zinc-600">•</span>
              <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                <Eye size={16} /> {viewsCount} {viewsCount === 1 ? 'visualização' : 'visualizações'}
              </span>
            </div>

            <p className="text-zinc-400 text-sm md:text-base mt-2">{content.description}</p>
            
            <div className="mt-6 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 w-fit">
              <p className="text-sm text-zinc-400 mb-3 font-medium">Avalie este conteúdo (0 a 10)</p>
              <div className="flex flex-wrap gap-2">
                {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                  <button 
                    key={val} 
                    onClick={() => handleRate(val)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${userRating === val ? 'bg-[var(--c-primary)] text-white shadow-[0_0_15px_var(--c-primary)] shadow-[var(--c-primary)]/40 scale-110' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:scale-105'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

          </div>
          <div className="flex gap-3 shrink-0 mt-4 md:mt-0">
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