import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Company, User, Repository, Category, Content, SimpleLink, ContentViewMetric, ContentRating, OrgTopLevel, OrgUnit } from '../types';
import { MOCK_COMPANIES, MOCK_USERS, MOCK_REPOSITORIES, MOCK_CATEGORIES, MOCK_CONTENTS, mockThemes } from '../data/mock';

// Safe UUID generator
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper Global para Validar Regras de Acesso do Repositório varrendo os múltiplos níveis hierárquicos
export const checkRepoAccess = (repo: Repository, user: User | null | undefined, orgUnits: OrgUnit[], orgTopLevels: OrgTopLevel[]): boolean => {
  if (!user) return false;
  if (user.role !== 'USER') return true; 
  if (repo.accessType !== 'RESTRICTED') return true; 
  
  // 1. Verifica exceções (bloqueado)
  if (repo.excludedUserIds?.includes(user.id)) return false; 
  
  // 2. Permissões diretas
  const hasUserPerm = repo.allowedUserIds?.includes(user.id);
  const hasUnitPerm = user.orgUnitId && repo.allowedStoreIds?.includes(user.orgUnitId);
  
  // 3. Permissão por grupo/nível (Varredura recursiva na árvore)
  let hasTopLevelPerm = false;
  if (user.orgUnitId && repo.allowedRegionIds && repo.allowedRegionIds.length > 0) {
    const unit = orgUnits.find(u => u.id === user.orgUnitId);
    let currentParent = orgTopLevels.find(t => t.id === unit?.parentId);
    
    // Sobe a árvore verificando se o repositório foi liberado para algum dos pais (Ex: Regional -> Diretoria)
    while (currentParent) {
      if (repo.allowedRegionIds.includes(currentParent.id)) {
        hasTopLevelPerm = true;
        break;
      }
      currentParent = orgTopLevels.find(t => t.id === currentParent?.parentId);
    }
  }
  
  // Fallback legado caso seja dado antigo não migrado na árvore
  if (!hasTopLevelPerm && user.orgTopLevelId && repo.allowedRegionIds?.includes(user.orgTopLevelId)) {
    hasTopLevelPerm = true;
  }
  
  return !!(hasUserPerm || hasUnitPerm || hasTopLevelPerm);
};

interface AppState {
  companies: Company[];
  users: User[];
  repositories: Repository[];
  categories: Category[];
  contents: Content[];
  simpleLinks: SimpleLink[];
  contentViews: ContentViewMetric[];
  contentRatings: ContentRating[]; 
  orgTopLevels: OrgTopLevel[];
  orgUnits: OrgUnit[];
  
