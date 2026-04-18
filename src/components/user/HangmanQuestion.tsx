import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { Heart, Lightbulb, PartyPopper, RotateCcw } from 'lucide-react';

// ── Tipos ──────────────────────────────────────────────
export interface HangmanAnswer {
  guessedLetters: string[];
  wrongLetters: string[];
  isComplete: boolean;
  isFailed: boolean;
}

interface HangmanQuestionProps {
  configuration: {
    word: string;
    maxAttempts: number;
    hint?: string | null;
  };
  onAnswer: (answer: HangmanAnswer) => void;
  isAnswered?: boolean;
  userAnswer?: HangmanAnswer;
}

// ── Teclado QWERTY-BR ─────────────────────────────────
const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ['Ç', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Â', 'Ê', 'Ô', 'Ã', 'Õ'],
];

// ── Normalização de letras ────────────────────────────
const normalize = (char: string) =>
  char.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

// ── Forca SVG ─────────────────────────────────────────
const HANGMAN_PARTS = [
  // 1. Cabeça
  <circle key="head" cx="200" cy="80" r="20" className="hangman-part" strokeWidth="3" fill="none" />,
  // 2. Tronco
  <line key="body" x1="200" y1="100" x2="200" y2="160" className="hangman-part" strokeWidth="3" />,
  // 3. Braço esquerdo
  <line key="leftArm" x1="200" y1="120" x2="170" y2="145" className="hangman-part" strokeWidth="3" />,
  // 4. Braço direito
  <line key="rightArm" x1="200" y1="120" x2="230" y2="145" className="hangman-part" strokeWidth="3" />,
  // 5. Perna esquerda
  <line key="leftLeg" x1="200" y1="160" x2="175" y2="200" className="hangman-part" strokeWidth="3" />,
  // 6. Perna direita
  <line key="rightLeg" x1="200" y1="160" x2="225" y2="200" className="hangman-part" strokeWidth="3" />,
  // 7. Mão esquerda
  <circle key="leftHand" cx="165" cy="150" r="4" className="hangman-part" strokeWidth="2" fill="none" />,
  // 8. Mão direita
  <circle key="rightHand" cx="235" cy="150" r="4" className="hangman-part" strokeWidth="2" fill="none" />,
  // 9. Pé esquerdo
  <line key="leftFoot" x1="175" y1="200" x2="160" y2="200" className="hangman-part" strokeWidth="3" />,
  // 10. Pé direito
  <line key="rightFoot" x1="225" y1="200" x2="240" y2="200" className="hangman-part" strokeWidth="3" />,
];

