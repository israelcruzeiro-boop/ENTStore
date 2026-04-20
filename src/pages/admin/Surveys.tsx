import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCompanies } from '../../hooks/useSupabaseData';
import { useSurveys } from '../../hooks/useSurveys';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, Layout, Loader2, Search, Target, MessageSquareText, BarChart3, Settings2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { surveyService } from '../../services/surveys.service';
import { Logger } from '../../utils/logger';

export const AdminSurveys = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
  const { surveys, isLoading, mutate } = useSurveys(company?.id);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newSurvey, setNewSurvey] = useState({
    title: '',
    description: '',
  });

  const handleCreateSurvey = async () => {
    if (!company?.id || !newSurvey.title) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        company_id: company.id,
        title: newSurvey.title,
        description: newSurvey.description,
        status: 'DRAFT' as const,
      };

      const created = await surveyService.createSurvey(payload);
      
      toast.success("Pesquisa criada com sucesso!");
      setIsCreateDialogOpen(false);
      setNewSurvey({ title: '', description: '' });
      mutate();
      
      navigate(`/admin/${companySlug}/surveys/${created.id}/builder`);
    } catch (err) {
      const error = err as Error;
      Logger.error("Erro ao criar pesquisa:", error);
      toast.error(error.message || "Erro inesperado ao criar pesquisa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSurveys = surveys.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pesquisas & NPS</h1>
          <p className="text-slate-500 text-sm">Gerencie o feedback dos colaboradores e métricas de satisfação.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm border-0">
            <Plus size={18} /> Nova Pesquisa
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar pesquisas por título ou descrição..." 
            className="pl-10 border-slate-200 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 animate-pulse">Carregando suas pesquisas...</p>
        </div>
      ) : filteredSurveys.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSurveys.map(survey => (
            <Link 
              key={survey.id}
              to={`/admin/${companySlug}/surveys/${survey.id}/builder`}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col"
            >
              <div className="h-28 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                {survey.cover_image ? (
                  <img src={survey.cover_image} alt={survey.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Target size={48} className="text-slate-300 opacity-20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" />
                <div className="absolute top-3 right-3 z-10">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    survey.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 
                    survey.status === 'DRAFT' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'
                  }`}>
                    {survey.status === 'ACTIVE' ? 'Ativa' : survey.status === 'DRAFT' ? 'Rascunho' : 'Arquivada'}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 truncate">{survey.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{survey.description || 'Nenhuma descrição fornecida.'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5"><MessageSquareText size={14} /> Perguntas: {(survey as any).question_count ?? '--'}</span>
                  
                  <div className="flex items-center gap-3">
                     {survey.status !== 'DRAFT' && (
                        <span 
                           className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 z-10"
                           onClick={(e) => {
                             e.preventDefault(); 
                             navigate(`/admin/${companySlug}/surveys/${survey.id}/dashboard`);
                           }}
                        >
                           <BarChart3 size={14} /> Resultados
                        </span>
                     )}
                     <span className="text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5"><Settings2 size={14}/> Editar</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 shadow-inner">
          <MessageSquareText size={64} className="mb-6 opacity-10" />
          <p className="text-xl font-bold text-slate-900 mb-1">Nenhuma pesquisa encontrada</p>
          <p className="text-sm opacity-60 mb-8 max-w-xs text-center">
            {searchQuery ? 'Não encontramos pesquisas que coincidam com sua busca.' : 'Seu módulo de pesquisas ainda está vazio.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg px-8 py-6 rounded-xl">
            <Plus size={20} /> Criar Primeira Pesquisa
          </Button>
        </div>
      )}

      {/* Dialog de Criação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="bg-blue-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <MessageSquareText size={24} /> Criar Nova Pesquisa
              </DialogTitle>
            </DialogHeader>
            <p className="text-blue-100 text-sm mt-1">Defina os detalhes básicos da sua pesquisa ou NPS.</p>
          </div>
          
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Título da Pesquisa</Label>
              <Input 
                placeholder="Ex: Pesquisa de Clima Organizacional" 
                value={newSurvey.title}
                onChange={e => setNewSurvey({...newSurvey, title: e.target.value})}
                className="border-slate-200 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Descrição</Label>
              <Textarea 
                placeholder="Explique o propósito desta pesquisa (visível para os respondentes)..." 
                className="min-h-[120px] resize-none border-slate-200 focus:ring-blue-500"
                value={newSurvey.description}
                onChange={e => setNewSurvey({...newSurvey, description: e.target.value})}
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCreateSurvey} disabled={isSubmitting || !newSurvey.title} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Criar Pesquisa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
