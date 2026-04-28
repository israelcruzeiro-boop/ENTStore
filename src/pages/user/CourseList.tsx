import { useParams, Link } from 'react-router-dom';
import { useCourses, useOrgStructure } from '../../hooks/usePlatformData';
import { checkCourseAccess } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Loader2, Search } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { CourseCard } from '../../components/user/CourseCard';
import { useState } from 'react';

export const UserCourseList = () => {
  const { user } = useAuth();
  const { companySlug } = useParams();
  const { tenantCompany } = useTenant();
  const { courses, isLoading: coursesLoading } = useCourses(tenantCompany?.id);
  const { orgUnits, orgTopLevels, isLoading: orgLoading } = useOrgStructure(tenantCompany?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const availableCourses = courses.filter(c => c.status === 'ACTIVE' && checkCourseAccess(c, user, orgUnits, orgTopLevels));

  const filteredCourses = availableCourses.filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (coursesLoading || orgLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-[var(--c-primary)]" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-white tracking-tight">Cursos e Treinamentos</h1>
          <p className="text-slate-400 text-lg max-w-2xl font-medium">Aprimore suas habilidades com trilhas de aprendizado exclusivas e conteúdos sob medida para sua evolução.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text"
            placeholder="Buscar treinamentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="bg-white/5 rounded-[3rem] border-2 border-dashed border-white/5 py-32 flex flex-col items-center justify-center text-center backdrop-blur-sm">
          <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-6">
            <BookOpen size={40} className="text-blue-500/50" />
          </div>
          <h3 className="text-2xl font-bold text-white">Nenhum curso encontrado</h3>
          <p className="text-slate-500 max-w-xs mt-2 font-medium">
            {searchQuery ? `Não encontramos resultados para "${searchQuery}"` : "Em breve novos treinamentos serão adicionados pela equipe."}
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 text-blue-400 font-bold hover:text-blue-300 transition-colors"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} fullWidth />
          ))}
        </div>
      )}
    </div>
  );
};
