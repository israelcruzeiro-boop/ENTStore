import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { MOCK_USERS, MOCK_COMPANIES } from '../data/mock';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (company && company.theme) {
      const root = document.documentElement;
      root.style.setProperty('--c-primary', company.theme.primary);
      root.style.setProperty('--c-bg', company.theme.background);
      root.style.setProperty('--c-card', company.theme.card);
      root.style.setProperty('--c-text', company.theme.text);
    } else {
      const root = document.documentElement;
      root.style.setProperty('--c-primary', '#3b82f6');
      root.style.setProperty('--c-bg', '#09090b');
      root.style.setProperty('--c-card', '#18181b');
      root.style.setProperty('--c-text', '#ffffff');
    }
  }, [company]);

  const login = (email: string, pass: string) => {
    // Validação mockada
    const foundUser = MOCK_USERS.find(u => u.email === email && u.password === pass);
    
    if (foundUser) {
      setUser(foundUser);
      if (foundUser.companyId) {
        const foundCompany = MOCK_COMPANIES.find(c => c.id === foundUser.companyId);
        setCompany(foundCompany || null);
      } else {
        setCompany(null);
      }
      return true;
    }
    return false;
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