import { useParams, Link } from 'react-router-dom';
import { MOCK_REPOSITORIES, MOCK_CATEGORIES, MOCK_CONTENTS } from '../../data/mock';
import { ContentCard } from '../../components/user/ContentCard';
import { ArrowLeft } from 'lucide-react';

export const RepositoryDetail = () => {
  const { id } = useParams();
  const repo = MOCK_REPOSITORIES.find(r => r.id === id);
  const categories = MOCK_CATEGORIES.filter(c => c.repositoryId === id);
  const contents = MOCK_CONTENTS.filter(c => c.repositoryId === id);

  if (!repo) return <div className="p-12 text-center text-white">Repositório não encontrado</div>;

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
                    Nenhum conteúdo neste repositório ainda.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};