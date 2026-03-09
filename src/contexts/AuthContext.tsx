import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { MOCK_USERS, MOCK_COMPANIES } from '../data/mock';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  // Apply theme when company changes
  useEffect(() => {
    if (company && company.theme) {
      const root = document.documentElement;
      root.style.setProperty('--c-primary', company.theme.primary);
      root.style.setProperty('--c-bg', company.theme.background);
      root.style.setProperty('--c-card', company.theme.card);
      root.style.setProperty('--c-text', company.theme.text);
    } else {
      // Default dark theme
      const root = document.documentElement;
      root.style.setProperty('--c-primary', '#3b82f6');
      root.style.setProperty('--c-bg', '#09090b');
      root.style.setProperty('--c-card', '#18181b');
      root.style.setProperty('--c-text', '#ffffff');
    }
  }, [company]);

  const login = (userId: string) => {
    const foundUser = MOCK_USERS.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      if (foundUser.companyId) {
        const foundCompany = MOCK_COMPANIES.find(c => c.id === foundUser.companyId);
        setCompany(foundCompany || null);
      } else {
        setCompany(null);
      }
    }
  };

  const logout = () => {
    setUser(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, company, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};