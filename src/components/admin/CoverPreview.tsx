import React from 'react';

interface CoverPreviewProps {
  image?: string;
  position?: number;
  brightness?: number;
  title?: string;
  subtitle?: string;
  type?: 'hero' | 'banner';
}

export const CoverPreview: React.FC<CoverPreviewProps> = ({ 
  image, 
  position = 50, 
  brightness = 100,
  title,
  subtitle,
  type = 'hero'
}) => {
  const isHero = type === 'hero';

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-[#050505] border border-white/10 shadow-2xl ${isHero ? 'aspect-[16/6] md:aspect-[21/7]' : 'aspect-video md:aspect-[21/9]'}`}>
      
      {/* Imagem com enquadramento e brilho */}
      {image ? (
        <img 
          src={image} 
          alt="Preview" 
          className="absolute inset-0 w-full h-full object-cover transition-all duration-300"
          style={{ 
            objectPosition: `center ${position}%`,
            filter: `brightness(${brightness}%) saturate(1.1)`,
            transform: 'scale(1.02)' // Leve escala para evitar bordas brancas no movimento
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 bg-zinc-900/50">
          <span className="text-xs uppercase font-bold tracking-widest">Sem imagem selecionada</span>
        </div>
      )}

      {/* Camadas Cinemáticas (Vignette + Gradientes) */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Vignette superior e laterais */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]"></div>
        
        {/* Gradiente de profundidade para o texto */}
        <div className={`absolute inset-0 bg-gradient-to-t FROM-[#050505] via-[#050505]/30 to-transparent ${isHero ? 'opacity-90' : 'opacity-80'}`}></div>
      </div>

      {/* Conteúdo de Texto Simulado */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 flex flex-col justify-end">
        <div className="max-w-xl">
          {title && (
            <h2 className={`${isHero ? 'text-xl md:text-3xl' : 'text-lg md:text-2xl'} font-black text-white tracking-tight mb-1 drop-shadow-2xl`}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className={`${isHero ? 'text-[10px] md:text-xs' : 'text-[8px] md:text-[10px]'} text-zinc-300 font-medium leading-relaxed line-clamp-2 max-w-sm drop-shadow-lg opacity-90`}>
              {subtitle}
            </p>
          )}

          {/* Botão Simulado */}
          <div className="mt-3 md:mt-4">
             <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider">
               Prévia Visual
             </div>
          </div>
        </div>
      </div>

      {/* Label de Prévia */}
      <div className="absolute top-4 left-4 z-50">
        <span className="px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white uppercase tracking-widest">
          Modo Edição
        </span>
      </div>
    </div>
  );
};