  addCompany: (company: Omit<Company, 'id' | 'slug' | 'createdAt' | 'updatedAt'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  toggleCompanyStatus: (id: string) => void;
  updateCompanyTheme: (id: string, theme: any) => void;

  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;

  addRepository: (repo: Omit<Repository, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRepository: (id: string, data: Partial<Repository>) => void;
  deleteRepository: (id: string) => void;

  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (repositoryId: string, orderedIds: string[]) => void;

  addContent: (content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateContent: (id: string, data: Partial<Content>) => void;
  deleteContent: (id: string) => void;

  addSimpleLink: (link: Omit<SimpleLink, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSimpleLink: (id: string, data: Partial<SimpleLink>) => void;
  deleteSimpleLink: (id: string) => void;

  addContentView: (metric: Omit<ContentViewMetric, 'id' | 'viewedAt'>) => void;
  rateContent: (metric: Omit<ContentRating, 'id' | 'createdAt' | 'updatedAt'>) => void;

  addOrgTopLevel: (data: Omit<OrgTopLevel, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrgTopLevel: (id: string, data: Partial<OrgTopLevel>) => void;
  deleteOrgTopLevel: (id: string) => void;
  toggleOrgTopLevelStatus: (id: string) => void;

  addOrgUnit: (data: Omit<OrgUnit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateOrgUnit: (id: string, data: Partial<OrgUnit>) => void;
  deleteOrgUnit: (id: string) => void;
  toggleOrgUnitStatus: (id: string) => void;
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
      orgTopLevels: [],
      orgUnits: [],
      
      addCompany: (companyData) => set((state) => {
        const id = generateId();
        const slug = companyData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');
        
        const newCompany: Company = {
          ...companyData,
          id,
          slug,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const adminUser: User = {
          id: generateId(),
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
          orgTopLevels: state.orgTopLevels.filter(o => o.companyId !== id),
          orgUnits: state.orgUnits.filter(u => u.companyId !== id),
        };
      }),

      toggleCompanyStatus: (id) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, active: !c.active, updatedAt: new Date().toISOString() } : c)
      })),

      updateCompanyTheme: (id, theme) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, theme: { ...c.theme, ...theme }, updatedAt: new Date().toISOString() } : c)
      })),

      addUser: (userData) => set((state) => {
        let orgTopLevelId = userData.orgTopLevelId;
        if (userData.orgUnitId) {
          const unit = state.orgUnits.find(u => u.id === userData.orgUnitId);
          if (unit) orgTopLevelId = unit.parentId;
        }

        return {
          users: [...state.users, { 
            ...userData, 
            orgTopLevelId, 
            id: generateId(), 
            createdAt: new Date().toISOString(), 
            updatedAt: new Date().toISOString() 
          }]
        };
      }),

      updateUser: (id, data) => set((state) => {
        const newUsers = state.users.map(u => {
          if (u.id === id) {
            const updatedUser = { ...u, ...data, updatedAt: new Date().toISOString() };
            if ('orgUnitId' in data) {
              if (data.orgUnitId) {
                const unit = state.orgUnits.find(org => org.id === data.orgUnitId);
                updatedUser.orgTopLevelId = unit ? unit.parentId : undefined;
              } else {
                updatedUser.orgTopLevelId = undefined;
              }
            }
            return updatedUser;
          }
          return u;
        });
        return { users: newUsers };
      }),

      deleteUser: (id) => set((state) => ({ 
        users: state.users.filter(u => u.id !== id),
        contentRatings: state.contentRatings.filter(r => r.userId !== id),
      })),

      toggleUserStatus: (id) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, active: u.active === false ? true : false, updatedAt: new Date().toISOString() } : u)
      })),

      addRepository: (repoData) => set((state) => ({
        repositories: [...state.repositories, { ...repoData, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
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
        categories: [...state.categories, { ...catData, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
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
        contents: [...state.contents, { ...contentData, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
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
        simpleLinks: [...state.simpleLinks, { ...linkData, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateSimpleLink: (id, data) => set((state) => ({
        simpleLinks: state.simpleLinks.map(l => l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l)
      })),

      deleteSimpleLink: (id) => set((state) => ({ 
        simpleLinks: state.simpleLinks.filter(l => l.id !== id),
        contentViews: state.contentViews.filter(v => v.contentId !== id),
        contentRatings: state.contentRatings.filter(r => r.contentId !== id),
      })),

      addContentView: (metricData) => set((state) => {
        const user = state.users.find(u => u.id === metricData.userId);
        return {
          contentViews: [...state.contentViews, {
            ...metricData,
            orgUnitId: user?.orgUnitId,
            orgTopLevelId: user?.orgTopLevelId,
            id: generateId(),
            viewedAt: new Date().toISOString()
          }]
        };
      }),

      rateContent: (ratingData) => set((state) => {
        const user = state.users.find(u => u.id === ratingData.userId);
        const existingIndex = state.contentRatings.findIndex(r => r.userId === ratingData.userId && r.contentId === ratingData.contentId);
        
        if (existingIndex >= 0) {
          const newRatings = [...state.contentRatings];
          newRatings[existingIndex] = { 
            ...newRatings[existingIndex], 
            rating: ratingData.rating, 
            orgUnitId: user?.orgUnitId,
            orgTopLevelId: user?.orgTopLevelId,
            updatedAt: new Date().toISOString() 
          };
          return { contentRatings: newRatings };
        } else {
          return {
            contentRatings: [...state.contentRatings, {
              ...ratingData,
              orgUnitId: user?.orgUnitId,
              orgTopLevelId: user?.orgTopLevelId,
              id: generateId(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }]
          };
        }
      }),

      addOrgTopLevel: (data) => set((state) => ({
        orgTopLevels: [...state.orgTopLevels, { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateOrgTopLevel: (id, data) => set((state) => ({
        orgTopLevels: state.orgTopLevels.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
      })),

      deleteOrgTopLevel: (id) => set((state) => ({
        orgTopLevels: state.orgTopLevels.filter(o => o.id !== id),
        orgUnits: state.orgUnits.filter(u => u.parentId !== id) 
      })),

      toggleOrgTopLevelStatus: (id) => set((state) => ({
        orgTopLevels: state.orgTopLevels.map(o => o.id === id ? { ...o, active: !o.active, updatedAt: new Date().toISOString() } : o)
      })),

      addOrgUnit: (data) => set((state) => ({
        orgUnits: [...state.orgUnits, { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
      })),

      updateOrgUnit: (id, data) => set((state) => ({
        orgUnits: state.orgUnits.map(o => o.id === id ? { ...o, ...data, updatedAt: new Date().toISOString() } : o)
      })),

      deleteOrgUnit: (id) => set((state) => ({
        orgUnits: state.orgUnits.filter(o => o.id !== id)
      })),

      toggleOrgUnitStatus: (id) => set((state) => ({
        orgUnits: state.orgUnits.map(o => o.id === id ? { ...o, active: !o.active, updatedAt: new Date().toISOString() } : o)
      })),

    }),
    { name: 'entstore-storage' }
  )
);