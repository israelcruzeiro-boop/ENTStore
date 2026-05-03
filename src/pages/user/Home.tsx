import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext'; // Restaurado pois é necessário para o slug
import { useOrgStructure, useRepositories, useContents, useSimpleLinks, useContentMetricSummaries, useCourses, useOwnCourseEnrollments } from '../../hooks/usePlatformData';
import { useChecklists, useUserSubmissions } from '../../hooks/useChecklists';
import { useSurveys, useUserSurveyResponses } from '../../hooks/useSurveys';
import { checkRepoAccess, checkCourseAccess, checkChecklistAccess, checkSurveyAccess } from '../../lib/permissions';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';
import { Search, Library, PlayCircle, Link as LinkIcon, ExternalLink, MonitorPlay, BookOpen, Loader2, ClipboardCheck, MessageSquareText, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { HeaderLayout } from '../../components/user/HeaderLayout';
import { CourseCard } from '../../components/user/CourseCard';
import { UserEmptyState } from '../../components/user/UserEmptyState';
import { buildThemeStyle, normalizeEnvironmentTemplate, normalizeTheme } from '../../lib/appearance';

interface HomeTaskCardProps {
  to: string;
  title: string;
  description?: string;
  meta: string;
  tone: 'checklist' | 'survey';
  coverImage?: string | null;
}

const HomeTaskCard = ({ to, title, description, meta, tone, coverImage }: HomeTaskCardProps) => {
  const Icon = tone === 'checklist' ? ClipboardCheck : MessageSquareText;
  const toneClass = tone === 'checklist' ? 'text-emerald-500' : 'text-amber-500';

  if (tone === 'checklist') {
    return (
      <Link
        to={to}
        className="audit-home-folder-card user-card home-card user-template-panel home-template-panel group w-72 shrink-0 snap-start p-4 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/50 md:w-80"
      >
        <div className="audit-home-folder-face">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.15] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]">
                  <Icon size={21} />
                </div>
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">{meta}</p>
                  <h3 className="line-clamp-2 text-base font-black leading-tight text-white">
                    {title}
                  </h3>
                </div>
              </div>
              <span className="rounded-full bg-white/[0.15] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                Pasta
              </span>
            </div>

            <div>
              <p className="mt-5 line-clamp-2 text-sm leading-relaxed text-white/75">
                {description || 'Abra a pasta para conferir o checklist digital pendente.'}
              </p>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.15] pt-3 text-xs font-black uppercase tracking-wider text-white">
                Abrir pasta
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className="user-card home-card user-template-panel home-template-panel group w-72 md:w-80 shrink-0 snap-start theme-surface-soft border min-h-[168px] flex flex-col overflow-hidden hover:-translate-y-1 hover:border-[var(--c-primary)]/45 transition-all duration-300"
    >
      {coverImage && (
        <div className="h-28 w-full overflow-hidden border-b border-[rgb(var(--c-text-rgb)/0.08)] bg-[rgb(var(--c-text-rgb)/0.04)]">
          <img
            src={coverImage}
            alt={title}
            className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between p-5">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl bg-[rgb(var(--c-text-rgb)/0.06)] flex items-center justify-center ${toneClass}`}>
            <Icon size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-black theme-subtle-text mb-2">{meta}</p>
            <h3 className="text-base font-black text-[var(--c-text)] leading-tight line-clamp-2 group-hover:text-[var(--c-primary)] transition-colors">
              {title}
            </h3>
          </div>
        </div>

        <p className="theme-muted-text text-sm leading-relaxed line-clamp-2 mt-5">
          {description || 'Acesse esta atividade para continuar sua jornada no ambiente.'}
        </p>
        <div className="mt-5 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--c-primary)]">
          Abrir <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
};

export const UserHome = () => {
  const { company, user } = useAuth();
  const { slug } = useTenant();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // SWR Hooks para dados da API
  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { contents, isLoading: loadingContents } = useContents({ companyId: company?.id });
  const { simpleLinks, isLoading: loadingLinks } = useSimpleLinks({ companyId: company?.id });
  const { courses, isLoading: loadingCourses } = useCourses(company?.id);
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);
  const { checklists, isLoading: loadingChecklists } = useChecklists(company?.id);
  const { submissions: checklistSubmissions, isLoading: loadingChecklistSubmissions } = useUserSubmissions(user?.id, company?.id);
  const { surveys, isLoading: loadingSurveys } = useSurveys(company?.id);
  const { responses: surveyResponses, isLoading: loadingSurveyResponses } = useUserSurveyResponses(user?.id);
  const activeCourseIds = courses.filter(course => course.status === 'ACTIVE').map(course => course.id);
  const { metricSummaries, isLoading: loadingMetrics } = useContentMetricSummaries({ companyId: company?.id });
  const { enrollments: userEnrollments, isLoading: loadingEnrollments } = useOwnCourseEnrollments(activeCourseIds, user?.id, company?.id);

  const isLoading = loadingRepos || loadingContents || loadingLinks || loadingCourses || loadingOrg || loadingMetrics || loadingEnrollments || loadingChecklists || loadingChecklistSubmissions || loadingSurveys || loadingSurveyResponses;

  // Filtra dados da API usando a função global de validação
  const companyRepos = repositories.filter(r => {
     if (r.company_id !== company?.id || r.status !== 'ACTIVE') return false;
     return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });
  
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repository_id) && c.status === 'ACTIVE');
  const companyLinks = simpleLinks.filter(l => repoIds.includes(l.repository_id) && l.status === 'ACTIVE');

  // Separação entre Hubs (Completos/Playlists) e Bibliotecas (Simples)
  const hubRepos = companyRepos.filter(r => r.type === 'FULL' || r.type === 'PLAYLIST' || r.type === 'VIDEO_PLAYLIST' || !r.type);
  const libraryRepos = companyRepos.filter(r => r.type === 'SIMPLE');

  // Listas padrão para a Home (quando a busca está vazia)
  const featuredHubs = hubRepos.filter(r => r.featured);
  const featuredLibs = libraryRepos.filter(r => r.featured);
  const recentContents = companyContents.filter(c => c.recent);

  const companyCourses = courses.filter(c => {
     if (c.company_id !== company?.id || c.status !== 'ACTIVE') return false;
     return checkCourseAccess(c, user, orgUnits, orgTopLevels);
  });

  const companyChecklists = checklists.filter(c => {
     if (c.company_id !== company?.id || c.status !== 'ACTIVE') return false;
     return checkChecklistAccess(c, user, orgUnits, orgTopLevels);
  });

  const answeredChecklistIds = new Set(checklistSubmissions.map(s => s.checklist_id));
  const pendingChecklists = companyChecklists.filter(c => !answeredChecklistIds.has(c.id));

  const surveysFeatureEnabled = company?.surveys_enabled !== false;
  const respondedSurveyIds = new Set(surveyResponses.map(r => r.survey_id));
  const companySurveys = surveysFeatureEnabled ? surveys.filter(s => {
     if (s.company_id !== company?.id || s.status !== 'ACTIVE') return false;
     return checkSurveyAccess(s, user, orgUnits, orgTopLevels);
  }) : [];
  const hasSurveys = companySurveys.length > 0;
  const pendingSurveys = companySurveys.filter(s => s.allow_multiple_responses || !respondedSurveyIds.has(s.id!));
  const hasUserRespondedSurvey = (surveyId?: string) => !!surveyId && respondedSurveyIds.has(surveyId);
  const isSurveyAvailableToAnswer = (survey: (typeof companySurveys)[number]) => survey.allow_multiple_responses || !hasUserRespondedSurvey(survey.id);
  const getSurveyCardMeta = (survey: (typeof companySurveys)[number]) => {
     if (survey.allow_multiple_responses) return 'Resposta aberta';
     return hasUserRespondedSurvey(survey.id) ? 'Respondida' : 'Pesquisa';
  };
  const getSurveyCardTo = (survey: (typeof companySurveys)[number]) => {
     if (isSurveyAvailableToAnswer(survey)) return `/${slug}/pesquisas/${survey.id}`;
     return `/${slug}/pesquisas`;
  };

  // Listas para a Busca
  const query = searchQuery.toLowerCase().trim();
  const filteredHubs = query ? hubRepos.filter(r => r.name.toLowerCase().includes(query)) : [];
  const filteredLibs = query ? libraryRepos.filter(r => r.name.toLowerCase().includes(query)) : [];
  const filteredContents = query ? companyContents.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)) : [];
  const filteredLinks = query ? companyLinks.filter(l => l.name.toLowerCase().includes(query) || l.url.toLowerCase().includes(query)) : [];
  const filteredCourses = query ? companyCourses.filter(c => c.title.toLowerCase().includes(query)) : [];
  const filteredSurveys = query ? companySurveys.filter(s => s.title.toLowerCase().includes(query) || (s.description || '').toLowerCase().includes(query)) : [];
  
  const hero_image = company?.hero_image || (companyRepos.length > 0 ? (companyRepos[0].banner_image || companyRepos[0].cover_image) : null);
  const hero_title = company?.hero_title || company?.name || 'Área do Usuário';
  const hero_subtitle = company?.hero_subtitle || 'Explore os treinamentos, checklists e bibliotecas exclusivas da sua corporação.';

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const repoTypeFilters = new Set(['FULL', 'PLAYLIST', 'VIDEO_PLAYLIST', 'SIMPLE']);
  const isRepoFilter = activeFilter ? repoTypeFilters.has(activeFilter) : false;
  const showCourses = !activeFilter || activeFilter === 'COURSE';
  const showChecklists = (!activeFilter || activeFilter === 'CHECKLIST') && company?.checklists_enabled !== false;
  const showSurveys = (!activeFilter || activeFilter === 'SURVEY') && hasSurveys;
  const filteredHubsByMain = isRepoFilter ? hubRepos.filter(r => r.type === activeFilter) : (!activeFilter ? hubRepos : []);
  const filteredLibsByMain = isRepoFilter ? libraryRepos.filter(r => r.type === activeFilter) : (!activeFilter ? libraryRepos : []);
  const surveysForMainFilter = activeFilter === 'SURVEY' ? companySurveys : pendingSurveys;

  const filters = [
    { id: 'FULL', label: 'Hubs', icon: <MonitorPlay size={14} /> },
    { id: 'PLAYLIST', label: 'Playlists', icon: <PlayCircle size={14} /> },
    { id: 'VIDEO_PLAYLIST', label: 'Vídeos', icon: <PlayCircle size={14} /> },
    { id: 'SIMPLE', label: 'Links', icon: <Library size={14} /> },
    { id: 'COURSE', label: 'Cursos', icon: <BookOpen size={14} /> },
    { id: 'CHECKLIST', label: 'Checklists', icon: <ClipboardCheck size={14} /> },
    { id: 'SURVEY', label: 'Pesquisas', icon: <MessageSquareText size={14} /> },
  ];

  const handleSearchSubmit = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && searchQuery.trim()) {
         navigate(`/${slug}/busca?q=${encodeURIComponent(searchQuery)}`);
      }
  };
  const theme = normalizeTheme(company?.theme);
  const environmentTemplate = normalizeEnvironmentTemplate(company?.landing_page_layout);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[var(--c-primary)]" size={40} />
      </div>
    );
  }

  return (
    <div
      className={`pb-10 pt-0 min-h-screen text-[var(--c-text)] home-template-${environmentTemplate}`}
      style={buildThemeStyle(theme)}
    >
      <HeaderLayout 
        layout={environmentTemplate}
        theme={theme}
        image={hero_image || ''}
        title={hero_title}
        subtitle={hero_subtitle}
        position={company?.hero_position}
        brightness={company?.hero_brightness}
        align="left"
      >
        <div className="relative max-w-sm mt-8">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 theme-subtle-text" size={20} />
           <input
              type="text"
              placeholder="Busca"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="w-full theme-control backdrop-blur-xl border rounded-full py-3 pl-14 pr-6 text-base focus:outline-none focus:ring-1 focus:ring-[var(--c-primary)] transition-all shadow-2xl"
           />
        </div>
      </HeaderLayout>

      <div className="home-main-content max-w-[1600px] mx-auto px-4 md:px-10 mt-4 relative z-20">
         <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={`user-chip home-chip px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${!activeFilter ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgb(var(--c-primary-rgb)/0.22)]' : 'theme-surface-soft hover:border-[var(--c-primary)]/30'}`}
            >
              Todos
            </button>
            {filters.filter(f => f.id !== 'SURVEY' || hasSurveys).map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`user-chip home-chip flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${activeFilter === f.id ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgb(var(--c-primary-rgb)/0.22)]' : 'theme-surface-soft hover:border-[var(--c-primary)]/30'}`}
              >
                {f.icon} {f.label}
              </button>
            ))}
         </div>
      </div>

      <div className="max-w-[1600px] mx-auto mt-6 md:mt-8 px-4 md:px-10 relative z-10">
         {query ? (
           <div className="space-y-12 animate-in fade-in duration-300">
             {filteredHubs.length === 0 && filteredLibs.length === 0 && filteredContents.length === 0 && filteredLinks.length === 0 && filteredCourses.length === 0 && filteredSurveys.length === 0 ? (
                <UserEmptyState
                  icon={Search}
                  title="Nenhum resultado"
                  message={`Não encontramos nada para "${query}".`}
                />
             ) : (
                <>
                  {filteredHubs.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <MonitorPlay size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--c-text)] tracking-tight">Hubs</h2>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
                        {filteredHubs.map(repo => (
                           <RepoCard key={repo.id} repo={repo} fullWidth />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredLibs.length > 0 && (
                    <div className={filteredHubs.length > 0 ? "border-t border-white/5 pt-8" : ""}>
                      <div className="flex items-center gap-2 mb-4">
                        <Library size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--c-text)] tracking-tight">Bibliotecas</h2>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
                        {filteredLibs.map(repo => (
                           <RepoCard key={repo.id} repo={repo} fullWidth />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredContents.length > 0 && (
                    <div className="border-t border-white/5 pt-8">
                      <div className="flex items-center gap-2 mb-4">
                        <PlayCircle size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--c-text)] tracking-tight">Conteúdos em Hubs</h2>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredContents.map(content => (
                           <ContentCard key={content.id} content={content} fullWidth metricSummaries={metricSummaries} />
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredLinks.length > 0 && (
                    <div className="border-t border-white/5 pt-8">
                      <div className="flex items-center gap-2 mb-4">
                        <LinkIcon size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--c-text)] tracking-tight">Links em Bibliotecas</h2>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {filteredLinks.map(link => (
                          <Link key={link.id} to={`/${slug}/repo/${link.repository_id}`} className="p-4 rounded-2xl theme-surface-soft border hover:border-[var(--c-primary)]/40 flex justify-between items-center group transition-all duration-300">
                            <div className="overflow-hidden">
                              <h3 className="text-[var(--c-text)] font-medium group-hover:text-[var(--c-primary)] transition-colors truncate">{link.name}</h3>
                              <p className="text-xs theme-muted-text mt-1 flex items-center gap-1.5 truncate">
                                <span className="px-2 py-0.5 rounded-md theme-surface font-medium">{link.type}</span>
                                {link.url}
                              </p>
                            </div>
                            <div className="w-10 h-10 rounded-full theme-surface-soft group-hover:bg-[var(--c-primary)] flex items-center justify-center transition-colors duration-300 shrink-0 ml-4">
                               <ExternalLink size={16} className="theme-muted-text group-hover:text-white" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredSurveys.length > 0 && (
                    <div className="border-t border-white/5 pt-8">
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquareText size={20} className="text-[var(--c-primary)]" />
                        <h2 className="text-xl md:text-2xl font-bold text-[var(--c-text)] tracking-tight">Pesquisas</h2>
                      </div>
                      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {filteredSurveys.map(survey => (
                          <HomeTaskCard
                            key={survey.id}
                            to={getSurveyCardTo(survey)}
                            title={survey.title}
                            description={survey.description || undefined}
                            meta={getSurveyCardMeta(survey)}
                            tone="survey"
                            coverImage={survey.cover_image}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
             )}
           </div>
         ) : (
           <div className="animate-in fade-in duration-300">
             {companyCourses.length > 0 && showCourses && (
                <ContentRow title="Seus Treinamentos">
                  {companyCourses.slice(0, 6).map(course => {
                    const enrollment = userEnrollments.find(e => e.course_id === course.id);
                    return <CourseCard key={course.id} course={course} status={enrollment?.status || 'NOT_STARTED'} />;
                  })}
                </ContentRow>
             )}

             {pendingChecklists.length > 0 && showChecklists && (
                <ContentRow title="Checklists Pendentes">
                  {pendingChecklists.slice(0, 6).map(checklist => (
                    <HomeTaskCard
                      key={checklist.id}
                      to={`/${slug}/checklists`}
                      title={checklist.title}
                      description={checklist.description}
                      meta="Pendente"
                      tone="checklist"
                    />
                  ))}
                </ContentRow>
             )}

             {surveysForMainFilter.length > 0 && showSurveys && (
                <ContentRow title={activeFilter === 'SURVEY' ? 'Pesquisas Disponíveis' : 'Pesquisas para Responder'}>
                  {surveysForMainFilter.slice(0, 6).map(survey => (
                    <HomeTaskCard
                      key={survey.id}
                      to={getSurveyCardTo(survey)}
                      title={survey.title}
                      description={survey.description || undefined}
                      meta={getSurveyCardMeta(survey)}
                      tone="survey"
                      coverImage={survey.cover_image}
                    />
                  ))}
                </ContentRow>
             )}

             {featuredHubs.length > 0 && !activeFilter && (
               <ContentRow title="Hubs em Destaque">
                 {featuredHubs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {featuredLibs.length > 0 && !activeFilter && (
               <ContentRow title="Bibliotecas em Destaque">
                 {featuredLibs.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {recentContents.length > 0 && !activeFilter && (
               <ContentRow title="Adicionados Recentemente">
                 {recentContents.map(content => (
                   <ContentCard key={content.id} content={content} metricSummaries={metricSummaries} />
                 ))}
               </ContentRow>
             )}

             {filteredHubsByMain.length > 0 && (
               <ContentRow title={activeFilter ? filters.find(f => f.id === activeFilter)?.label + ' Disponíveis' : "Hubs"}>
                 {filteredHubsByMain.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {filteredLibsByMain.length > 0 && (
               <ContentRow title={activeFilter ? filters.find(f => f.id === activeFilter)?.label + ' Disponíveis' : "Biblioteca"}>
                 {filteredLibsByMain.map(repo => (
                   <RepoCard key={repo.id} repo={repo} />
                 ))}
               </ContentRow>
             )}

             {companyRepos.length === 0 && companyCourses.length === 0 && companyChecklists.length === 0 && companySurveys.length === 0 && (
                <UserEmptyState
                  icon={MonitorPlay}
                  title="Sem conteúdo"
                  message="Nenhum hub ou biblioteca disponível para o seu acesso no momento."
                />
             )}
           </div>
         )}
      </div>
    </div>
  );
};
