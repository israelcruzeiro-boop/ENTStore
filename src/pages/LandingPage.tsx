import { useEffect } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FolderOpen,
  GraduationCap,
  Layers3,
  LineChart,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';

const WHATSAPP_PHONE_PARTS = ['55', '61', '99659', '3376'];
const WHATSAPP_MESSAGE =
  'Ola! Tenho interesse no Store Page. Gostaria de contratar o sistema.';

function openWhatsAppContact() {
  const phone = WHATSAPP_PHONE_PARTS.join('');
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (newWindow) newWindow.opener = null;
}

const BRAND = {
  logo: '/landing-ai/storepage-logo-transparent-cropped.png',
};

const IMAGES = {
  hero: '/landing-ai/hero-impact.jpg',
  development: '/landing-ai/pillar-development.jpg',
  surveys: '/landing-ai/pillar-surveys.jpg',
  checks: '/landing-ai/pillar-checks.jpg',
  library: '/landing-ai/pillar-library.jpg',
};

const pillars = [
  {
    id: 'desenvolvimento',
    icon: GraduationCap,
    image: IMAGES.development,
    eyebrow: 'Desenvolvimento',
    title: 'Colaboradores evoluindo com trilhas claras.',
    description:
      'Treinamentos, conteúdos, avaliações e certificados deixam de ser ações soltas e viram uma jornada contínua.',
    benefits: ['Mais adesão aos treinamentos', 'Menos retrabalho na integração', 'Conhecimento aplicado na rotina'],
  },
  {
    id: 'pesquisas',
    icon: BarChart3,
    image: IMAGES.surveys,
    eyebrow: 'Pesquisas',
    title: 'Escuta interna que vira decisão.',
    description:
      'Pesquisas de clima, pulso, satisfação e diagnóstico ajudam a empresa a entender sinais antes que eles virem problema.',
    benefits: ['Mais clareza sobre equipes', 'Diagnósticos rápidos', 'Gestores com contexto real'],
  },
  {
    id: 'checagens',
    icon: ClipboardCheck,
    image: IMAGES.checks,
    eyebrow: 'Checagens',
    title: 'Processos checados com padrão e evidência.',
    description:
      'Rotinas, auditorias, visitas e planos de ação passam a ter estrutura, acompanhamento e menos dependência de planilhas.',
    benefits: ['Execução mais padronizada', 'Acompanhamento por processo', 'Qualidade com rastreabilidade'],
  },
  {
    id: 'biblioteca',
    icon: FolderOpen,
    image: IMAGES.library,
    eyebrow: 'Biblioteca',
    title: 'Links, arquivos e mídias em um centro vivo.',
    description:
      'Vídeos, documentos, manuais e links importantes ficam organizados para o colaborador encontrar o que precisa.',
    benefits: ['Menos conteúdo perdido', 'Busca mais simples', 'Acesso organizado por necessidade'],
  },
];

const gains = [
  {
    icon: Target,
    title: 'Adoção mais rápida',
    description: 'A experiência visual e o acesso simples reduzem atrito para equipes começarem a usar.',
  },
  {
    icon: LineChart,
    title: 'Gestão com mais sinais',
    description: 'Treinamentos, pesquisas e checagens passam a compor uma visão mais clara da operação.',
  },
  {
    icon: ShieldCheck,
    title: 'Menos improviso operacional',
    description: 'Processos importantes deixam de depender de mensagens soltas, arquivos perdidos e controles paralelos.',
  },
];

const governance = [
  {
    icon: LockKeyhole,
    title: 'Controle de acesso',
    text: 'Conteúdos e jornadas podem ser organizados para públicos diferentes.',
  },
  {
    icon: Search,
    title: 'Conhecimento encontrável',
    text: 'A empresa reduz o tempo gasto procurando links, documentos e materiais importantes.',
  },
  {
    icon: Layers3,
    title: 'Estrutura por operação',
    text: 'O sistema se adapta a áreas, unidades, times e objetivos internos.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Uso web e mobile',
    text: 'Acesso prático para colaboradores no computador ou celular.',
  },
];

