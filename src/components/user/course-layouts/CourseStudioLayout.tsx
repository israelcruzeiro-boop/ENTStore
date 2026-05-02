import { ListChecks } from 'lucide-react';
import type { CourseLayoutProps } from './types';

export const CourseStudioLayout = ({ viewModel }: CourseLayoutProps) => {
  const { render } = viewModel;

  return (
    <>
      {render.header}
      <main className="flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-h-0 overflow-y-auto overscroll-contain">
            <div className="border-b border-white/[0.05] bg-white/[0.02] lg:hidden">
              <div className="w-full max-w-4xl mx-auto px-4 py-4 space-y-4">
                {render.mentor}
                {render.stepIndicators}
              </div>
            </div>

            <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-32 lg:pb-10 space-y-6">
              <div className="hidden lg:block">
                {render.mentor}
              </div>
              <div className="hidden lg:block">
                {render.stepIndicators}
              </div>
              {render.activeStage}
            </div>
          </section>

          <aside className="hidden min-h-0 border-l border-white/[0.08] bg-slate-950/70 backdrop-blur-xl lg:flex lg:flex-col">
            <div className="border-b border-white/[0.08] px-5 py-5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white"
                  style={{ color: viewModel.primaryColor || '#60a5fa' }}
                >
                  <ListChecks size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">Estudio</p>
                  <h2 className="truncate text-sm font-black text-white">{viewModel.courseTitle}</h2>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${viewModel.progress}%`, backgroundColor: viewModel.primaryColor || '#3b82f6' }}
                  />
                </div>
                <span className="text-xs font-black tabular-nums text-white/70">{viewModel.progress}%</span>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
              {render.moduleNavigation('sidebar')}
            </div>
          </aside>
        </div>
      </main>
      <div className="lg:hidden">
        {render.navigationPanel}
      </div>
    </>
  );
};
