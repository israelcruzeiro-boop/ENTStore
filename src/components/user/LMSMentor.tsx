import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MessageCircle, Sparkles } from 'lucide-react';

interface LMSMentorProps {
  progress: number;
  currentContentTitle?: string;
  isQuiz?: boolean;
}

export const LMSMentor: React.FC<LMSMentorProps> = ({ progress, currentContentTitle, isQuiz }) => {
  const getMessage = () => {
    if (progress === 0) return "Olá! Que bom te ver aqui. Vamos começar essa jornada hoje?";
    if (isQuiz) return "Chegamos no desafio! Preparei perguntas para testar o que vimos agora. Está pronto?";
    if (progress > 0 && progress < 30) return "Você está no ritmo certo! Os primeiros passos são os mais importantes.";
    if (progress >= 30 && progress < 60) return "Mandou bem! Já passamos de um terço do curso. Continue assim!";
    if (progress >= 60 && progress < 90) return "Reta final! Você está quase lá. Só mais um pouco de foco!";
    if (progress >= 90 && progress < 100) return "Incrível! Falta apenas o último detalhe para sua certificação.";
    if (progress === 100) return "Espetacular! Você concluiu tudo. Que tal baixar seu certificado agora?";
    
    return `Estamos agora em: ${currentContentTitle}. Vamos mergulhar nesse conteúdo?`;
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getMessage()}
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="flex items-start gap-3 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-xl"
      >
        <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
          <Sparkles size={18} className="text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-blue-400 mb-0.5 uppercase tracking-wider flex items-center gap-1.5">
            <MessageCircle size={10} /> Mentor StorePage
          </p>
          <p className="text-sm text-white/90 leading-relaxed font-medium">
            {getMessage()}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
