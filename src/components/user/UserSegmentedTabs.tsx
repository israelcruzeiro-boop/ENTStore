import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface UserTab<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface UserSegmentedTabsProps<T extends string = string> {
  tabs: UserTab<T>[];
  active: T;
  onChange: (value: T) => void;
}

/**
 * Tabs/filtros segmentados em pill.
 * Usa --c-primary para o tab ativo.
 */
export function UserSegmentedTabs<T extends string = string>({
  tabs,
  active,
  onChange,
}: UserSegmentedTabsProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--c-text-rgb)/0.08)] pb-6">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${
              isActive
                ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]'
                : 'user-chip theme-surface-soft hover:border-[var(--c-primary)]/30'
            }`}
          >
            {Icon && <Icon size={16} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
