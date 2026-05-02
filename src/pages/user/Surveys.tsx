import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveys, useUserSurveyResponses } from '../../hooks/useSurveys';
import { useOrgStructure } from '../../hooks/usePlatformData';
import { checkSurveyAccess } from '../../lib/permissions';
import { Target, MessageSquareText, FileCheck2, ArrowRight } from 'lucide-react';
import { UserPageShell } from '../../components/user/UserPageShell';
import { UserPageHeader } from '../../components/user/UserPageHeader';
import { UserSearchField } from '../../components/user/UserSearchField';
import { UserSectionHeader } from '../../components/user/UserSectionHeader';
import { UserEmptyState } from '../../components/user/UserEmptyState';

export const UserSurveys = () => {
  const { user, company } = useAuth();
  const { companySlug } = useParams();
  const navigate = useNavigate();

  const { surveys, isLoading: isLoadingSurveys } = useSurveys(company?.id);
  const { responses, isLoading: isLoadingResponses } = useUserSurveyResponses(user?.id);
  const { orgUnits, orgTopLevels, isLoading: isLoadingOrg } = useOrgStructure(company?.id);

  const [searchQuery, setSearchQuery] = useState('');

  const { pendingSurveys, completedSurveys } = useMemo(() => {
    if (!surveys || !responses) return { pendingSurveys: [], completedSurveys: [] };

    // Get responded IDs
    const respondedIds = new Set(responses.map(r => r.survey_id));

    const activeSurveys = company?.surveys_enabled === false ? [] : surveys.filter(s => {
      if (s.company_id !== company?.id || s.status !== 'ACTIVE') return false;
      return checkSurveyAccess(s, user, orgUnits, orgTopLevels);
    });

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
  }, [surveys, responses, searchQuery, company?.id, company?.surveys_enabled, user, orgUnits, orgTopLevels]);

  return (
    <UserPageShell loading={isLoadingSurveys || isLoadingResponses || isLoadingOrg}>
      <UserPageHeader
        icon={MessageSquareText}
        title="Pesquisas"
        subtitle="Compartilhe sua opinião e ajude-nos a melhorar. Sua voz é importante."
        action={
          <UserSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar pesquisas..."
          />
        }
      />

      {/* Seção: Pendentes */}
      <div className="space-y-6">
        <UserSectionHeader
          title={`Pendentes (${pendingSurveys.length})`}
          action={<Target size={20} className="text-amber-400" />}
        />

        {pendingSurveys.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {pendingSurveys.map(survey => (
              <div
                key={survey.id}
                onClick={() => navigate(`/${companySlug}/pesquisas/${survey.id}`)}
                className="user-card user-template-panel theme-surface-soft group flex flex-col border hover:border-amber-500/40 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden"
              >
                {survey.cover_image && (
                  <div className="h-32 w-full relative overflow-hidden border-b border-white/[0.06]">
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
                    <h3 className="text-[var(--c-text)] font-bold text-lg mb-1 group-hover:text-amber-400 transition-colors">{survey.title}</h3>
                    <p className="line-clamp-2 text-sm theme-muted-text leading-relaxed mb-4 flex-1">
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
          <UserEmptyState
            icon={Target}
            title="Tudo em dia!"
            message="Você não tem pesquisas pendentes no momento."
          />
        )}
      </div>

      {/* Seção: Respondidas */}
      {completedSurveys.length > 0 && (
        <div className="space-y-6 pt-4 border-t border-[rgb(var(--c-text-rgb)/0.08)]">
          <UserSectionHeader
            title={`Respondidas (${completedSurveys.length})`}
            action={<FileCheck2 size={20} className="text-emerald-500" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-60 hover:opacity-100 transition-opacity duration-300">
            {completedSurveys.map(survey => (
               <div
                  key={survey.id}
                  className="user-card user-template-panel theme-surface-soft border rounded-2xl p-5"
               >
                  <div className="flex items-center gap-3 opacity-80">
                     <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                        <FileCheck2 size={20} />
                     </div>
                     <div>
                        <h3 className="text-[var(--c-text)] font-semibold line-clamp-1">{survey.title}</h3>
                        <p className="text-xs text-emerald-500 font-medium tracking-wide">Obrigado pelo seu tempo!</p>
                     </div>
                  </div>
               </div>
            ))}
          </div>
        </div>
      )}
    </UserPageShell>
  );
};
