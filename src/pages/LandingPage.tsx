import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Smartphone, FolderOpen, BarChart3, Building2, BookOpen, Shield,
  Settings, Upload, Users, MessageCircle, Zap, Lock, Globe,
  ChevronRight, Play, Star, ArrowRight, Sparkles, Link as LinkIcon, FileText
} from 'lucide-react';

const WHATSAPP_LINK = 'https://wa.me/5561996593376?text=Ol%C3%A1!%20Tenho%20interesse%20no%20ENTStore.%20Gostaria%20de%20saber%20mais!';

// Product images
const IMAGES = {
  heroShowcase: 'https://ik.imagekit.io/lflb43qwh/ENTStore/ENTStore%20002.jpg',
  whatIs: 'https://ik.imagekit.io/lflb43qwh/ENTStore/ENTStore%20001.jpg',
  features: 'https://ik.imagekit.io/lflb43qwh/ENTStore/ENTStore%20005.jpg',
  howItWorks: 'https://ik.imagekit.io/lflb43qwh/ENTStore/ENTStore%20003.jpg',
  ctaBackground: 'https://ik.imagekit.io/lflb43qwh/ENTStore/ENTStore%20004.jpg',
};

// Hook for scroll-triggered animations
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

// Animated counter
function AnimatedCounter({ target, suffix = '' }: { target: string; suffix?: string }) {
  const { ref, isVisible } = useScrollReveal();
  const [count, setCount] = useState(0);
  const numericTarget = parseInt(target.replace(/\D/g, ''), 10) || 0;

  useEffect(() => {
    if (!isVisible || numericTarget === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(numericTarget / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= numericTarget) { setCount(numericTarget); clearInterval(timer); }
      else setCount(current);
    }, 30);
    return () => clearInterval(timer);
  }, [isVisible, numericTarget]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// Section wrapper with reveal animation
function RevealSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Feature card component
function FeatureCard({ icon: Icon, title, description, index }: {
  icon: React.ElementType; title: string; description: string; index: number;
}) {
  return (
    <RevealSection delay={index * 100}>
      <div className="group relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 md:p-8 hover:bg-white/[0.06] hover:border-orange-500/20 transition-all duration-500 h-full">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <Icon size={22} className="text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
          <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
    </RevealSection>
  );
}

// Step card for "Como Funciona"
function StepCard({ number, title, description, icon: Icon, index }: {
  number: string; title: string; description: string; icon: React.ElementType; index: number;
}) {
  return (
    <RevealSection delay={index * 150} className="relative">
      <div className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center hover:border-orange-500/20 transition-all duration-500 h-full group">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/20 group-hover:scale-110 transition-transform duration-300">
          <Icon size={28} className="text-white" />
        </div>
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border border-orange-500/30 text-orange-400 text-sm font-bold">
            {number}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
    </RevealSection>
  );
}

// Benefit card
function BenefitCard({ icon: Icon, title, description, stat, index }: {
  icon: React.ElementType; title: string; description: string; stat: string; index: number;
}) {
  return (
    <RevealSection delay={index * 120}>
      <div className="group text-center p-6 md:p-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
          <Icon size={26} className="text-orange-400" />
        </div>
        <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
          {stat}
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
    </RevealSection>
  );
}

// Floating particles background
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-orange-500/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${5 + Math.random() * 10}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: FolderOpen, title: 'Repositórios Organizados', description: 'Crie Hubs temáticos e Bibliotecas para armazenar vídeos, PDFs, links e documentos de forma estruturada e sempre acessível.' },
  { icon: LinkIcon, title: 'Links de Mídias & Docs', description: 'Armazene links para vídeos do YouTube, Vimeo, Google Drive, PDFs, planilhas e qualquer recurso digital. Tudo num só lugar.' },
  { icon: BarChart3, title: 'Painel Administrativo', description: 'Dashboard poderoso para gerenciar repositórios, conteúdos, usuários e métricas de visualização em tempo real.' },
  { icon: Smartphone, title: 'Acesso de Qualquer Lugar', description: 'Web e mobile (PWA). Seus arquivos e links disponíveis em qualquer dispositivo, a qualquer momento.' },
];

const STEPS = [
  { icon: Settings, title: 'Configure Sua Empresa', description: 'Personalize logo, cores e estrutura organizacional. Crie repositórios e defina quem acessa o quê.' },
  { icon: Upload, title: 'Armazene Seus Conteúdos', description: 'Adicione links de vídeos, PDFs, documentos e mídias organizados em Hubs e Bibliotecas com categorias claras.' },
  { icon: Users, title: 'Equipe Acessa Facilmente', description: 'Seus colaboradores encontram tudo organizado, com busca rápida e acesso direto pelo celular ou computador.' },
];

const BENEFITS = [
  { icon: Zap, title: 'Rápido', description: 'Acesso instantâneo a qualquer conteúdo armazenado, sem fricção.', stat: '100%' },
  { icon: Lock, title: 'Seguro', description: 'Controle total de quem vê e acessa cada repositório.', stat: '100%' },
  { icon: Star, title: 'Personalizável', description: 'Webapp com visual próprio e estrutura sob medida.', stat: '100%' },
];

