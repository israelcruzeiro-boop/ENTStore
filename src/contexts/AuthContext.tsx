import React, { createContext, useContext, useState } from 'react';
import { User, Company } from '../types';
import { useAppStore } from '../store/useAppStore';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  login: (identifier: string, pass: string, targetCompanyId?: string) => User | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, companies } = useAppStore();
  
  const [activeUserId, setActiveUserId] = useState<string | null>(localStorage.getItem('entstore_auth_user'));

  const user = users.find(u => u.id === activeUserId) || null;
  const company = user?.companyId ? companies.find(c => c.id === user.companyId) || null : null;

  const login = (identifier: string, pass: string, targetCompanyId?: string): User | null => {
    const cleanId = identifier.trim();
    const cleanCpf = cleanId.replace(/\D/g, '');

    const foundUser = users.find(u => {
       const matchEmail = u.email && u.email.toLowerCase() === cleanId.toLowerCase();
       const matchCpf = u.cpf && cleanCpf && u.cpf === cleanCpf;
       return (matchEmail || matchCpf) && u.password === pass;
    });
    
    if (foundUser) {
      if (foundUser.active === false) {
         return null;
      }

      // Previne que um usuário de uma empresa logue na URL de outra (Cross-tenant block)
      if (targetCompanyId && foundUser.role !== 'SUPER_ADMIN' && foundUser.companyId !== targetCompanyId) {
         return null;
      }

      if (foundUser.role !== 'SUPER_ADMIN') {
        const userCompany = companies.find(c => c.id === foundUser.companyId);
        if (!userCompany || !userCompany.active) {
          return null; 
        }
      }

      localStorage.setItem('entstore_auth_user', foundUser.id);
      setActiveUserId(foundUser.id);
      return foundUser;
    }
    return null;
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