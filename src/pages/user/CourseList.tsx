import { useCourses, useOrgStructure, useOwnCourseEnrollments } from '../../hooks/usePlatformData';
import { checkCourseAccess } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { CourseCard } from '../../components/user/CourseCard';
import { useState } from 'react';
import { UserPageShell } from '../../components/user/UserPageShell';
import { UserPageHeader } from '../../components/user/UserPageHeader';
import { UserSearchField } from '../../components/user/UserSearchField';
import { UserEmptyState } from '../../components/user/UserEmptyState';

export const UserCourseList = () => {
  const { user } = useAuth();
  const { tenantCompany } = useTenant();
  const { courses, isLoading: coursesLoading } = useCourses(tenantCompany?.id);
  const { orgUnits, orgTopLevels, isLoading: orgLoading } = useOrgStructure(tenantCompany?.id);
  const [searchQuery, setSearchQuery] = useState('');

  const availableCourses = courses.filter(c => c.status === 'ACTIVE' && checkCourseAccess(c, user, orgUnits, orgTopLevels));
  const availableCourseIds = availableCourses.map(course => course.id);
  const { enrollments: userEnrollments } = useOwnCourseEnrollments(
    availableCourseIds,
    user?.id,
    tenantCompany?.id
  );

  const filteredCourses = availableCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <UserPageShell loading={coursesLoading || orgLoading}>
      <UserPageHeader
        icon={BookOpen}
        title="Cursos e Treinamentos"
        subtitle="Aprimore suas habilidades com trilhas de aprendizado exclusivas e conteúdos sob medida para sua evolução."
        action={
          <UserSearchField
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Buscar treinamentos..."
          />
        }
      />

      {filteredCourses.length === 0 ? (
        <UserEmptyState
          icon={BookOpen}
          title="Nenhum curso encontrado"
          message={searchQuery ? `Não encontramos resultados para "${searchQuery}"` : "Em breve novos treinamentos serão adicionados pela equipe."}
          action={searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[var(--c-primary)] font-bold hover:opacity-80 transition-colors"
            >
              Limpar busca
            </button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredCourses.map(course => {
            const enrollment = userEnrollments.find(item => item.course_id === course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                fullWidth
                status={enrollment?.status || 'NOT_STARTED'}
              />
            );
          })}
        </div>
      )}
    </UserPageShell>
  );
};
