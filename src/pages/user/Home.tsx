import { MOCK_REPOSITORIES, MOCK_CONTENTS } from '../../data/mock';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';
import { Play, Info } from 'lucide-react';

export const UserHome = () => {
  const featuredContent = MOCK_CONTENTS.find(c => c.featured);
  const featuredRepos = MOCK_REPOSITORIES.filter(r => r.featured);
  const recentContents = MOCK_CONTENTS.filter(c => c.recent);

  return (
    <div className="pb-10">
      {/* Hero Banner */}
      {featuredContent && (
        <div className="relative h-[70vh] w-full mb-12">
          <div className="absolute inset-0">
            <img 
              src={MOCK_REPOSITORIES[0].bannerImage || MOCK_REPOSITORIES[0].coverImage} 
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
              {featuredContent.description} Este é um conteúdo em destaque definido pelo administrador da sua empresa para garantir que as informações mais importantes cheguem até você.
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
      <ContentRow title="Repositórios em Destaque">
        {featuredRepos.map(repo => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </ContentRow>

      <ContentRow title="Adicionados Recentemente">
        {recentContents.map(content => (
          <ContentCard key={content.id} content={content} />
        ))}
      </ContentRow>

      <ContentRow title="Todos os Repositórios">
        {MOCK_REPOSITORIES.map(repo => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </ContentRow>
    </div>
  );
};