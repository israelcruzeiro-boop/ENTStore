import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useAuth } from '../../contexts/AuthContext';
import { ContentCard } from '../../components/user/ContentCard';
import { ArrowLeft, Lock } from 'lucide-react';

export const RepositoryDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { repositories, categories: allCategories, contents: allContents } = useAppStore();

  const repo = repositories.find(r => r.id === id && r.status === 'ACTIVE');
  
  // Regra de Acesso (Admins sempre acessam, Usuários apenas se "ALL" ou se o ID estiver na lista)
  const isAuthorized = user?.role !== 'USER' || repo?.accessType !== 'RESTRICTED' || repo?.allowedUserIds?.includes(user?.id || '');

  if (!repo) {
     return <div className="p-12 text-center text-zinc-500 mt-20">Repositório inativo ou não encontrado.</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
         <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Lock size={24} className="text-[var(--c-primary)]" />
         </div>
         <h1 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h1>
         <p className="max-w-md mb-6">Você não tem permissão para acessar os conteúdos deste repositório.</p>
         <Link to="/" className="px-6 py-2.5 rounded-md bg-[var(--c-primary)] text-white font-medium hover:bg-opacity-80 transition-colors">
            Voltar ao Início
         </Link>
      </div>
    );
  }

  const categories = allCategories.filter(c => c.repositoryId === id);
  // Garante que só puxa os conteúdos ativos daquele repositório
  const contents = allContents.filter(c => c.repositoryId === id && c.status === 'ACTIVE');

  return (
    <div className="pb-12">
      {/* Banner */}
      <div className="relative h-[40vh] w-full mb-8">
         <img src={repo.bannerImage || repo.coverImage} alt={repo.name} className="w-full h-full object-cover" />
         <div className="absolute inset-0 bg-gradient-to-t from-[var(--c-bg)] via-[var(--c-bg)]/60 to-transparent"></div>
         <Link to="/" className="absolute top-24 left-4 md:left-12 flex items-center gap-2 text-zinc-300 hover:text-white transition-colors z-10">
            <ArrowLeft size={20} /> Voltar
         </Link>
         <div className="absolute bottom-0 left-4 md:left-12 pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{repo.name}</h1>
            <p className="text-zinc-400 max-w-2xl">{repo.description}</p>
         </div>
      </div>

      <div className="px-4 md:px-12">
        {/* Categories / Tabs simulation */}
        <div className="flex gap-4 mb-8 overflow-x-auto hide-scrollbar border-b border-zinc-800 pb-2">
            <button className="px-4 py-2 text-white border-b-2 border-[var(--c-primary)] font-medium whitespace-nowrap">Todos os Conteúdos</button>
            {categories.map(cat => (
                <button key={cat.id} className="px-4 py-2 text-zinc-500 hover:text-zinc-300 font-medium whitespace-nowrap transition-colors">
                    {cat.name}
                </button>
            ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {contents.map(content => (
                <div key={content.id} className="w-full">
                    <ContentCard content={content} />
                </div>
            ))}
            {contents.length === 0 && (
                <div className="col-span-full py-12 text-center text-zinc-500">
                    Nenhum conteúdo liberado neste repositório ainda.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};