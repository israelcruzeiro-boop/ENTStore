import React from 'react';
import { Theme } from '../../types';

interface HeaderLayoutProps {
  layout: 'classic' | 'gradient' | 'immersive' | 'solid' | 'glass' | 'split';
  theme: Theme;
  image: string;
  title: string;
  subtitle?: string;
  logoUrl?: string;
  position?: number;
  brightness?: number;
  children?: React.ReactNode;
  isPublic?: boolean;
  align?: 'left' | 'center';
  badge?: string;
}

export const HeaderLayout: React.FC<HeaderLayoutProps> = ({
  layout,
  theme,
  image,
  title,
  subtitle,
  logoUrl,
  position = 50,
  brightness = 100,
  children,
  isPublic = false,
  align = isPublic ? 'center' : 'left',
  badge
}) => {
  const containerClasses = isPublic ? "relative w-full" : "relative w-full mb-8";

  switch (layout) {
    case 'immersive':
      return (
        <header className={`${containerClasses} h-[52vh] min-h-[420px] overflow-hidden`}>
          <div className="absolute inset-0">
            <img 
              src={image} 
              alt="Cover" 
              className="w-full h-full object-cover scale-105"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100}) saturate(1.1)`
              }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/55 to-black/90" 
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.55), ${theme.background})` }} 
            />
          </div>
          
          <div className="relative z-10 w-full h-full flex flex-col justify-end items-start px-6 md:px-12 pb-10 md:pb-16">
            {logoUrl && isPublic && (
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl mb-6 backdrop-blur-md bg-black/40">
                <img src={logoUrl} alt={title} className="w-full h-full object-cover rounded-xl" />
              </div>
            )}
            {badge && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-4xl md:text-7xl font-black tracking-tight drop-shadow-lg mb-4 leading-[0.92] max-w-5xl" style={{ color: theme.text }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-base md:text-xl max-w-3xl font-medium leading-relaxed drop-shadow-md mb-6" style={{ color: theme.text, opacity: 0.9 }}>
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </header>
      );
      
    case 'gradient':
      return (
        <header className={`${containerClasses} pt-28 pb-16 ${isPublic ? '' : 'px-6 md:px-12'} ${align === 'left' ? 'text-left' : 'text-center'} overflow-hidden`}>
          <div className="absolute inset-0 opacity-60">
            <img 
              src={image} 
              alt="Cover" 
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100})`
              }}
            />
            <div className="absolute inset-0 backdrop-blur-3xl" style={{ backgroundColor: theme.background, opacity: 0.7 }} />
            <div className="absolute inset-x-0 top-0 h-32 opacity-50" style={{ backgroundImage: `linear-gradient(90deg, ${theme.primary}, transparent, ${theme.secondary})` }} />
            <div 
              className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" 
              style={{ backgroundImage: `linear-gradient(to bottom, transparent, ${theme.background})` }} 
            />
          </div>
          
          <div className="relative z-10 w-full h-full flex flex-col justify-center items-start px-4 md:px-8 border-l-4 border-[var(--c-primary)]">
            {logoUrl && isPublic && (
              <div className="w-24 h-24 rounded-full overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] mb-6 bg-black/50 border border-white/10 backdrop-blur-xl">
                <img src={logoUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            {badge && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-3xl md:text-6xl font-black tracking-tight drop-shadow-sm mb-4 max-w-4xl" style={{ color: theme.text }}>
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-base md:text-lg opacity-80 max-w-2xl font-medium leading-relaxed mb-6" style={{ color: theme.text }}>
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </header>
      );
      
    case 'solid':
      return (
        <header className={`${containerClasses} relative overflow-hidden`}>
          <div className="w-full h-40 md:h-56 relative shrink-0">
            <img 
              src={image} 
              alt="Capa" 
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100})`
              }}
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          
          <div className="relative z-10 -mt-24 md:-mt-32 flex flex-col items-start px-8 w-full">
            {logoUrl && isPublic ? (
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-4 shadow-xl mb-4 relative shrink-0" 
                style={{ borderColor: theme.background, backgroundColor: theme.card }}
              >
                <img src={logoUrl} alt={title} className="w-full h-full object-cover relative z-10" />
              </div>
            ) : !isPublic ? null : (
              <div 
                className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 flex items-center justify-center text-4xl font-black shadow-xl mb-4 shrink-0" 
                style={{ borderColor: theme.background, backgroundColor: `${theme.primary}20`, color: theme.primary }}
              >
                {title.charAt(0)}
              </div>
            )}

            {badge && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-3" style={{ color: theme.text }}>
                {title}
              </h1>
            )}
            
            {subtitle && (
              <p className="text-base opacity-80 font-medium leading-relaxed mb-6 max-w-2xl">
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </header>
      );

    case 'glass':
      return (
        <header className={`${containerClasses} min-h-[500px] md:h-[60vh] flex items-center ${align === 'left' ? 'justify-start' : 'justify-center'} ${isPublic ? '' : 'px-6 md:px-12'} relative overflow-hidden`}>
          <div className="absolute inset-0">
            <img 
              src={image} 
              alt="Capa" 
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100})`
              }}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          </div>
          
          <div className="relative z-10 w-full p-6 md:p-12 rounded-[2.5rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-black/30 backdrop-blur-2xl flex flex-col items-start px-8">
            {logoUrl && isPublic && (
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl overflow-hidden border border-white/10 shadow-2xl mb-8 bg-black/40">
                <img src={logoUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            {badge && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-3xl md:text-6xl font-black tracking-tight mb-4 text-white">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg md:text-xl text-white/80 max-w-2xl font-medium leading-relaxed mb-8">
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </header>
      );

    case 'split':
      return (
        <header className={`${containerClasses} min-h-[400px] grid grid-cols-1 lg:grid-cols-2 bg-[#09090b] overflow-hidden`}>
          <div className="flex flex-col justify-center px-8 py-12 items-start order-2 lg:order-1">
            {logoUrl && isPublic && (
              <div className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-xl mb-8 bg-zinc-900">
                <img src={logoUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            )}
            {badge && (
              <div className="flex items-center gap-2 mb-3 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 text-white leading-[0.9]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg md:text-xl text-zinc-400 max-w-xl font-medium leading-relaxed mb-8">
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
          
          <div className="relative h-[300px] lg:h-auto order-1 lg:order-2">
            <img 
              src={image} 
              alt="Capa" 
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100})`
              }}
            />
            <div className={`absolute inset-0 bg-gradient-to-${align === 'left' ? 'r' : 'l'} from-[#09090b] via-transparent to-transparent hidden lg:block`} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent lg:hidden" />
          </div>
        </header>
      );

    case 'classic':
    default:
      return (
        <header className={`${containerClasses} relative overflow-hidden`}>
          <div className="w-full h-40 md:h-56 relative shrink-0">
            <img 
              src={image} 
              alt="Capa" 
              className="w-full h-full object-cover"
              style={{ 
                objectPosition: `center ${position}%`,
                filter: `brightness(${brightness / 100})`
              }}
            />
            <div 
              className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent" 
              style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), ${theme.background})` }} 
            />
          </div>
          
          <div className="relative z-10 -mt-20 md:-mt-28 flex flex-col items-start px-6 md:px-10 w-full max-w-5xl">
            {logoUrl && isPublic ? (
              <div 
                className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 bg-white shadow-xl mb-4 shrink-0" 
                style={{ borderColor: theme.background }}
              >
                <img src={logoUrl} alt={title} className="w-full h-full object-cover" />
              </div>
            ) : !isPublic ? null : (
              <div 
                className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 flex items-center justify-center text-4xl font-black shadow-xl mb-4 shrink-0" 
                style={{ borderColor: theme.background, backgroundColor: `${theme.primary}20`, color: theme.primary }}
              >
                {title.charAt(0)}
              </div>
            )}

            {badge && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[var(--c-primary)] text-white shadow-lg">
                  {badge}
                </span>
              </div>
            )}
            {title && (
              <h1 className="text-2xl md:text-5xl font-black tracking-tight mb-3 leading-tight drop-shadow-2xl" style={{ color: theme.text }}>
                {title}
              </h1>
            )}
            
            {subtitle && (
              <p className="text-base md:text-lg opacity-80 font-medium leading-relaxed mb-6 max-w-3xl drop-shadow-lg">
                {subtitle}
              </p>
            )}
            <div className="w-full">
              {children}
            </div>
          </div>
        </header>
      );
  }
};
