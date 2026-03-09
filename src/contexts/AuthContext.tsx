import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company } from '../types';
import { useAppStore } from '../store/useAppStore';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, companies } = useAppStore();
  
  const [activeUserId, setActiveUserId] = useState<string | null>(localStorage.getItem('entstore_auth_user'));

  const user = users.find(u => u.id === activeUserId) || null;
  const company = user?.companyId ? companies.find(c => c.id === user.companyId) || null : null;

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
    const foundUser = users.find(u => u.email === email && u.password === pass);
    
    if (foundUser) {
      // Bloqueia se o usuário estiver inativo
      if (foundUser.active === false) {
         return false;
      }

      if (foundUser.role !== 'SUPER_ADMIN') {
        const userCompany = companies.find(c => c.id === foundUser.companyId);
        // Bloqueia se a empresa estiver inativa
        if (!userCompany || !userCompany.active) {
          return false; 
        }
      }

      localStorage.setItem('entstore_auth_user', foundUser.id);
      setActiveUserId(foundUser.id);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('entstore_auth_user');
    setActiveUserId(null);
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