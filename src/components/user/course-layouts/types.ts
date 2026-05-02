import type { ReactNode } from 'react';
import type {
  CourseContent,
  CourseLayoutTemplate,
  CourseModule,
  CoursePhaseQuestion,
} from '../../../types';

export type CourseNavigationSurface = 'sheet' | 'sidebar' | 'timeline';

export type CoursePlayerRenderSlots = {
  header: ReactNode;
  hero: ReactNode;
  mentor: ReactNode;
  stepIndicators: ReactNode;
  activeStage: ReactNode;
  navigationPanel: ReactNode;
  moduleNavigation: (surface?: CourseNavigationSurface) => ReactNode;
};

export type CoursePlayerViewModel = {
  template: CourseLayoutTemplate;
  courseTitle: string;
  coverUrl?: string;
  progress: number;
  primaryColor?: string;
  modules: CourseModule[];
  activeModuleId: string | null;
  currentModuleIndex: number;
  currentContentTitle?: string;
  showPhaseQuestions: boolean;
  isReviewMode: boolean;
  activeModuleContents: CourseContent[];
  moduleQuestions: CoursePhaseQuestion[];
  render: CoursePlayerRenderSlots;
};

export type CourseLayoutProps = {
  viewModel: CoursePlayerViewModel;
};