function SalesButton({
  children,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-[#ff4b1f] text-white shadow-[0_24px_70px_rgba(255,75,31,0.28)] hover:bg-[#ef2d16]'
      : 'border border-white/12 bg-white/[0.045] text-white hover:border-[#ff4b1f]/40 hover:bg-white/[0.07]';

  return (
    <button
      type="button"
      onClick={openWhatsAppContact}
      aria-label="Abrir conversa no WhatsApp para contratar o Store Page"
      className={`inline-flex min-h-12 items-center justify-center gap-3 rounded-2xl px-6 font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a45] ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#ff4b1f]/25 bg-[#ff4b1f]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.08em] text-[#ff7a45]">
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-3xl font-black leading-tight text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-7 text-zinc-400 md:text-lg">{description}</p>
    </div>
  );
}

function ImagePanel({
  src,
  alt,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-black shadow-[0_34px_120px_rgba(0,0,0,0.45)] ${className}`}>
      <img
        src={src}
        alt={alt}
        width={1440}
        height={823}
        loading={priority ? 'eager' : 'lazy'}
        className="aspect-[16/9] w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,transparent_38%,rgba(0,0,0,0.42)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
    </div>
  );
}

export const LandingPage = () => {
  useEffect(() => {
    document.title = 'Store Page | Desenvolvimento, pesquisas, checagens e biblioteca corporativa';
    const description =
      'Store Page é o sistema corporativo para desenvolver colaboradores, criar pesquisas, executar checagens de processos e centralizar arquivos, links e mídias.';
    const metaDesc = document.querySelector('meta[name="description"]');

    if (metaDesc) {
      metaDesc.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }

    const existingSchema = document.getElementById('lpage-schema');
    if (!existingSchema) {
      const script = document.createElement('script');
      script.id = 'lpage-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Store Page',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description,
        offers: { '@type': 'Offer', category: 'SaaS' },
        creator: { '@type': 'Organization', name: 'Store Page' },
      });
      document.head.appendChild(script);
    }

    return () => {
      const schemaEl = document.getElementById('lpage-schema');
      if (schemaEl) schemaEl.remove();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050505] text-white selection:bg-[#ff4b1f] selection:text-white">
      <style>{`
        @keyframes store-page-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .sp-rise {
          animation: store-page-rise 700ms ease both;
        }

        @media (prefers-reduced-motion: reduce) {
          .sp-rise {
            animation: none !important;
          }
        }
      `}</style>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/84 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8" aria-label="Principal">
          <a
            href="#topo"
            className="flex items-center gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff7a45]"
          >
            <img src={BRAND.logo} alt="StorePage" className="h-7 w-auto object-contain sm:h-8" />
          </a>

          <div className="hidden items-center gap-6 text-sm font-medium text-zinc-400 lg:flex">
            <a className="transition hover:text-white" href="#solucao">
              Solução
            </a>
            <a className="transition hover:text-white" href="#pilares">
              Pilares
            </a>
            <a className="transition hover:text-white" href="#ganhos">
              Ganhos
            </a>
          </div>

          <SalesButton className="min-h-11 rounded-xl px-4 text-sm">
            Contratar
            <MessageCircle size={17} aria-hidden="true" />
          </SalesButton>
        </nav>
      </header>

      <main id="topo">
        <section className="relative isolate overflow-hidden border-b border-white/10 px-4 pb-16 pt-20 md:px-8 md:pb-20 md:pt-24 lg:pt-28">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.032)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(110deg,rgba(255,75,31,0.14),transparent_24%,transparent_68%,rgba(239,45,22,0.12)),linear-gradient(180deg,transparent,rgba(0,0,0,0.72))]" />

          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div className="sp-rise">
              <img
                src={BRAND.logo}
                alt="StorePage"
                width={420}
                height={97}
                className="mb-7 h-auto w-[min(410px,88vw)] object-contain drop-shadow-[0_22px_60px_rgba(255,75,31,0.22)] md:w-[min(460px,46vw)]"
              />
              <Eyebrow>
                <Sparkles size={14} aria-hidden="true" />
                Sistema corporativo para pessoas e processos
              </Eyebrow>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] text-white sm:text-5xl md:text-6xl">
                Transforme conhecimento espalhado em execução que aparece.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-300 md:text-xl">
                Desenvolva colaboradores, crie pesquisas, execute checagens e organize conteúdos em uma experiência visual, simples e pronta para a rotina da empresa.
              </p>

              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <SalesButton className="min-h-14 px-7 text-base">
                  Quero contratar o sistema
                  <ArrowRight size={20} aria-hidden="true" />
                </SalesButton>
                <a
                  href="#pilares"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/12 bg-white/[0.045] px-7 text-base font-bold text-white transition hover:border-[#ff4b1f]/40 hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff7a45]"
                >
                  Ver os ganhos
                  <ArrowRight size={19} aria-hidden="true" />
                </a>
              </div>
            </div>

            <ImagePanel
              src={IMAGES.hero}
              alt="Imagem IA representando ganhos empresariais ao contratar o Store Page"
              priority
              className="sp-rise lg:mt-6"
            />
          </div>
        </section>

        <section id="solucao" className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <SectionHeading
                align="left"
                eyebrow="A troca certa"
                title="Sai a sensação de sistema fragmentado. Entra uma marca forte para aprender, ouvir e executar."
                description="A nova direção visual usa imagens IA com o símbolo O/play como assinatura, deixando a página mais comercial, mais memorável e menos parecida com uma tela administrativa."
              />
              <div className="grid gap-4 sm:grid-cols-3">
                {gains.map((gain) => {
                  const Icon = gain.icon;
                  return (
                    <article key={gain.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                      <Icon size={24} className="text-[#ff7a45]" aria-hidden="true" />
                      <h3 className="mt-5 text-lg font-black text-white">{gain.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">{gain.description}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="pilares" className="border-y border-white/10 bg-[#090909] px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Pilares da solução"
              title="Cada ponto da proposta agora tem uma imagem própria."
              description="As imagens foram criadas para vender o ganho da contratação: mais desenvolvimento, mais escuta, mais padrão operacional e mais conhecimento disponível."
            />

            <div className="mt-12 grid gap-8">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon;
                const reversed = index % 2 === 1;

                return (
                  <article
                    key={pillar.id}
                    className="grid gap-7 rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-4 md:p-5 lg:grid-cols-2 lg:items-center"
                  >
                    <ImagePanel
                      src={pillar.image}
                      alt={`Imagem IA representando ${pillar.eyebrow.toLowerCase()} no Store Page`}
                      className={reversed ? 'lg:order-2' : ''}
                    />
                    <div className={`p-2 md:p-5 ${reversed ? 'lg:order-1' : ''}`}>
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ff4b1f]/14 text-[#ff7a45]">
                        <Icon size={24} aria-hidden="true" />
                      </span>
                      <p className="mt-6 text-xs font-black uppercase tracking-[0.08em] text-[#ff7a45]">
                        {pillar.eyebrow}
                      </p>
                      <h3 className="mt-3 text-3xl font-black leading-tight text-white">{pillar.title}</h3>
                      <p className="mt-4 text-base leading-7 text-zinc-400">{pillar.description}</p>
                      <ul className="mt-6 space-y-3">
                        {pillar.benefits.map((benefit) => (
                          <li key={benefit} className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
                            <CheckCircle2 size={18} className="text-[#ff7a45]" aria-hidden="true" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <SalesButton className="mt-8 min-h-12 px-5 text-sm">
                        Contratar para este cenário
                        <ArrowRight size={18} aria-hidden="true" />
                      </SalesButton>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="ganhos" className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <ImagePanel
              src={IMAGES.hero}
              alt="Imagem IA com símbolo O/play representando crescimento e organização empresarial"
            />
            <div>
              <SectionHeading
                align="left"
                eyebrow="Ganho da contratação"
                title="A empresa não compra só uma página. Ela compra clareza operacional."
                description="A contratação do Store Page posiciona o conhecimento da empresa em um lugar mais forte: treinamentos, pesquisas, checagens e conteúdos deixam de competir entre si e passam a empurrar a operação na mesma direção."
              />
              <div className="mt-8 grid gap-4">
                {[
                  'Menos tempo explicando onde está cada material.',
                  'Mais facilidade para padronizar processos e acompanhar execução.',
                  'Mais presença visual da marca na experiência dos colaboradores.',
                ].map((item) => (
                  <div key={item} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <CheckCircle2 size={21} className="mt-0.5 shrink-0 text-[#ff7a45]" aria-hidden="true" />
                    <p className="text-sm font-semibold leading-6 text-zinc-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-[#090909] px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <SectionHeading
              align="left"
              eyebrow="Governança"
              title="Visual forte, promessa responsável."
              description="A página destaca benefícios reais sem inventar números, certificações ou clientes. O foco é mostrar valor, clareza e utilidade para empresas."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {governance.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <Icon size={22} className="text-[#ff7a45]" aria-hidden="true" />
                    <h3 className="mt-5 text-lg font-black text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contratar" className="px-4 py-16 md:px-8 md:py-24">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] border border-[#ff4b1f]/30 bg-[#ff4b1f]/10 p-6 shadow-[0_34px_120px_rgba(255,75,31,0.12)] md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-center">
              <div>
                <img src={BRAND.logo} alt="StorePage" className="mb-8 h-auto w-[min(300px,80vw)] object-contain" />
                <Eyebrow>
                  <MessageCircle size={14} aria-hidden="true" />
                  Contratação
                </Eyebrow>
                <h2 className="mt-5 text-3xl font-black leading-tight text-white md:text-5xl">
                  Pronto para transformar treinamento, pesquisa, checagem e conteúdo em uma experiência só?
                </h2>
                <p className="mt-5 text-lg leading-8 text-zinc-300">
                  O próximo passo é conversar com a equipe e entender como o Store Page pode entrar na rotina da sua empresa.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
                <p className="text-sm font-semibold text-zinc-400">Canal de contratação</p>
                <p className="mt-2 text-2xl font-black leading-tight text-white">Atendimento direto pelo WhatsApp</p>
                <SalesButton className="mt-6 w-full min-h-14 px-6">
                  Contratar pelo WhatsApp
                  <ArrowRight size={19} aria-hidden="true" />
                </SalesButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#050505] px-4 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <img src={BRAND.logo} alt="StorePage" className="h-auto w-[190px] object-contain" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SalesButton variant="secondary" className="min-h-11 rounded-xl px-4 text-sm">
              Falar com a equipe
              <MessageCircle size={16} aria-hidden="true" />
            </SalesButton>
          </div>
        </div>
      </footer>
    </div>
  );
};