// ── Confetti Particles ────────────────────────────────
function ConfettiEffect() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 1.5 + Math.random() * 2,
      size: 4 + Math.random() * 6,
      color: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
      rotation: Math.random() * 360,
    })), []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: `${p.size}px`,
            height: `${p.size * 1.5}px`,
            backgroundColor: p.color,
            borderRadius: '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(400px) rotate(720deg) scale(0.3); }
        }
        .animate-confetti-fall {
          animation: confetti-fall var(--duration, 2s) ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────
export function HangmanQuestion({
  configuration,
  onAnswer,
  isAnswered,
  userAnswer,
}: HangmanQuestionProps) {
  const { word, maxAttempts, hint } = configuration;
  const wordUpper = word.toUpperCase();
  const uniqueLetters = useMemo(
    () => [...new Set(wordUpper.replace(/\s/g, '').split(''))],
    [wordUpper]
  );

  const [guessedLetters, setGuessedLetters] = useState<string[]>(userAnswer?.guessedLetters || []);
  const [wrongLetters, setWrongLetters] = useState<string[]>(userAnswer?.wrongLetters || []);
  const [showHint, setShowHint] = useState(false);
  const [lastGuess, setLastGuess] = useState<{ letter: string; correct: boolean } | null>(null);
  const [shakeKey, setShakeKey] = useState<string | null>(null);

  // Quantas partes do boneco mostrar, escalonado pelo maxAttempts
  const partsToShow = useMemo(() => {
    if (wrongLetters.length === 0) return 0;
    const ratio = wrongLetters.length / maxAttempts;
    return Math.min(Math.ceil(ratio * HANGMAN_PARTS.length), HANGMAN_PARTS.length);
  }, [wrongLetters.length, maxAttempts]);

  const isComplete = useMemo(
    () => uniqueLetters.every((l) => guessedLetters.includes(l)),
    [uniqueLetters, guessedLetters]
  );

  const isFailed = wrongLetters.length >= maxAttempts;
  const livesRemaining = maxAttempts - wrongLetters.length;
  const isGameOver = isComplete || isFailed;

  // Reset ao mudar de pergunta
  useEffect(() => {
    setGuessedLetters(userAnswer?.guessedLetters || []);
    setWrongLetters(userAnswer?.wrongLetters || []);
    setShowHint(false);
    setLastGuess(null);
    setShakeKey(null);
  }, [configuration, userAnswer]);

  const handleGuess = useCallback(
    (letter: string) => {
      if (isAnswered || isGameOver || guessedLetters.includes(letter) || wrongLetters.includes(letter)) return;

      // Verificar se a letra está na palavra (com ou sem acento)
      const normalizedLetter = normalize(letter);
      const isInWord = wordUpper.split('').some(
        (wChar) => wChar === letter || normalize(wChar) === normalizedLetter
      );

      let newGuessed = guessedLetters;
      let newWrong = wrongLetters;

      if (isInWord) {
        // Encontrar todas as variações desta letra na palavra
        const matchingChars = wordUpper
          .split('')
          .filter((wChar) => wChar === letter || normalize(wChar) === normalizedLetter);
        newGuessed = [...new Set([...guessedLetters, letter, ...matchingChars])];
        setGuessedLetters(newGuessed);
        setLastGuess({ letter, correct: true });

        // Feedback tátil curto
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        newWrong = [...wrongLetters, letter];
        setWrongLetters(newWrong);
        setLastGuess({ letter, correct: false });
        setShakeKey(letter);
        setTimeout(() => setShakeKey(null), 500);

        // Feedback tátil longo
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      }

      // Calcular estado atualizado
      const nowComplete = uniqueLetters.every((l) => newGuessed.includes(l));
      const nowFailed = newWrong.length >= maxAttempts;

      onAnswer({
        guessedLetters: newGuessed,
        wrongLetters: newWrong,
        isComplete: nowComplete,
        isFailed: nowFailed,
      });
    },
    [isAnswered, isGameOver, guessedLetters, wrongLetters, wordUpper, uniqueLetters, maxAttempts, onAnswer]
  );

  // Teclado físico
  useEffect(() => {
    if (isAnswered || isGameOver) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]$/.test(key)) {
        handleGuess(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGuess, isAnswered, isGameOver]);

  const getKeyState = (letter: string): 'idle' | 'correct' | 'wrong' => {
    if (guessedLetters.includes(letter)) return 'correct';
    if (wrongLetters.includes(letter)) return 'wrong';
    return 'idle';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
      {/* Confetti na vitória */}
      {isComplete && <ConfettiEffect />}

      {/* ── Forca SVG ── */}
      <div className="flex justify-center">
        <div className={cn(
          "relative transition-all duration-500",
          isFailed && "animate-pulse"
        )}>
          <svg
            viewBox="0 0 300 240"
            className="w-48 h-36 sm:w-56 sm:h-40 md:w-64 md:h-48"
          >
            {/* Estrutura da forca (sempre visível) */}
            <line x1="40" y1="230" x2="120" y2="230" stroke="currentColor" strokeWidth="4" className="text-zinc-600" />
            <line x1="80" y1="230" x2="80" y2="30" stroke="currentColor" strokeWidth="3" className="text-zinc-600" />
            <line x1="80" y1="30" x2="200" y2="30" stroke="currentColor" strokeWidth="3" className="text-zinc-600" />
            <line x1="200" y1="30" x2="200" y2="60" stroke="currentColor" strokeWidth="2" className="text-zinc-500" />
            {/* Suporte diagonal */}
            <line x1="80" y1="60" x2="110" y2="30" stroke="currentColor" strokeWidth="2" className="text-zinc-700" />

            {/* Partes do boneco — reveladas progressivamente */}
            <g className={cn(
              "transition-colors duration-300",
              isFailed ? "text-red-500" : "text-orange-400"
            )} stroke="currentColor">
              {HANGMAN_PARTS.slice(0, partsToShow).map((part, idx) => (
                <g key={idx} className="animate-in fade-in zoom-in-95 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                  {part}
                </g>
              ))}
            </g>

            {/* Olhos X na derrota */}
            {isFailed && (
              <g className="text-red-500 animate-in fade-in duration-300" stroke="currentColor" strokeWidth="2">
                <line x1="191" y1="73" x2="197" y2="79" />
                <line x1="197" y1="73" x2="191" y2="79" />
                <line x1="203" y1="73" x2="209" y2="79" />
                <line x1="209" y1="73" x2="203" y2="79" />
              </g>
            )}

            {/* Sorriso na vitória */}
            {isComplete && (
              <path
                d="M 192 88 Q 200 96 208 88"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-emerald-400 animate-in fade-in duration-500"
              />
            )}
          </svg>
        </div>
      </div>

      {/* ── Vidas restantes ── */}
      <div className="flex justify-center items-center gap-1.5">
        {Array.from({ length: maxAttempts }).map((_, i) => (
          <Heart
            key={i}
            size={16}
            className={cn(
              "transition-all duration-300",
              i < livesRemaining
                ? "text-red-500 fill-red-500"
                : "text-zinc-700 fill-transparent",
              i === livesRemaining && lastGuess && !lastGuess.correct && "animate-ping"
            )}
          />
        ))}
        <span className="text-[10px] text-zinc-500 font-bold ml-2 uppercase tracking-widest">
          {livesRemaining}/{maxAttempts}
        </span>
      </div>

      {/* ── Palavra com Slots ── */}
      <div className="flex justify-center flex-wrap gap-1.5 sm:gap-2 px-2">
        {wordUpper.split('').map((char, i) => {
          const isSpace = char === ' ';
          const isRevealed = guessedLetters.includes(char) || (isFailed && !isSpace);

          if (isSpace) {
            return <div key={i} className="w-3 sm:w-4" />;
          }

          return (
            <div
              key={i}
              className={cn(
                "relative w-8 h-10 sm:w-10 sm:h-12 md:w-11 md:h-14 rounded-lg flex items-center justify-center font-black text-base sm:text-lg md:text-xl transition-all duration-500",
                isRevealed
                  ? isComplete
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 scale-105 shadow-lg shadow-emerald-500/20"
                    : isFailed && !guessedLetters.includes(char)
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-white/10 text-white border border-white/20"
                  : "bg-white/5 border-b-2 border-orange-500/60 text-transparent",
                isRevealed && "animate-in fade-in zoom-in-95 duration-300"
              )}
              style={{ animationDelay: isRevealed ? `${i * 30}ms` : undefined }}
            >
              {isRevealed ? char : '_'}
              {!isRevealed && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-orange-500/40 rounded-full" />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mensagem de Estado ── */}
      {isGameOver && (
        <div className={cn(
          "text-center py-3 px-4 rounded-xl border animate-in fade-in slide-in-from-bottom-2 duration-500",
          isComplete
            ? "bg-emerald-500/10 border-emerald-500/20"
            : "bg-red-500/10 border-red-500/20"
        )}>
          {isComplete ? (
            <div className="flex items-center justify-center gap-2">
              <PartyPopper className="text-emerald-400" size={20} />
              <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">
                Parabéns! Você acertou!
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-red-400 font-black text-sm uppercase tracking-widest">
                Enforcado!
              </p>
              <p className="text-zinc-400 text-xs">
                A palavra era: <span className="text-white font-bold">{wordUpper}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Dica ── */}
      {hint && !isGameOver && (
        <div className="flex justify-center">
          {showHint ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-amber-400 text-xs font-medium flex items-center gap-2">
                <Lightbulb size={14} className="fill-amber-400" />
                {hint}
              </p>
            </div>
          ) : (
            <button
              onClick={() => setShowHint(true)}
              className="text-[10px] font-bold text-zinc-500 hover:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all"
            >
              <Lightbulb size={12} />
              Ver Dica
            </button>
          )}
        </div>
      )}

      {/* ── Teclado Virtual QWERTY-BR ── */}
      {!isGameOver && !isAnswered && (
        <div className="space-y-1.5 sm:space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
              {row.map((letter) => {
                const state = getKeyState(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => handleGuess(letter)}
                    disabled={state !== 'idle' || isAnswered || isGameOver}
                    className={cn(
                      "w-7 h-9 sm:w-8 sm:h-10 md:w-9 md:h-11 rounded-lg text-xs sm:text-sm font-black transition-all duration-200 border",
                      state === 'idle' && "bg-white/10 text-white border-white/10 hover:bg-white/20 hover:border-white/20 hover:scale-110 active:scale-95",
                      state === 'correct' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 scale-95 opacity-70",
                      state === 'wrong' && "bg-red-500/10 text-red-500/40 border-red-500/10 scale-90 opacity-40",
                      shakeKey === letter && "animate-shake",
                      rowIdx === 3 && "text-[10px] sm:text-xs"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Teclado desabilitado pós-game ── */}
      {(isGameOver || isAnswered) && (
        <div className="space-y-1.5 sm:space-y-2 opacity-30 pointer-events-none">
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
              {row.map((letter) => {
                const state = getKeyState(letter);
                return (
                  <div
                    key={letter}
                    className={cn(
                      "w-7 h-9 sm:w-8 sm:h-10 md:w-9 md:h-11 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center border",
                      state === 'correct' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                      state === 'wrong' && "bg-red-500/10 text-red-500/40 border-red-500/10",
                      state === 'idle' && "bg-white/5 text-white/20 border-white/5",
                      rowIdx === 3 && "text-[10px] sm:text-xs"
                    )}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── Progresso ── */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] md:text-xs font-medium text-zinc-500">
          {isComplete
            ? `✨ Palavra completa com ${wrongLetters.length} erro${wrongLetters.length !== 1 ? 's' : ''}!`
            : isFailed
              ? `💀 ${wrongLetters.length} erros — chances esgotadas`
              : `${guessedLetters.length} letra${guessedLetters.length !== 1 ? 's' : ''} encontrada${guessedLetters.length !== 1 ? 's' : ''}`
          }
        </p>
        <div className="w-32 md:w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out rounded-full",
              isFailed ? "bg-red-500" : "bg-emerald-500"
            )}
            style={{
              width: `${(guessedLetters.filter(l => uniqueLetters.includes(l)).length / uniqueLetters.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* ── Animação de shake ── */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px) rotate(-2deg); }
          40% { transform: translateX(4px) rotate(2deg); }
          60% { transform: translateX(-3px) rotate(-1deg); }
          80% { transform: translateX(3px) rotate(1deg); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  );
}
