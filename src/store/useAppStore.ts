import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, User, Repository, Category, Content, SimpleLink, ContentViewMetric, ContentRating } from '../types';
import { MOCK_COMPANIES, MOCK_USERS, MOCK_REPOSITORIES, MOCK_CATEGORIES, MOCK_CONTENTS, mockThemes } from '../data/mock';

interface AppState {
  companies: Company[];
  users: User[];
  repositories: Repository[];
  categories: Category[];
  contents: Content[];
  simpleLinks: SimpleLink[];
  contentViews: ContentViewMetric[];
  contentRatings: ContentRating[]; // Novo estado para avaliações
  
  // Actions de Company
  addCompany: (company: Omit<Company, 'id' | 'slug' | 'createdAt' | 'updatedAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  toggleCompanyStatus: (id: string) => void;
  updateCompanyTheme: (id: string, theme: any) => void;

  // Actions de User
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;

  // Actions de Repositório
  addRepository: (repo: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRepository: (id: string, data: Partial<Repository>) => void;
  deleteRepository: (id: string) => void;

  // Actions de Fase (Categoria)
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (repositoryId: string, orderedIds: string[]) => void;

  // Actions de Conteúdo (Completo)
  addContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContent: (id: string, data: Partial<Content>) => void;
  deleteContent: (id: string) => void;

  // Actions de Links (Simples)
  addSimpleLink: (link: Omit<SimpleLink, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSimpleLink: (id: string, data: Partial<SimpleLink>) => void;
  deleteSimpleLink: (id: string) => void;

  // Actions de Métricas
  addContentView: (metric: Omit<ContentViewMetric, 'id' | 'viewedAt'>) => void;
  rateContent: (metric: Omit<ContentRating, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      companies: MOCK_COMPANIES,
      users: MOCK_USERS.map(u => ({ ...u, active: true, createdAt: new Date().toISOString() })),
      repositories: MOCK_REPOSITORIES.map(r => ({ ...r, type: r.type || 'FULL', createdAt: new Date().toISOString() })),
      categories: MOCK_CATEGORIES.map(c => ({ ...c, order: 0 })),
      contents: MOCK_CONTENTS.map(c => ({ ...c, createdAt: new Date().toISOString() })),
      simpleLinks: [],
      contentViews: [],
      contentRatings: [],
      
      addCompany: (companyData) => set((state) => {
        const id = crypto.randomUUID();
        const slug = companyData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        
        const newCompany: Company = {
          ...companyData,
          id,
          slug,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const adminUser: User = {
          id: crypto.randomUUID(),
          name: `Admin ${companyData.name}`,
          email: `admin@${companyData.linkName}.com`,
          password: '123456',
          role: 'ADMIN',
          companyId: id,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return { 
          companies: [...state.companies, newCompany],
          users: [...state.users, adminUser]
        };
      }),

      updateCompany: (id, data) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)
      })),

      deleteCompany: (id) => set((state) => {
        const reposToDelete = state.repositories.filter(r => r.companyId === id).map(r => r.id);
        return {
          companies: state.companies.filter(c => c.id !== id),
          users: state.users.filter(u => u.companyId !== id),
          repositories: state.repositories.filter(r => r.companyId !== id),
          categories: state.categories.filter(c => !reposToDelete.includes(c.repositoryId)),
          contents: state.contents.filter(c => !reposToDelete.includes(c.repositoryId)),
          simpleLinks: state.simpleLinks.filter(l => !reposToDelete.includes(l.repositoryId)),
          contentViews: state.contentViews.filter(v => v.companyId !== id),
          contentRatings: state.contentRatings.filter(r => r.companyId !== id),
        };
      }),

      toggleCompanyStatus: (id) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, active: !c.active, updatedAt: new Date().toISOString() } : c)
      })),

      updateCompanyTheme: (id, theme) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, theme: { ...c.theme, ...theme }, updatedAt: new Date().toISOString() } : c)
      })),

      addUser: (userData) => set((state) => ({
        users: [...state.users, { ...userData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateUser: (id, data) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u)
      })),

      deleteUser: (id) => set((state) => ({ 
        users: state.users.filter(u => u.id !== id),
        contentRatings: state.contentRatings.filter(r => r.userId !== id),
      })),

      toggleUserStatus: (id) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, active: u.active === false ? true : false, updatedAt: new Date().toISOString() } : u)
      })),

      addRepository: (repoData) => set((state) => ({
        repositories: [...state.repositories, { ...repoData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateRepository: (id, data) => set((state) => ({
        repositories: state.repositories.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date().toISOString() } : r)
      })),

      deleteRepository: (id) => set((state) => ({
        repositories: state.repositories.filter(r => r.id !== id),
        categories: state.categories.filter(c => c.repositoryId !== id),
        contents: state.contents.filter(c => c.repositoryId !== id),
        simpleLinks: state.simpleLinks.filter(l => l.repositoryId !== id),
        contentViews: state.contentViews.filter(v => v.repositoryId !== id),
        contentRatings: state.contentRatings.filter(r => r.repositoryId !== id),
      })),

      addCategory: (catData) => set((state) => ({
        categories: [...state.categories, { ...catData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateCategory: (id, data) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)
      })),

      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id),
        contents: state.contents.map(c => c.categoryId === id ? { ...c, categoryId: undefined } : c)
      })),

      reorderCategories: (repositoryId, orderedIds) => set((state) => {
         const newCategories = state.categories.map(c => {
            if (c.repositoryId === repositoryId) {
               const index = orderedIds.indexOf(c.id);
               return { ...c, order: index >= 0 ? index : c.order };
            }
            return c;
         });
         return { categories: newCategories };
      }),

      addContent: (contentData) => set((state) => ({
        contents: [...state.contents, { ...contentData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateContent: (id, data) => set((state) => ({
        contents: state.contents.map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c)
      })),

      deleteContent: (id) => set((state) => ({ 
        contents: state.contents.filter(c => c.id !== id),
        contentViews: state.contentViews.filter(v => v.contentId !== id),
        contentRatings: state.contentRatings.filter(r => r.contentId !== id),
      })),

      addSimpleLink: (linkData) => set((state) => ({
        simpleLinks: [...state.simpleLinks, { ...linkData, id: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateSimpleLink: (id, data) => set((state) => ({
        simpleLinks: state.simpleLinks.map(l => l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l)
      })),

      deleteSimpleLink: (id) => set((state) => ({ 
        simpleLinks: state.simpleLinks.filter(l => l.id !== id),
        contentViews: state.contentViews.filter(v => v.contentId !== id),
        contentRatings: state.contentRatings.filter(r => r.contentId !== id),
      })),

      addContentView: (metricData) => set((state) => ({
        contentViews: [...state.contentViews, {
          ...metricData,
          id: crypto.randomUUID(),
          viewedAt: new Date().toISOString()
        }]
      })),

      rateContent: (ratingData) => set((state) => {
        const existingIndex = state.contentRatings.findIndex(r => r.userId === ratingData.userId && r.contentId === ratingData.contentId);
        
        if (existingIndex >= 0) {
          const newRatings = [...state.contentRatings];
          newRatings[existingIndex] = { ...newRatings[existingIndex], rating: ratingData.rating, updatedAt: new Date().toISOString() };
          return { contentRatings: newRatings };
        } else {
          return {
            contentRatings: [...state.contentRatings, {
              ...ratingData,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }]
          };
        }
      })

    }),
    { name: 'entstore-storage' }
  )
);