export const LandingPage = () => {
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLElement>(null);

  const handleScroll = useCallback(() => {
    setScrollY(window.scrollY);
  }, []);

  useEffect(() => {
    document.title = 'ENTStore — Armazenamento Inteligente de Mídias e Documentos';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', 'ENTStore é a plataforma de armazenamento fácil de links de mídias e documentos corporativos. Organize vídeos, PDFs e links num só lugar para toda a sua empresa.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'ENTStore é a plataforma de armazenamento fácil de links de mídias e documentos corporativos. Organize vídeos, PDFs e links num só lugar para toda a sua empresa.';
      document.head.appendChild(meta);
    }

    // JSON-LD Schema
    const existingSchema = document.getElementById('lpage-schema');
    if (!existingSchema) {
      const script = document.createElement('script');
      script.id = 'lpage-schema';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'ENTStore',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        description: 'Plataforma de armazenamento fácil de links de mídias e documentos corporativos. Organize vídeos, PDFs e links num só lugar.',
        offers: { '@type': 'Offer', category: 'SaaS' },
        creator: { '@type': 'Organization', name: 'ENTStore', contactPoint: { '@type': 'ContactPoint', telephone: '+55-61-99659-3376', contactType: 'sales' } },
      });
      document.head.appendChild(script);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      const schemaEl = document.getElementById('lpage-schema');
      if (schemaEl) schemaEl.remove();
    };
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.2; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.5; }
          50% { transform: translateY(-40px) translateX(-5px); opacity: 0.3; }
          75% { transform: translateY(-20px) translateX(15px); opacity: 0.6; }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes slide-up-hero {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-animate { animation: slide-up-hero 0.8s ease forwards; }
        .hero-animate-delay-1 { animation: slide-up-hero 0.8s ease 0.15s forwards; opacity: 0; }
        .hero-animate-delay-2 { animation: slide-up-hero 0.8s ease 0.3s forwards; opacity: 0; }
        .hero-animate-delay-3 { animation: slide-up-hero 0.8s ease 0.45s forwards; opacity: 0; }
      `}</style>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <header
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-4 md:px-8 overflow-hidden"
      >
        {/* Background glows */}
        <div
          className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, transparent 70%)',
            animation: 'glow-pulse 8s ease-in-out infinite',
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        />
        <div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)',
            animation: 'glow-pulse 10s ease-in-out infinite 2s',
            transform: `translateY(${scrollY * -0.05}px)`,
          }}
        />
        <FloatingParticles />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="hero-animate mb-8">
            <img
              src="/assets/logo.png"
              alt="ENTStore"
              className="h-14 md:h-20 w-auto mx-auto drop-shadow-2xl"
            />
          </div>

          {/* Badge */}
          <div className="hero-animate-delay-1 mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs md:text-sm font-medium">
              <Sparkles size={14} />
              Armazenamento de Mídias & Documentos
            </span>
          </div>

          {/* Headline */}
          <h1 className="hero-animate-delay-1 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight mb-6">
            Seus arquivos{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500">
              organizados
            </span>
            <br />
            num só lugar
          </h1>

          {/* Subtitle */}
          <p className="hero-animate-delay-2 text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Armazene links de vídeos, PDFs, documentos e mídias da sua empresa de forma
            simples e organizada. Acesso rápido para toda a equipe, de qualquer dispositivo.
          </p>

          {/* CTAs */}
          <div className="hero-animate-delay-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Entrar em contato via WhatsApp"
              className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base md:text-lg shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <MessageCircle size={22} />
              Fale Conosco
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#funcionalidades"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-all duration-300"
            >
              <Play size={18} />
              Explore as Funcionalidades
            </a>
          </div>
        </div>

        {/* Hero Showcase Image */}
        <div className="hero-animate-delay-3 mt-16 relative max-w-4xl mx-auto w-full px-4">
          <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-orange-500/10">
            <img
              src={IMAGES.heroShowcase}
              alt="ENTStore — Plataforma de treinamento corporativo com hubs de conteúdo"
              className="w-full h-auto object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-60 pointer-events-none" />
          </div>
          {/* Glow under image */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-orange-500/15 blur-[60px] rounded-full pointer-events-none" />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-600">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center p-1">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-bounce" />
          </div>
        </div>
      </header>

      <main>
        {/* ═══════════════════════ O QUE É ═══════════════════════ */}
        <section className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <RevealSection>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
                A Plataforma
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-6">
                O que é o{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  ENTStore
                </span>
                ?
              </h2>
              <p className="text-zinc-400 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed mb-12">
                O ENTStore é a <strong className="text-white">plataforma de armazenamento inteligente</strong> para
                organizar todos os recursos digitais da sua empresa. Centralize links de vídeos, PDFs, documentos
                e mídias num repositório com a cara da sua marca — acessível para a equipe,
                de qualquer lugar.
              </p>
            </RevealSection>

            {/* Content type icons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto mb-16">
              {[
                { icon: Play, label: 'Vídeos' },
                { icon: FileText, label: 'PDFs' },
                { icon: LinkIcon, label: 'Links' },
                { icon: FolderOpen, label: 'Repositórios' },
              ].map((item, i) => (
                <RevealSection key={item.label} delay={i * 100}>
                  <div className="flex flex-col items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-orange-500/20 transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <item.icon size={22} className="text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">{item.label}</span>
                  </div>
                </RevealSection>
              ))}
            </div>

            {/* Showcase image - Film strip */}
            <RevealSection>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl max-w-4xl mx-auto">
                <img
                  src={IMAGES.whatIs}
                  alt="ENTStore — Armazene vídeos, PDFs, links e documentos corporativos"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-[#050505]/30 pointer-events-none" />
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════ FUNCIONALIDADES ═══════════════════════ */}
        <section id="funcionalidades" className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.02] to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto relative z-10">
            <RevealSection className="text-center mb-16">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
                Funcionalidades
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Tudo que sua empresa{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  precisa
                </span>
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Cada funcionalidade foi pensada para simplificar o armazenamento e a organização dos seus conteúdos.
              </p>
            </RevealSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mb-16">
              {FEATURES.map((feature, index) => (
                <FeatureCard key={feature.title} {...feature} index={index} />
              ))}
            </div>

            {/* Features showcase image - Vortex */}
            <RevealSection>
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl max-w-5xl mx-auto">
                <img
                  src={IMAGES.features}
                  alt="ENTStore — Central de armazenamento de mídias e documentos"
                  className="w-full h-auto object-cover max-h-[400px]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40 pointer-events-none" />
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══════════════════════ COMO FUNCIONA ═══════════════════════ */}
        <section className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="max-w-5xl mx-auto">
            <RevealSection className="text-center mb-16">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
                Simples e Poderoso
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Como{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  funciona
                </span>
                ?
              </h2>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Em 3 passos simples, sua empresa centraliza e organiza todos os seus conteúdos digitais.
              </p>
            </RevealSection>

            {/* Office showcase image */}
            <RevealSection className="mb-16">
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl max-w-4xl mx-auto">
                <img
                  src={IMAGES.howItWorks}
                  alt="Equipe acessando conteúdos armazenados no ENTStore"
                  className="w-full h-auto object-cover max-h-[420px]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-[#050505]/20 pointer-events-none" />
              </div>
            </RevealSection>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step, index) => (
                <StepCard key={step.title} {...step} number={String(index + 1)} index={index} />
              ))}
            </div>

            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-1/2 left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" style={{ marginTop: '60px' }} />
          </div>
        </section>

        {/* ═══════════════════════ BENEFÍCIOS ═══════════════════════ */}
        <section className="relative py-24 md:py-32 px-4 md:px-8">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/[0.02] to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto relative z-10">
            <RevealSection className="text-center mb-16">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium mb-6">
                Resultados Reais
              </span>
              <h2 className="text-3xl md:text-5xl font-black mb-4">
                Por que escolher a{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                  ENTStore
                </span>
                ?
              </h2>
            </RevealSection>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {BENEFITS.map((benefit, index) => (
                <BenefitCard key={benefit.title} {...benefit} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ CTA CONTATO ═══════════════════════ */}
        <section className="relative py-24 md:py-32 px-4 md:px-8">
          {/* Background image - Futuristic Hall */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src={IMAGES.ctaBackground}
              alt=""
              className="w-full h-full object-cover opacity-[0.08]"
              loading="lazy"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505]" />
          </div>

          <div className="max-w-3xl mx-auto relative z-10">
            <RevealSection>
              <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-md border border-white/[0.08] rounded-3xl p-10 md:p-16 text-center overflow-hidden">
                {/* Glow behind */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-orange-500/10 blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-orange-500/30">
                    <MessageCircle size={30} className="text-white" />
                  </div>

                  <h2 className="text-3xl md:text-4xl font-black mb-4">
                    Pronto para{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                      organizar
                    </span>
                    {' '}seus conteúdos?
                  </h2>

                  <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                    Fale com a nossa equipe e descubra como o ENTStore pode centralizar
                    todos os documentos e mídias da sua empresa. Sem compromisso.
                  </p>

                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Entrar em contato via WhatsApp para assinar"
                    className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-lg shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    <MessageCircle size={22} />
                    Entre em Contato — WhatsApp
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </a>

                  <p className="text-zinc-500 text-sm mt-6">
                    📱 (61) 99659-3376 • Resposta rápida
                  </p>
                </div>
              </div>
            </RevealSection>
          </div>
        </section>
      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="border-t border-white/[0.05] py-10 px-4 md:px-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="ENTStore" className="h-8 w-auto opacity-70" />
          </div>

          <p className="text-zinc-500 text-sm text-center">
            © {new Date().getFullYear()} ENTStore. Todos os direitos reservados.
          </p>

          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp ENTStore"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors text-sm"
          >
            <MessageCircle size={16} />
            (61) 99659-3376
          </a>
        </div>
      </footer>
    </div>
  );
};
