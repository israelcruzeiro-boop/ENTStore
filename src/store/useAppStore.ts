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
  } catch {
    // Ignore error
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper Global para Validar Regras de Acesso do Repositório varrendo os múltiplos níveis hierárquicos
export const checkRepoAccess = (repo: Repository, user: User | null | undefined, orgUnits: OrgUnit[], orgTopLevels: OrgTopLevel[]): boolean => {
  if (!user) return false;
  if (user.role !== 'USER') return true; 
  if (repo.access_type !== 'RESTRICTED') return true; 
  
  // 1. Verifica exceções (bloqueado)
  if (repo.excluded_user_ids?.includes(user.id)) return false; 
  
  // 2. Permissões diretas
  const hasUserPerm = repo.allowed_user_ids?.includes(user.id);
  const hasUnitPerm = user.org_unit_id && repo.allowed_store_ids?.includes(user.org_unit_id);
  
  // 3. Permissão por grupo/nível (Varredura recursiva na árvore)
  let hasTopLevelPerm = false;
  if (user.org_unit_id && repo.allowed_region_ids && repo.allowed_region_ids.length > 0) {
    const unit = orgUnits.find(u => u.id === user.org_unit_id);
    let currentParent = orgTopLevels.find(t => t.id === unit?.parent_id);
    
    // Sobe a árvore verificando se o repositório foi liberado para algum dos pais (Ex: Regional -> Diretoria)
    while (currentParent) {
      if (repo.allowed_region_ids.includes(currentParent.id)) {
        hasTopLevelPerm = true;
        break;
      }
      currentParent = orgTopLevels.find(t => t.id === currentParent?.parent_id);
    }
  }
  
  // Fallback legado caso seja dado antigo não migrado na árvore
  if (!hasTopLevelPerm && user.org_top_level_id && repo.allowed_region_ids?.includes(user.org_top_level_id)) {
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
  
  addCompany: (company: Omit<Company, 'id' | 'slug' | 'created_at' | 'updated_at'>) => void;
  updateCompany: (id: string, data: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  toggleCompanyStatus: (id: string) => void;
  updateCompanyTheme: (id: string, theme: Record<string, string>) => void;

  addUser: (user: Omit<User, 'id' | 'created_at' | 'updated_at'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;

  addRepository: (repo: Omit<Repository, 'id' | 'created_at' | 'updated_at'>) => void;
  updateRepository: (id: string, data: Partial<Repository>) => void;
  deleteRepository: (id: string) => void;

  addCategory: (category: Omit<Category, 'id' | 'created_at' | 'updated_at'>) => void;
  updateCategory: (id: string, data: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (repository_id: string, orderedIds: string[]) => void;

  addContent: (content: Omit<Content, 'id' | 'created_at' | 'updated_at'>) => void;
  updateContent: (id: string, data: Partial<Content>) => void;
  deleteContent: (id: string) => void;

  addSimpleLink: (link: Omit<SimpleLink, 'id' | 'created_at' | 'updated_at'>) => void;
  updateSimpleLink: (id: string, data: Partial<SimpleLink>) => void;
  deleteSimpleLink: (id: string) => void;

  addContentView: (metric: Omit<ContentViewMetric, 'id' | 'viewed_at'>) => void;
  rateContent: (metric: Omit<ContentRating, 'id' | 'created_at' | 'updated_at'>) => void;

  addOrgTopLevel: (data: Omit<OrgTopLevel, 'id' | 'created_at' | 'updated_at'>) => void;
  updateOrgTopLevel: (id: string, data: Partial<OrgTopLevel>) => void;
  deleteOrgTopLevel: (id: string) => void;
  toggleOrgTopLevelStatus: (id: string) => void;

  addOrgUnit: (data: Omit<OrgUnit, 'id' | 'created_at' | 'updated_at'>) => void;
  updateOrgUnit: (id: string, data: Partial<OrgUnit>) => void;
  deleteOrgUnit: (id: string) => void;
  toggleOrgUnitStatus: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      companies: [],
      users: [],
      repositories: [],
      categories: [],
      contents: [],
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const adminUser: User = {
          id: generateId(),
          name: `Admin ${companyData.name}`,
          email: `admin@${slug}.com`,
          password: '123456',
          role: 'ADMIN',
          company_id: id,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return { 
          companies: [...state.companies, newCompany],
          users: [...state.users, adminUser]
        };
      }),

      updateCompany: (id, data) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
      })),

      deleteCompany: (id) => set((state) => {
        const reposToDelete = state.repositories.filter(r => r.company_id === id).map(r => r.id);
        return {
          companies: state.companies.filter(c => c.id !== id),
          users: state.users.filter(u => u.company_id !== id),
          repositories: state.repositories.filter(r => r.company_id !== id),
          categories: state.categories.filter(c => !reposToDelete.includes(c.repository_id)),
          contents: state.contents.filter(c => !reposToDelete.includes(c.repository_id)),
          simpleLinks: state.simpleLinks.filter(l => !reposToDelete.includes(l.repository_id)),
          contentViews: state.contentViews.filter(v => v.company_id !== id),
          contentRatings: state.contentRatings.filter(r => r.company_id !== id),
          orgTopLevels: state.orgTopLevels.filter(o => o.company_id !== id),
          orgUnits: state.orgUnits.filter(u => u.company_id !== id),
        };
      }),

      toggleCompanyStatus: (id) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, active: !c.active, updated_at: new Date().toISOString() } : c)
      })),

      updateCompanyTheme: (id, theme) => set((state) => ({
        companies: state.companies.map(c => c.id === id ? { ...c, theme: { ...c.theme, ...theme }, updated_at: new Date().toISOString() } : c)
      })),

      addUser: (userData) => set((state) => {
        let org_top_level_id = userData.org_top_level_id;
        if (userData.org_unit_id) {
          const unit = state.orgUnits.find(u => u.id === userData.org_unit_id);
          if (unit) org_top_level_id = unit.parent_id;
        }

        return {
          users: [...state.users, { 
            ...userData, 
            org_top_level_id, 
            id: generateId(), 
            created_at: new Date().toISOString(), 
            updated_at: new Date().toISOString() 
          }]
        };
      }),

      updateUser: (id, data) => set((state) => {
        const newUsers = state.users.map(u => {
          if (u.id === id) {
            const updatedUser = { ...u, ...data, updated_at: new Date().toISOString() };
            if ('org_unit_id' in data) {
              if (data.org_unit_id) {
                const unit = state.orgUnits.find(org => org.id === data.org_unit_id);
                updatedUser.org_top_level_id = unit ? unit.parent_id : undefined;
              } else {
                updatedUser.org_top_level_id = undefined;
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
        contentRatings: state.contentRatings.filter(r => r.user_id !== id),
      })),

      toggleUserStatus: (id) => set((state) => ({
        users: state.users.map(u => u.id === id ? { ...u, active: u.active === false ? true : false, updated_at: new Date().toISOString() } : u)
      })),

      addRepository: (repoData) => set((state) => ({
        repositories: [...state.repositories, { ...repoData, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateRepository: (id, data) => set((state) => ({
        repositories: state.repositories.map(r => r.id === id ? { ...r, ...data, updated_at: new Date().toISOString() } : r)
      })),

      deleteRepository: (id) => set((state) => ({
        repositories: state.repositories.filter(r => r.id !== id),
        categories: state.categories.filter(c => c.repository_id !== id),
        contents: state.contents.filter(c => c.repository_id !== id),
        simpleLinks: state.simpleLinks.filter(l => l.repository_id !== id),
        contentViews: state.contentViews.filter(v => v.repository_id !== id),
        contentRatings: state.contentRatings.filter(r => r.repository_id !== id),
      })),

      addCategory: (catData) => set((state) => ({
        categories: [...state.categories, { ...catData, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateCategory: (id, data) => set((state) => ({
        categories: state.categories.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
      })),

      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id),
        contents: state.contents.map(c => c.category_id === id ? { ...c, category_id: undefined } : c)
      })),

      reorderCategories: (repository_id, orderedIds) => set((state) => {
         const newCategories = state.categories.map(c => {
            if (c.repository_id === repository_id) {
               const index = orderedIds.indexOf(c.id);
               return { ...c, order_index: index >= 0 ? index : c.order_index };
            }
            return c;
         });
         return { categories: newCategories };
      }),

      addContent: (contentData) => set((state) => ({
        contents: [...state.contents, { ...contentData, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateContent: (id, data) => set((state) => ({
        contents: state.contents.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
      })),

      deleteContent: (id) => set((state) => ({ 
        contents: state.contents.filter(c => c.id !== id),
        contentViews: state.contentViews.filter(v => v.content_id !== id),
        contentRatings: state.contentRatings.filter(r => r.content_id !== id),
      })),

      addSimpleLink: (linkData) => set((state) => ({
        simpleLinks: [...state.simpleLinks, { ...linkData, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateSimpleLink: (id, data) => set((state) => ({
        simpleLinks: state.simpleLinks.map(l => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l)
      })),

      deleteSimpleLink: (id) => set((state) => ({ 
        simpleLinks: state.simpleLinks.filter(l => l.id !== id),
        contentViews: state.contentViews.filter(v => v.content_id !== id),
        contentRatings: state.contentRatings.filter(r => r.content_id !== id),
      })),

      addContentView: (metricData) => set((state) => {
        const user = state.users.find(u => u.id === metricData.user_id);
        return {
          contentViews: [...state.contentViews, {
            ...metricData,
            org_unit_id: user?.org_unit_id,
            org_top_level_id: user?.org_top_level_id,
            id: generateId(),
            viewed_at: new Date().toISOString()
          }]
        };
      }),

      rateContent: (ratingData) => set((state) => {
        const user = state.users.find(u => u.id === ratingData.user_id);
        const existingIndex = state.contentRatings.findIndex(r => r.user_id === ratingData.user_id && r.content_id === ratingData.content_id);
        
        if (existingIndex >= 0) {
          const newRatings = [...state.contentRatings];
          newRatings[existingIndex] = { 
            ...newRatings[existingIndex], 
            rating: ratingData.rating, 
            org_unit_id: user?.org_unit_id,
            org_top_level_id: user?.org_top_level_id,
            updated_at: new Date().toISOString() 
          };
          return { contentRatings: newRatings };
        } else {
          return {
            contentRatings: [...state.contentRatings, {
              ...ratingData,
              org_unit_id: user?.org_unit_id,
              org_top_level_id: user?.org_top_level_id,
              id: generateId(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }]
          };
        }
      }),

      addOrgTopLevel: (data) => set((state) => ({
        orgTopLevels: [...state.orgTopLevels, { ...data, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateOrgTopLevel: (id, data) => set((state) => ({
        orgTopLevels: state.orgTopLevels.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o)
      })),

      deleteOrgTopLevel: (id) => set((state) => ({
        orgTopLevels: state.orgTopLevels.filter(o => o.id !== id),
        orgUnits: state.orgUnits.filter(u => u.parent_id !== id) 
      })),

      toggleOrgTopLevelStatus: (id) => set((state) => ({
        orgTopLevels: state.orgTopLevels.map(o => o.id === id ? { ...o, active: !o.active, updated_at: new Date().toISOString() } : o)
      })),

      addOrgUnit: (data) => set((state) => ({
        orgUnits: [...state.orgUnits, { ...data, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]
      })),

      updateOrgUnit: (id, data) => set((state) => ({
        orgUnits: state.orgUnits.map(o => o.id === id ? { ...o, ...data, updated_at: new Date().toISOString() } : o)
      })),

      deleteOrgUnit: (id) => set((state) => ({
        orgUnits: state.orgUnits.filter(o => o.id !== id)
      })),

      toggleOrgUnitStatus: (id) => set((state) => ({
        orgUnits: state.orgUnits.map(o => o.id === id ? { ...o, active: !o.active, updated_at: new Date().toISOString() } : o)
      })),

    }),
    { name: 'entstore-storage' }
  )
);