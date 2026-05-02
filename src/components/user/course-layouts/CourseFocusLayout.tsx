import type { CourseLayoutProps } from './types';

export const CourseFocusLayout = ({ viewModel }: CourseLayoutProps) => {
  const { render } = viewModel;

  return (
    <>
      {render.header}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        {render.hero}
        <div className="w-full max-w-4xl mx-auto px-4 pt-5 pb-32 sm:pb-40 space-y-6 sm:space-y-8 relative z-10">
          {render.mentor}
          {render.stepIndicators}
          {render.activeStage}
        </div>
      </main>
      {render.navigationPanel}
    </>
  );
};
