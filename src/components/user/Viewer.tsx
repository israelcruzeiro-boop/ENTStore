import { useState, useEffect, useRef } from 'react';
import { Content } from '../../types';
import { ExternalLink, Maximize, Minimize, FileText, Music, Pause, Play, Volume2 } from 'lucide-react';

// Detecta se a URL é um YouTube Short
const isYouTubeShorts = (url: string): boolean => {
  return /youtube\.com\/shorts\//i.test(url) || /youtu\.be\/shorts\//i.test(url);
};

// Extrai o ID do vídeo do YouTube de qualquer formato de URL
export const extractYouTubeId = (url: string): string | null => {
  try {
    // Shorts: youtube.com/shorts/VIDEO_ID
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch?.[1]) return shortsMatch[1];

    // Watch: youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch')) {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('v');
    }

    // Embed: youtube.com/embed/VIDEO_ID
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (embedMatch?.[1]) return embedMatch[1];

    // Short URL: youtu.be/VIDEO_ID
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch?.[1]) return shortMatch[1];
  } catch (e) {
    console.error("Erro ao extrair YouTube ID", e);
  }
  return null;
};

// Converte qualquer URL de YouTube para uma URL embed
export const getYouTubeEmbedUrl = (url: string): string => {
  const id = extractYouTubeId(url);
  if (id) return `https://www.youtube.com/embed/${id}`;
  return url;
};

