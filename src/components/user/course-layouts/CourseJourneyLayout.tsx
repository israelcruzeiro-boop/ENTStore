import { CheckCircle2, Map, Milestone } from 'lucide-react';
import type { CourseLayoutProps } from './types';

export const CourseJourneyLayout = ({ viewModel }: CourseLayoutProps) => {
  const { render } = viewModel;

  return (
    <>
      {render.header}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        <section className="border-b border-white/[0.06] bg-white/[0.025]">
          <div className="w-full max-w-6xl mx-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                  <Map size={13} style={{ color: viewModel.primaryColor || '#60a5fa' }} />
                  Jornada
                </div>
                <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
                  {viewModel.courseTitle}
                </h1>
                <p className="mt-2 text-sm font-medium text-white/45">
                  Fase {Math.max(viewModel.currentModuleIndex + 1, 1)} de {viewModel.modules.length}
                  {viewModel.currentContentTitle ? ` - ${viewModel.currentContentTitle}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <CheckCircle2 size={18} style={{ color: viewModel.primaryColor || '#60a5fa' }} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/35">Progresso</p>
                  <p className="text-xl font-black tabular-nums text-white">{viewModel.progress}%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {render.hero}

        <div className="w-full max-w-6xl mx-auto px-4 pt-5 pb-32 sm:px-6 sm:pb-40 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-4 shadow-2xl backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2 px-1 text-xs font-black uppercase tracking-[0.18em] text-white/45">
                  <Milestone size={15} style={{ color: viewModel.primaryColor || '#60a5fa' }} />
                  Checkpoints
                </div>
                {render.moduleNavigation('timeline')}
              </div>
            </aside>

            <section className="min-w-0 space-y-6">
              {render.mentor}
              {render.stepIndicators}
              {render.activeStage}
            </section>
          </div>
        </div>
      </main>
      {render.navigationPanel}
    </>
  );
};
