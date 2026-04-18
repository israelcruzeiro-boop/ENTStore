import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HelpButtonProps {
  onClick: () => void;
  isMobile?: boolean;
}

export const HelpButton = ({ onClick, isMobile = false }: HelpButtonProps) => {
  if (isMobile) {
    return (
      <button
        onClick={onClick}
        className="fixed bottom-24 right-4 z-[60] w-12 h-12 bg-[var(--c-primary)] text-white rounded-full shadow-lg flex items-center justify-center animate-bounce hover:animate-none transition-all active:scale-95 border-2 border-white/20"
        title="Ajuda"
      >
        <HelpCircle size={24} />
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="text-zinc-400 hover:text-white hover:bg-white/5"
      title="Ativar Tour Guiado"
    >
      <HelpCircle size={22} />
    </Button>
  );
};
