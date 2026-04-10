import { Link, useParams } from 'react-router-dom';
import { BookOpen, PlayCircle, Layers, ChevronRight } from 'lucide-react';
import { Course } from '../../types';
import { useCourseModuleStats } from '../../hooks/useSupabaseData';
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
      className={`group bg-white/5 backdrop-blur-sm rounded-[2rem] border border-white/10 overflow-hidden hover:bg-white/10 hover:border-blue-500/30 transition-all duration-500 flex flex-col h-full ${fullWidth ? 'w-full' : 'w-72 md:w-80 shrink-0'}`}
    >
      <div className="aspect-video relative overflow-hidden bg-slate-900">
        {course.thumbnail_url || course.cover_image ? (
          <img 
            src={course.thumbnail_url || course.cover_image} 
            alt={course.title} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600/20 to-indigo-700/20 flex items-center justify-center">
            <BookOpen size={48} className="text-white/10" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 to-transparent"></div>
        
        <div className="absolute top-5 left-5">
            <CourseNeonStatus status={status} />
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 space-y-4">
        <h2 className="text-lg font-bold text-white leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">{course.title}</h2>

        <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed flex-1">{course.description || "Inicie sua jornada de aprendizado agora mesmo e domine novos conhecimentos."}</p>

        <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-500">
               <Layers size={14} className="text-blue-500/50" />
               <span className="text-[10px] font-bold uppercase tracking-tighter">{moduleStats.totalModules} Fases</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500">
               <PlayCircle size={14} className="text-blue-500/50" />
               <span className="text-[10px] font-bold uppercase tracking-tighter">{moduleStats.totalContents} Aulas</span>
            </div>
          </div>
          <div className="bg-white/5 p-2 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  );
};
