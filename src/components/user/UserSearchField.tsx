import React from 'react';
import { Search } from 'lucide-react';

interface UserSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Campo de busca padronizado para páginas do usuário.
 */
export const UserSearchField: React.FC<UserSearchFieldProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
}) => {
  return (
    <div className="relative w-full md:w-80">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 theme-subtle-text" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="theme-control w-full border rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/50 transition-all"
      />
    </div>
  );
};
