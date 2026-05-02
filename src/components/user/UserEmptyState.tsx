import React from 'react';
import { LucideIcon } from 'lucide-react';

interface UserEmptyStateProps {
  /** Ícone Lucide exibido no centro */
  icon: LucideIcon;
  /** Título do empty state */
  title: string;
  /** Mensagem descritiva */
  message?: string;
  /** Ação opcional (ex: botão "limpar busca") */
  action?: React.ReactNode;
}

/**
 * Estado vazio padronizado para páginas do usuário.
 */
export const UserEmptyState: React.FC<UserEmptyStateProps> = ({ icon: Icon, title, message, action }) => {
  return (
    <div className="user-template-panel theme-surface-soft rounded-3xl border-2 border-dashed py-24 flex flex-col items-center justify-center text-center backdrop-blur-sm">
      <div className="w-20 h-20 bg-[var(--c-primary)]/10 rounded-full flex items-center justify-center mb-6">
        <Icon size={40} className="text-[var(--c-primary)] opacity-50" />
      </div>
      <h3 className="text-xl md:text-2xl font-bold text-[var(--c-text)]">{title}</h3>
      {message && (
        <p className="theme-muted-text max-w-xs mt-2 font-medium">{message}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
