import React from 'react';
import { Loader2 } from 'lucide-react';

interface UserPageShellProps {
  /** Show a full-page centered spinner instead of children */
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper padrão para todas as páginas do painel do usuário.
 * Define largura máxima, padding lateral e padding-top após a navbar fixa.
 */
export const UserPageShell: React.FC<UserPageShellProps> = ({ loading, className = '', children }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-[var(--c-primary)]" size={40} />
      </div>
    );
  }

  return (
    <div className={`user-page-shell max-w-[1600px] mx-auto px-4 md:px-10 pt-24 pb-12 min-h-screen space-y-8 ${className}`}>
      {children}
    </div>
  );
};
