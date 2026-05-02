import React from 'react';
import { LucideIcon } from 'lucide-react';

interface UserPageHeaderProps {
  /** Ícone Lucide exibido ao lado do título */
  icon?: LucideIcon;
  /** Título principal da página */
  title: string;
  /** Subtítulo / descrição curta */
  subtitle?: string;
  /** Slot para ação ou busca alinhada à direita no desktop */
  action?: React.ReactNode;
}

/**
 * Header padrão de página: ícone + título + subtítulo (à esquerda)
 * com slot de ação/busca opcional (à direita no desktop, abaixo no mobile).
 */
export const UserPageHeader: React.FC<UserPageHeaderProps> = ({ icon: Icon, title, subtitle, action }) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {Icon && <Icon size={32} className="text-[var(--c-primary)] shrink-0 drop-shadow-md" />}
            <h1 className="user-section-title text-3xl md:text-4xl font-black tracking-tight drop-shadow-md">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="theme-muted-text text-base md:text-lg max-w-2xl font-medium leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
};
