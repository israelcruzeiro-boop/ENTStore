import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, User, Repository, Category, Content } from '../types';
import { MOCK_COMPANIES, MOCK_USERS, MOCK_REPOSITORIES, MOCK_CATEGORIES, MOCK_CONTENTS, mockThemes } from '../data/mock';

interface AppState {
  companies: Company[];
  users: User[];
  repositories: Repository[];
  categories: Category[];
  contents: Content[];
  
  // Actions de Company
  addCompany: (company: Omit<Company, 'id' | 'slug' | 'createdAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  toggleCompanyStatus: (id: string) => void;
  updateCompanyTheme: (id: string, theme: any) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      companies: MOCK_COMPANIES,
      users: MOCK_USERS,
      repositories: MOCK_REPOSITORIES,
      categories: MOCK_CATEGORIES,
      contents: MOCK_CONTENTS,
      
      addCompany: (companyData) => set((state) => {
        const id = crypto.randomUUID();
        const slug = companyData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        
        const newCompany: Company = {
          ...companyData,
          id,
          slug,
          createdAt: new Date().toISOString()
        };

        // Cria automaticamente um admin para a nova company para que você possa testar
        const adminUser: User = {
          id: crypto.randomUUID(),
          name: `Admin ${companyData.name}`,
          email: `admin@${slug}.com`,
          password: '123456',
          role: 'ADMIN',
          companyId: id
        };

        return { 
          companies: [...state.companies, newCompany],
          users: [...state.users, adminUser]
        };
      }),

      updateCompany: (id, data) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, ...data } : c)
      })),

      toggleCompanyStatus: (id) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, active: !c.active } : c)
      })),

      updateCompanyTheme: (id, theme) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, theme: { ...c.theme, ...theme } } : c)
      }))
    }),
    {
      name: 'entstore-storage', // Nome no localStorage
    }
  )
);