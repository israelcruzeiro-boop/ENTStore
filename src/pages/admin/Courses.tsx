import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCompanies, useCourses } from '../../hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, ChevronRight, Layout, Loader2, Search, MoreVertical, Edit2, Archive, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { courseSchema } from '../../types/schemas';
import { Logger } from '../../utils/logger';

export const AdminCourses = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
  const { courses, isLoading, mutate } = useCourses(company?.id);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    thumbnail_url: ''
  });

  const handleCreateCourse = async () => {
    if (!company?.id || !newCourse.title) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        company_id: company.id,
        title: newCourse.title,
        description: newCourse.description,
        thumbnail_url: newCourse.thumbnail_url,
        status: 'DRAFT' as const
      };

      const validation = courseSchema.safeParse(payload);
      if (!validation.success) throw new Error("Dados inválidos");

      const { data, error } = await supabase.from('courses').insert(validation.data).select('id').single();

      if (error) throw error;

      toast.success("Curso criado com sucesso!");
      setIsCreateDialogOpen(false);
      setNewCourse({ title: '', description: '', thumbnail_url: '' });
      mutate();
      
      // Navegar para o construtor de módulos
      navigate(`/admin/${companySlug}/courses/${data.id}`);
    } catch (err) {
      const error = err as Error;
      Logger.error("Erro ao criar curso:", error);
      toast.error(error.message || "Erro inesperado ao criar curso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cursos & Treinamentos</h1>
          <p className="text-slate-500 text-sm">Gerencie conteúdo estruturado e quizzes gerados por IA.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate(`/admin/${companySlug}/courses/dashboard`)} variant="outline" className="gap-2 border-slate-200 text-slate-700">
            <BarChart3 size={18} /> Dashboard
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-sm border-0">
            <Plus size={18} /> Novo Curso
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Buscar cursos por título ou descrição..." 
            className="pl-10 border-slate-200 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={32} />
          <p className="text-slate-500 animate-pulse">Carregando seus treinamentos...</p>
        </div>
      ) : filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <Link 
              key={course.id}
              to={`/admin/${companySlug}/courses/${course.id}`}
              className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col"
            >
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Layout size={48} className="opacity-20" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    course.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 
                    course.status === 'DRAFT' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'
                  }`}>
                    {course.status === 'ACTIVE' ? 'Ativo' : course.status === 'DRAFT' ? 'Rascunho' : 'Arquivado'}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 truncate">{course.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{course.description || 'Nenhuma descrição fornecida.'}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5"><BookOpen size={14} /> Módulos: {(course as any).module_count ?? '--'}</span>
                  <span className="text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">Gerenciar <ChevronRight size={14} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 shadow-inner">
          <BookOpen size={64} className="mb-6 opacity-10" />
          <p className="text-xl font-bold text-slate-900 mb-1">Nenhum treinamento encontrado</p>
          <p className="text-sm opacity-60 mb-8 max-w-xs text-center">
            {searchQuery ? 'Não encontramos cursos que coincidam com sua busca.' : 'Sua academia corporativa ainda está vazia.'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg px-8 py-6 rounded-xl">
            <Plus size={20} /> Criar Primeiro Curso
          </Button>
        </div>
      )}

      {/* Dialog de Criação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="bg-blue-600 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BookOpen size={24} /> Criar Novo Curso
              </DialogTitle>
            </DialogHeader>
            <p className="text-blue-100 text-sm mt-1">Defina os detalhes básicos do seu treinamento.</p>
          </div>
          
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Título do Curso</Label>
              <Input 
                placeholder="Ex: Integração de Novos Colaboradores" 
                value={newCourse.title}
                onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                className="border-slate-200 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Descrição do Treinamento</Label>
              <Textarea 
                placeholder="Explique do que se trata este curso e quais os objetivos de aprendizagem..." 
                className="min-h-[120px] resize-none border-slate-200 focus:ring-blue-500"
                value={newCourse.description}
                onChange={e => setNewCourse({...newCourse, description: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">URL da Capa (Opcional)</Label>
              <Input 
                placeholder="https://exemplo.com/imagem-do-curso.jpg" 
                value={newCourse.thumbnail_url}
                onChange={e => setNewCourse({...newCourse, thumbnail_url: e.target.value})}
                className="border-slate-200 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleCreateCourse} disabled={isSubmitting || !newCourse.title} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md">
              {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
              Criar Curso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
