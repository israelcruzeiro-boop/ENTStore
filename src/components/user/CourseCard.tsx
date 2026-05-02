import { Link, useParams } from 'react-router-dom';
import { BookOpen, PlayCircle, Layers, ChevronRight } from 'lucide-react';
import { Course } from '../../types';
import { useCourseModuleStats } from '../../hooks/usePlatformData';
import { CourseNeonStatus } from './CourseNeonStatus';

interface CourseCardProps {
  course: Course;
  fullWidth?: boolean;
  status?: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' | string;
}

export const CourseCard = ({ course, fullWidth = false, status = 'NOT_STARTED' }: CourseCardProps) => {
  const { companySlug } = useParams();
  const { moduleStats } = useCourseModuleStats(course.id);

  return (
    <Link 
      to={`/${companySlug}/cursos/${course.id}`}
      className={`group user-card home-card user-template-panel theme-surface-soft backdrop-blur-sm rounded-[2rem] border overflow-hidden hover:border-[var(--c-primary)]/40 transition-all duration-500 flex flex-col h-full ${fullWidth ? 'w-full' : 'w-72 md:w-80 shrink-0'}`}
    >
      <div className="aspect-video relative overflow-hidden bg-[var(--c-card)]">
        {course.thumbnail_url || course.cover_image ? (
          <img 
            src={course.thumbnail_url || course.cover_image} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-700/20 flex items-center justify-center">
            <BookOpen size={48} className="text-[var(--c-text)] opacity-20" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        <div className="absolute top-5 left-5">
            <CourseNeonStatus status={status} />
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 space-y-4">
        <h2 className="text-lg font-bold text-[var(--c-text)] leading-tight group-hover:text-[var(--c-primary)] transition-colors line-clamp-2">{course.title}</h2>

        <p className="theme-muted-text text-xs line-clamp-2 leading-relaxed flex-1">{course.description || "Inicie sua jornada de aprendizado agora mesmo e domine novos conhecimentos."}</p>

        <div className="pt-4 mt-auto border-t border-[rgb(var(--c-text-rgb)/0.08)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 theme-subtle-text">
               <Layers size={14} className="text-[var(--c-primary)] opacity-60" />
               <span className="text-[10px] font-bold uppercase tracking-tighter">{moduleStats.totalModules} Fases</span>
            </div>
            <div className="flex items-center gap-1.5 theme-subtle-text">
               <PlayCircle size={14} className="text-[var(--c-primary)] opacity-60" />
               <span className="text-[10px] font-bold uppercase tracking-tighter">{moduleStats.totalContents} Aulas</span>
            </div>
          </div>
          <div className="theme-surface-soft p-2 rounded-full group-hover:bg-[var(--c-primary)] group-hover:text-white transition-all duration-300">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  );
};