// Formata segundos em MM:SS
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// COMPONENTE: MusicPlayer (YouTube IFrame API com controles reais e suporte a Playlist)
// ==============================================================================
export const MusicPlayer = ({ 
  youtubeId, 
  thumbnailUrl, 
  title, 
  onEnded, 
  onNext, 
  onPrevious,
  hasPrevious,
  hasNext
}: { 
  youtubeId: string | null; 
  thumbnailUrl: string | null; 
  title: string;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(100);

  // Carrega a YouTube IFrame API e cria o player
  useEffect(() => {
    if (!youtubeId) return;

    const playerId = `yt-music-${youtubeId}`;

    const createPlayer = () => {
      if (!containerRef.current) return;

      // Cria o div alvo para o player
      const targetDiv = document.createElement('div');
      targetDiv.id = playerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(targetDiv);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(playerId, {
        videoId: youtubeId,
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 1, // Autoplay ao trocar de música na playlist
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (event: any) => {
            setDuration(event.target.getDuration());
            setIsReady(true);
            event.target.setVolume(volume);
            event.target.playVideo();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              intervalRef.current = setInterval(() => {
                if (playerRef.current?.getCurrentTime) {
                  setCurrentTime(playerRef.current.getCurrentTime());
                }
              }, 250);
            } else if (event.data === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              if (onEnded) onEnded();
            } else {
              setIsPlaying(false);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            }
            if (event.target?.getDuration) {
              const d = event.target.getDuration();
              if (d > 0) setDuration(d);
            }
          },
        },
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).YT && (window as any).YT.Player) {
      createPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
      }
    };
  }, [youtubeId]); // Re-executa quando o youtubeId muda

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTo = pct * duration;
    playerRef.current.seekTo(seekTo, true);
    setCurrentTime(seekTo);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Capa visual com efeito de disco ou profundidade */}
      <div className="relative w-full aspect-square max-w-sm mx-auto mb-8 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 group">
        <div className={`absolute inset-0 bg-gradient-to-br from-zinc-800 to-black transition-transform duration-700 ${isPlaying ? 'scale-110' : 'scale-100'}`}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music size={120} className="text-white/10" />
            </div>
          )}
        </div>
        
        {/* Glow animado */}
        <div className={`absolute inset-0 bg-[var(--c-primary)]/10 transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />

        {/* Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col items-center text-center">
          <h3 className="text-white text-2xl font-black mb-2 tracking-tight drop-shadow-lg line-clamp-2 px-4 italic">{title}</h3>
          
          <div className="flex items-end gap-1.5 h-12 mb-2">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-[var(--c-primary)] origin-bottom shadow-[0_0_10px_var(--c-primary)]"
                style={{
                  height: `${10 + Math.random() * 30}px`,
                  animationName: isPlaying ? 'musicBar' : 'none',
                  animationDuration: `${0.3 + Math.random() * 0.5}s`,
                  animationIterationCount: 'infinite',
                  animationDirection: 'alternate',
                  opacity: isPlaying ? 0.8 : 0.2,
                  transform: isPlaying ? undefined : 'scaleY(0.2)',
                  transition: 'all 0.5s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Botão Play/Pause Flutuante */}
        <button
          onClick={togglePlay}
          disabled={!isReady}
          className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-all duration-300"
        >
          <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
            {isPlaying ? (
              <Pause size={40} className="text-white" fill="currentColor" />
            ) : (
              <Play size={40} className="text-white ml-2" fill="currentColor" />
            )}
          </div>
        </button>
      </div>
      
      {/* Controles Principais */}
      <div className="w-full bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-6 shadow-2xl">
        {/* Timeline */}
        <div className="space-y-3 mb-6">
          <div 
            className="w-full h-1.5 bg-white/5 rounded-full cursor-pointer group relative"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-gradient-to-r from-[var(--c-primary)] to-white/40 rounded-full relative transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Botões de Navegação */}
        <div className="flex items-center justify-center gap-8">
          <button 
            onClick={onPrevious} 
            disabled={!hasPrevious}
            className={`transition-all duration-300 ${hasPrevious ? 'text-white hover:scale-125 active:scale-95' : 'text-zinc-800 cursor-not-allowed'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 20L9 12L19 4V20Z" fill="currentColor" />
              <path d="M5 19H7V5H5V19Z" fill="currentColor" />
            </svg>
          </button>

          <button
            onClick={togglePlay}
            disabled={!isReady}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isPlaying ? 'bg-white/5 border border-white/10 hover:bg-white/10' : 'bg-white scale-110 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-115'}`}
          >
            {isPlaying ? (
              <Pause size={32} className="text-white" fill="currentColor" />
            ) : (
              <Play size={32} className="text-black ml-1.5" fill="currentColor" />
            )}
          </button>

          <button 
            onClick={onNext} 
            disabled={!hasNext}
            className={`transition-all duration-300 ${hasNext ? 'text-white hover:scale-125 active:scale-95' : 'text-zinc-800 cursor-not-allowed'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4L15 12L5 20V4Z" fill="currentColor" />
              <path d="M19 5H17V19H19V5Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Container Oculto do Player */}
      <div ref={containerRef} className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none" style={{ position: 'fixed', left: '-9999px' }} />

      <style>{`
        @keyframes musicBar {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
};

// COMPONENTE: VideoPlayer (YouTube IFrame API com vídeo visível e suporte a Playlist de Vídeos)
// ==============================================================================
export const VideoPlayer = ({
  youtubeId,
  title,
  isShorts,
  onEnded,
  onNext,
  onPrevious,
  hasPrevious,
  hasNext
}: {
  youtubeId: string | null;
  title: string;
  isShorts?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!youtubeId) return;
    setIsReady(false);

    const playerId = `yt-video-${youtubeId}`;

    const createPlayer = () => {
      if (!containerRef.current) return;

      const targetDiv = document.createElement('div');
      targetDiv.id = playerId;
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(targetDiv);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const YT = (window as any).YT;
      playerRef.current = new YT.Player(playerId, {
        videoId: youtubeId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: () => {
            setIsReady(true);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (event: any) => {
            if (event.data === YT.PlayerState.ENDED) {
              if (onEnded) onEnded();
            }
          },
        },
      });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).YT && (window as any).YT.Player) {
      createPlayer();
    } else {
      if (!document.getElementById('yt-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
      }
    };
  }, [youtubeId]);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Container do Vídeo */}
      <div
        className={`w-full mx-auto bg-black overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative ${
          isShorts
            ? 'max-w-sm rounded-2xl'
            : 'rounded-2xl'
        }`}
        style={{ aspectRatio: isShorts ? '9/16' : '16/9' }}
      >
        <div ref={containerRef} className="w-full h-full" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="w-10 h-10 border-4 border-[var(--c-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="w-full bg-zinc-900/40 backdrop-blur-2xl rounded-2xl border border-white/5 p-4 mt-4 shadow-2xl">
        <h3 className="text-white text-lg font-black mb-3 tracking-tight line-clamp-2 text-center">{title}</h3>
        <div className="flex items-center justify-center gap-8">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className={`transition-all duration-300 ${hasPrevious ? 'text-white hover:scale-125 active:scale-95' : 'text-zinc-800 cursor-not-allowed'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 20L9 12L19 4V20Z" fill="currentColor" />
              <path d="M5 19H7V5H5V19Z" fill="currentColor" />
            </svg>
          </button>

          <button
            onClick={onNext}
            disabled={!hasNext}
            className={`transition-all duration-300 ${hasNext ? 'text-white hover:scale-125 active:scale-95' : 'text-zinc-800 cursor-not-allowed'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 4L15 12L5 20V4Z" fill="currentColor" />
              <path d="M19 5H17V19H19V5Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export const Viewer = ({ content }: { content: Content }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isFullscreen]);

  // ============================================================
  // RENDERIZADOR: MÚSICA (YouTube como áudio, com visual premium)
  // ============================================================
  if (content.type === 'MUSIC') {
    const videoUrl = content.embed_url || content.url;
    const youtubeId = extractYouTubeId(videoUrl);
    const thumbnailUrl = content.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null);

    return <MusicPlayer youtubeId={youtubeId} thumbnailUrl={thumbnailUrl} title={content.title} />;
  }


  // ============================================================
  // RENDERIZADOR: VÍDEO (com suporte a YouTube Shorts vertical)
  // ============================================================
  if (content.type === 'VIDEO') {
    const rawUrl = content.embed_url || content.url;
    const isShorts = isYouTubeShorts(rawUrl);
    let videoSrc = rawUrl;

    // Converte para embed
    try {
      const youtubeId = extractYouTubeId(rawUrl);
      if (youtubeId) {
        videoSrc = `https://www.youtube.com/embed/${youtubeId}`;
      } else if (rawUrl.includes('vimeo.com/') && !rawUrl.includes('player.vimeo.com')) {
        const videoId = rawUrl.split('vimeo.com/')[1]?.split('/')[0]?.split('?')[0];
        if (videoId) videoSrc = `https://player.vimeo.com/video/${videoId}`;
      }
    } catch (e) {
      console.error("Erro ao converter URL de vídeo", e);
    }

    // YouTube Shorts: renderiza em formato vertical 9:16
    if (isShorts) {
      return (
        <div className="flex justify-center w-full">
          <div className="w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 relative" style={{ aspectRatio: '9/16' }}>
            <iframe 
              src={videoSrc} 
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>
        </div>
      );
    }

    // Vídeo padrão: formato 16:9 widescreen
    return (
      <div className="aspect-video w-full max-w-6xl mx-auto bg-black rounded-xl overflow-hidden shadow-2xl border border-zinc-800 relative group">
        <iframe 
          src={videoSrc} 
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>
    );
  }

  // ============================================================
  // RENDERIZADOR: PDF, DOCUMENTO, LINK (formato "Navegador" vertical)
  // ============================================================
  let iframeUrl = content.url;
  
  try {
    if (iframeUrl.includes('drive.google.com/file/d/')) {
      const match = iframeUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        iframeUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }
    else if (iframeUrl.includes('docs.google.com/') && iframeUrl.includes('/d/')) {
      const match = iframeUrl.match(/(.*\/d\/[a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        iframeUrl = `${match[1]}/preview`;
      }
    }
    else if (content.type === 'DOCUMENT' && !iframeUrl.includes('google.com')) {
      iframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(content.url)}&embedded=true`;
    }
  } catch (e) {
    console.error("Erro ao formatar URL do documento", e);
  }

  return (
    <>
      {/* VISUALIZAÇÃO PADRÃO (INLINE) */}
      <div className="w-full max-w-6xl mx-auto bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 flex flex-col h-[75vh] max-h-[900px]">
        {/* Barra de Navegação Falsa / Top Bar */}
        <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex justify-between items-center w-full z-10 shrink-0">
           <div className="flex items-center gap-4 overflow-hidden">
              <div className="flex gap-1.5 shrink-0">
                 <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                 <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="text-zinc-500 text-xs font-mono truncate hidden sm:block bg-zinc-950 px-3 py-1 rounded-md border border-zinc-800 w-48 md:w-96">
                 {content.url}
              </span>
           </div>
           
           <div className="flex items-center gap-2 shrink-0">
               <button 
                 onClick={() => setIsFullscreen(true)}
                 className="text-white flex items-center gap-1.5 text-xs md:text-sm bg-[var(--c-primary)] hover:bg-opacity-80 px-4 py-1.5 rounded-md transition-colors font-bold shadow-lg"
               >
                   <Maximize size={16} /> Tela Cheia
               </button>
               <a 
                 href={content.url} 
                 target="_blank" 
                 rel="noreferrer" 
                 className="text-zinc-300 hover:text-white items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-md transition-colors hidden md:flex"
                 title="Abrir em uma nova aba caso o link bloqueie a visualização interna"
               >
                   Nova aba <ExternalLink size={14} />
               </a>
           </div>
        </div>
        
        {/* Container do Iframe Inline */}
        <div className="flex-1 w-full bg-white relative">
          <iframe 
            src={iframeUrl} 
            className="w-full h-full border-0 absolute inset-0"
            title={content.title}
            allowFullScreen
          />
        </div>
      </div>

      {/* MODAL DE TELA CHEIA (POPUP OVERLAY) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col w-screen h-screen">
           <div className="bg-zinc-900 px-4 py-3 border-b border-zinc-800 flex justify-between items-center w-full shrink-0 shadow-md">
             <div className="flex items-center gap-3">
               <div className="p-1.5 bg-[var(--c-primary)] rounded-md text-white hidden sm:block">
                  <FileText size={18} />
               </div>
               <h2 className="text-white font-semibold truncate max-w-[200px] md:max-w-md text-sm md:text-base">
                 {content.title}
               </h2>
             </div>
             <div className="flex items-center gap-2 md:gap-3">
                <a 
                  href={content.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-zinc-300 hover:text-white flex items-center gap-1.5 text-xs md:text-sm bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-md transition-colors"
                >
                    <span className="hidden sm:inline">Abrir no Navegador</span> <ExternalLink size={16} />
                </a>
                <button 
                  onClick={() => setIsFullscreen(false)}
                  className="text-white flex items-center gap-1.5 md:gap-2 text-xs md:text-sm bg-zinc-700 hover:bg-red-600 px-4 py-2 rounded-md transition-colors font-bold shadow-lg"
                >
                    <Minimize size={16} /> Fechar
                </button>
             </div>
           </div>
           
           <div className="flex-1 w-full bg-white relative">
              <iframe 
                src={iframeUrl} 
                className="w-full h-full border-0 absolute inset-0"
                title={content.title}
                allowFullScreen
              />
           </div>
        </div>
      )}
    </>
  );
};