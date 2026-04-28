import { useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRepositories, useContents, useOrgStructure, useRepositoryMetrics, addContentView, rateContent } from '../../hooks/usePlatformData';
import { checkRepoAccess } from '../../lib/permissions';
import { Viewer } from '../../components/user/Viewer';
import { ArrowLeft, Lock, Eye, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Logger } from '../../utils/logger';

export const ContentDetail = () => {
  const { id } = useParams();
  const { slug } = useTenant();
  const { company, user } = useAuth();
  const hasTrackedView = useRef(false);

  // SWR Hooks para dados da API
  const { contents, isLoading: loadingContents } = useContents({ contentId: id });
  const content = contents.find(c => c.id === id);

  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const repo = content ? repositories.find(r => r.id === content.repository_id) : null;

  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);
  const { contentViews, contentRatings, isLoading: loadingMetrics, mutate: mutateMetrics } = useRepositoryMetrics(repo?.id);

  const isLoading = loadingContents || loadingRepos || loadingOrg || loadingMetrics;

  // Métricas específicas do conteúdo
  const contentViewsList = contentViews.filter(v => v.content_id === content?.id);
  const viewsCount = contentViewsList.length;
  const ratings = contentRatings.filter(r => r.content_id === content?.id);
  const avgRating = ratings.length > 0 ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1) : '-';
  const userRating = contentRatings.find(r => r.content_id === content?.id && r.user_id === user?.id)?.rating;

  // Regra de Acesso Recursiva e Completa
  const isAuthorized = repo ? checkRepoAccess(repo, user, orgUnits, orgTopLevels) : false;

  useEffect(() => {
    if (content && repo && isAuthorized && user && !hasTrackedView.current) {
      addContentView({
        user_id: user.id,
        content_id: content.id,
        company_id: content.company_id,
        repository_id: content.repository_id,
        content_type: content.type
      }).then(() => {
        hasTrackedView.current = true;
      }).catch(err => {
        Logger.warn('Failed to register content view', err);
      });
    }
  }, [content, repo, isAuthorized, user]);

  const handleRate = async (rating: number) => {
    if (!user || !content) return;
    
    const promise = rateContent({
        user_id: user.id,
        content_id: content.id,
        company_id: content.company_id,
        repository_id: content.repository_id,
        rating
    });

    toast.promise(promise, {
      loading: 'Enviando sua avaliação...',
      success: 'Avaliação registrada com sucesso!',
      error: (err) => `Erro ao avaliar: ${err.message || 'Verifique sua conexão'}`
    });

    try {
      await promise;
      // Recarregar métricas para atualizar a média na tela
      mutateMetrics();
    } catch (err) {
      Logger.warn('Failed to register content rating', err);
    }
  };

  const getRatingColor = (val: number, isSelected: boolean) => {
    if (!isSelected) return 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white';
    
    if (val <= 6) return 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]';
    if (val <= 8) return 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]';
    return 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]';
  };

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
         <p className="max-w-md mb-6">Você não tem permissão para acessar este conteúdo.</p>
         <Link to={`/${slug}/home`} className="px-6 py-2.5 rounded-md bg-[var(--c-primary)] text-white font-medium hover:bg-opacity-80 transition-colors">
            Voltar ao Início
         </Link>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 min-h-screen">
       <Link to={`/${slug}/repo/${repo.id}`} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> Voltar para {repo.name}
       </Link>

       <Viewer content={content} />

       <div className="max-w-6xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="w-full">
            <div className="flex items-center gap-3 mb-2">
               <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-zinc-800 text-[var(--c-primary)]">
                 {content.type}
               </span>
               <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">{content.title}</h1>
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

            <p className="text-zinc-300 text-base md:text-lg mt-4 max-w-4xl leading-relaxed">{content.description}</p>
            
            <div className="mt-8 p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/80 w-fit backdrop-blur-sm">
              <p className="text-sm text-zinc-400 mb-3 font-medium">Avalie este conteúdo (0 a 10)</p>
              <div className="flex flex-wrap gap-2">
                {[0,1,2,3,4,5,6,7,8,9,10].map(val => (
                   <button 
                     key={val} 
                     onClick={() => handleRate(val)}
                     className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all hover:scale-110 ${getRatingColor(val, userRating === val)} ${userRating === val ? 'ring-2 ring-white scale-110 shadow-xl' : 'opacity-80'}`}
                   >
                     {val}
                   </button>
                ))}
              </div>
            </div>

          </div>
       </div>
    </div>
  );
};
