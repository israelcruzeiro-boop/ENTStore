import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveys, useUserSurveyResponses } from '../../hooks/useSurveys';
import { Target, MessageSquareText, FileCheck2, Loader2, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const UserSurveys = () => {
  const { user, company } = useAuth();
  const { companySlug } = useParams();
  const navigate = useNavigate();

  const { surveys, isLoading: isLoadingSurveys } = useSurveys(company?.id);
  const { responses, isLoading: isLoadingResponses } = useUserSurveyResponses(user?.id);

  const [searchQuery, setSearchQuery] = useState('');

  const { pendingSurveys, completedSurveys } = useMemo(() => {
    if (!surveys || !responses) return { pendingSurveys: [], completedSurveys: [] };

    // Get responded IDs
    const respondedIds = new Set(responses.map(r => r.survey_id));

    // Filter by Active status
    const activeSurveys = surveys.filter(s => s.status === 'ACTIVE');

    const pending = activeSurveys.filter(s => {
      // If multiple allowed, it's always pending unless it expired
      if (s.allow_multiple_responses) return true;
      return !respondedIds.has(s.id!);
    });

    const completed = activeSurveys.filter(s => respondedIds.has(s.id!) && !s.allow_multiple_responses);

    // Naive search filter
    const searchLow = searchQuery.toLowerCase();
    return {
      pendingSurveys: pending.filter(s => s.title.toLowerCase().includes(searchLow) || s.description?.toLowerCase().includes(searchLow)),
      completedSurveys: completed.filter(s => s.title.toLowerCase().includes(searchLow) || s.description?.toLowerCase().includes(searchLow))
    };
  }, [surveys, responses, searchQuery]);

  if (isLoadingSurveys || isLoadingResponses) {
    return (
      <div className="flex h-screen items-center justify-center pt-16">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-20 px-4 md:px-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 relative z-10">
      
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MessageSquareText className="text-[var(--c-primary)]" size={32} /> 
          Pesquisas
        </h1>
        <p className="text-zinc-400">Compartilhe sua opinião e ajude-nos a melhorar. Sua voz é importante.</p>
      </div>

      <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 backdrop-blur-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <Input 
            placeholder="Buscar pesquisas..." 
            className="pl-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-zinc-600"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Target size={20} className="text-amber-400" /> Pendentes ({pendingSurveys.length})
        </h2>
        
        {pendingSurveys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingSurveys.map(survey => (
              <div 
                key={survey.id}
                onClick={() => navigate(`/${companySlug}/pesquisas/${survey.id}`)}
                className="group bg-zinc-900/40 flex flex-col border border-zinc-800 hover:border-amber-500/50 rounded-2xl cursor-pointer hover:bg-zinc-800/60 transition-all duration-300 overflow-hidden"
              >
                {survey.cover_image && (
                  <div className="h-32 w-full relative overflow-hidden border-b border-zinc-800/50">
                    <img src={survey.cover_image} alt={survey.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100" />
                  </div>
                )}
                <div className={`p-6 flex ${survey.cover_image ? 'flex-col' : 'items-start gap-4'} flex-1`}>
                  {!survey.cover_image && (
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                       <Target size={24} />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col h-full">
                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors">{survey.title}</h3>
                    <p className="line-clamp-2 text-sm text-zinc-400 leading-relaxed mb-4 flex-1">
                      {survey.description || 'Nenhuma descrição fornecida.'}
                    </p>
                    <div className="flex items-center text-amber-500/80 text-xs font-semibold uppercase tracking-wider group-hover:translate-x-1 group-hover:text-amber-400 transition-all gap-1 mt-auto">
                      RESPONDER AGORA <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 px-6 rounded-2xl border border-dashed border-zinc-800 text-center bg-zinc-900/20">
            <Target size={40} className="mx-auto text-zinc-700 mb-3" />
            <h3 className="text-zinc-300 font-semibold mb-1">Tudo em dia!</h3>
            <p className="text-zinc-500 text-sm">Você não tem pesquisas pendentes no momento.</p>
          </div>
        )}
      </div>

      {completedSurveys.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-zinc-800">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 opacity-80">
            <FileCheck2 size={20} className="text-emerald-500" /> Respondidas ({completedSurveys.length})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity">
            {completedSurveys.map(survey => (
               <div 
                  key={survey.id}
                  className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5"
               >
                  <div className="flex items-center gap-3 opacity-80">
                     <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <FileCheck2 size={20} />
                     </div>
                     <div>
                        <h3 className="text-white font-semibold line-clamp-1">{survey.title}</h3>
                        <p className="text-xs text-emerald-500 font-medium tracking-wide">Obrigado pelo seu tempo!</p>
                     </div>
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
