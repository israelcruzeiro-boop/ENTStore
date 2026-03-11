import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { RepoCard } from '../../components/user/RepoCard';
import { ContentCard } from '../../components/user/ContentCard';
import { ContentRow } from '../../components/user/ContentRow';

export const UserHome = () => {
  const { company, user } = useAuth();
  const { repositories, contents } = useAppStore();

  // Filtra dados da Store local pela empresa logada, status ATIVO e Regras de Acesso
  const companyRepos = repositories.filter(r => {
     if (r.companyId !== company?.id || r.status !== 'ACTIVE') return false;
     
     // Regra de Acesso: Se for restrito, apenas os IDs permitidos (ou Admins) podem ver
     if (r.accessType === 'RESTRICTED' && user?.role === 'USER') {
         if (!r.allowedUserIds?.includes(user.id)) return false;
     }
     
     return true;
  });
  
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repositoryId) && c.status === 'ACTIVE');

  const featuredRepos = companyRepos.filter(r => r.featured);
  const recentContents = companyContents.filter(c => c.recent);

  // Define os dados do Hero Banner baseados na configuração da empresa, ou usa Fallbacks (primeiro repositório)
  const heroImage = company?.heroImage || (companyRepos.length > 0 ? (companyRepos[0].bannerImage || companyRepos[0].coverImage) : null);
  const heroTitle = company?.heroTitle || (companyRepos.length > 0 ? companyRepos[0].name : `Bem-vindo à ${company?.name}`);
  const heroSubtitle = company?.heroSubtitle || (companyRepos.length > 0 ? companyRepos[0].description : 'Explore os repositórios e conteúdos exclusivos da sua plataforma corporativa.');

  return (
    <div className="pb-10 pt-0">
      {/* Hero Banner (Ajustado para evitar muito zoom) */}
      <div className="relative w-full h-[55vh] min-h-[400px] max-h-[550px] mb-12 flex items-center bg-[var(--c-bg)] overflow-hidden">
        {heroImage ? (
          <div className="absolute inset-0 bg-black">
            <img 
              src={heroImage} 
              alt="Hero" 
              className="w-full h-full object-cover object-top opacity-80"
            />
            {/* Gradientes para mesclar a imagem com o texto e o fundo da tela */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent w-full md:w-3/4"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-transparent to-transparent"></div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-[var(--c-primary)] opacity-50"></div>
        )}
        
        <div className="relative z-10 w-full px-4 md:px-12 max-w-2xl mt-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg leading-tight">
            {heroTitle}
          </h1>
          <p className="text-lg text-zinc-300 mb-8 line-clamp-3 drop-shadow-md">
            {heroSubtitle}
          </p>
        </div>
      </div>

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
         <div className="py-20 flex items-center justify-center flex-col text-zinc-500">
           <h2 className="text-2xl font-bold text-white mb-2">Sem conteúdo</h2>
           <p>Nenhum repositório disponível para o seu acesso no momento.</p>
         </div>
      )}
    </div>
  );
};