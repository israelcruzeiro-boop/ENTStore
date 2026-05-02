import React from 'react';

interface UserSectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

/**
 * Header de seção interna da página (menor hierarquia que o PageHeader).
 */
export const UserSectionHeader: React.FC<UserSectionHeaderProps> = ({ title, action }) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="user-section-title text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
