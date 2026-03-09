import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';
import { Play, Info } from 'lucide-react';

export const UserHome = () => {
  const { company } = useAuth();
  const { repositories, contents } = useAppStore();

  // Filtra dados da Store local pela empresa logada
  const companyRepos = repositories.filter(r => r.companyId === company?.id);
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repositoryId));

  const featuredContent = companyContents.find(c => c.featured);
  const featuredRepos = companyRepos.filter(r => r.featured);
  const recentContents = companyContents.filter(c => c.recent);

  return (
    <div className="pb-10">
      {/* Hero Banner */}
      {featuredContent && companyRepos.length > 0 && (
        <div className="relative h-[70vh] w-full mb-12">
          <div className="absolute inset-0">
            <img 
              src={companyRepos[0].bannerImage || companyRepos[0].coverImage} 
              alt="Hero" 
              className="w-full h-full object-cover"
            />
            {/* Gradient Overlay for Netflix effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-transparent to-transparent"></div>
          </div>
          
          <div className="absolute bottom-[20%] left-4 md:left-12 max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
              {featuredContent.title}
            </h1>
            <p className="text-lg text-zinc-300 mb-8 line-clamp-3 drop-shadow-md">
              {featuredContent.description} Este é um conteúdo em destaque da {company?.name}.
            </p>
            <div className="flex gap-4">
              <button className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md font-bold hover:bg-zinc-200 transition-colors">
                <Play fill="currentColor" size={20} />
                Acessar Agora
              </button>
              <button className="flex items-center gap-2 bg-zinc-500/50 text-white px-6 py-3 rounded-md font-bold hover:bg-zinc-500/70 backdrop-blur-sm transition-colors">
                <Info size={20} />
                Mais Informações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trilhos de Conteúdo */}
      {featuredRepos.length > 0 && (
        <ContentRow title="Repositórios em Destaque">
          {featuredRepos.map(repo => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </ContentRow>
      )}

      {recentContents.length > 0 && (
        <ContentRow title="Adicionados Recentemente">
          {recentContents.map(content => (
            <ContentCard key={content.id} content={content} />
          ))}
        </ContentRow>
      )}

      {companyRepos.length > 0 && (
        <ContentRow title="Todos os Repositórios">
          {companyRepos.map(repo => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </ContentRow>
      )}

      {companyRepos.length === 0 && (
         <div className="h-[60vh] flex items-center justify-center flex-col text-zinc-500">
           <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo à {company?.name}</h2>
           <p>Nenhum conteúdo disponível no momento.</p>
         </div>
      )}
    </div>
  );
};