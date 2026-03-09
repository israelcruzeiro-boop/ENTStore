import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Viewer } from '../../components/user/Viewer';
import { ArrowLeft, Share2, Heart } from 'lucide-react';

export const ContentDetail = () => {
  const { id } = useParams();
  const { contents, repositories } = useAppStore();

  const content = contents.find(c => c.id === id);
  const repo = content ? repositories.find(r => r.id === content.repositoryId) : null;

  if (!content) return <div className="p-12 text-center text-white mt-20">Conteúdo não encontrado</div>;

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 min-h-screen">
       <Link to={repo ? `/repo/${repo.id}` : '/'} className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft size={20} /> Voltar para {repo?.name || 'Início'}
       </Link>

       <Viewer content={content} />

       <div className="max-w-5xl mx-auto mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{content.title}</h1>
            <p className="text-zinc-400 text-sm md:text-base">{content.description}</p>
          </div>
          <div className="flex gap-3">
             <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                <Heart size={20} />
             </button>
             <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:bg-zinc-700 transition-colors">
                <Share2 size={20} />
             </button>
          </div>
       </div>
    </div>
  );
};