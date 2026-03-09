import { Company, User, Repository, Category, Content } from '../types';

export const mockThemes = {
  netflix: { primary: '#E50914', secondary: '#B81D24', background: '#141414', card: '#2F2F2F', text: '#FFFFFF' },
  corporateBlue: { primary: '#2563EB', secondary: '#1D4ED8', background: '#0F172A', card: '#1E293B', text: '#F8FAFC' },
  premiumGold: { primary: '#D4AF37', secondary: '#AA8C2C', background: '#000000', card: '#1A1A1A', text: '#FFFFFF' },
};

export const MOCK_COMPANIES: Company[] = [
  { 
    id: 'c1', 
    name: 'Acme Corp', 
    slug: 'acme-corp',
    linkName: 'acme',
    active: true, 
    theme: mockThemes.netflix,
    logoUrl: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=150&h=150&fit=crop&q=80',
    createdAt: new Date('2024-01-01').toISOString()
  },
  { 
    id: 'c2', 
    name: 'TechFlow', 
    slug: 'techflow',
    linkName: 'techflow',
    active: true, 
    theme: mockThemes.corporateBlue,
    createdAt: new Date('2024-02-15').toISOString()
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'sadmin@entstore.com', password: '123456', role: 'SUPER_ADMIN' },
  { id: 'u2', name: 'Admin Company', email: 'admin@entstore.com', password: '123456', role: 'ADMIN', companyId: 'c1' },
  { id: 'u3', name: 'User Premium', email: 'user@entstore.com', password: '123456', role: 'USER', companyId: 'c1', avatarUrl: 'https://i.pravatar.cc/150?u=u3' },
];

export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 'r1', companyId: 'c1', name: 'Treinamento de Vendas 2024',
    description: 'Materiais completos para capacitação do time comercial.',
    coverImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80',
    featured: true, status: 'ACTIVE'
  },
  {
    id: 'r2', companyId: 'c1', name: 'Cultura & Onboarding',
    description: 'Bem-vindo à Acme! Tudo que você precisa saber.',
    coverImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    featured: true, status: 'ACTIVE'
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', repositoryId: 'r1', name: 'Técnicas de Fechamento' },
  { id: 'cat2', repositoryId: 'r1', name: 'Prospecção' },
];

export const MOCK_CONTENTS: Content[] = [
  {
    id: 'cnt1', repositoryId: 'r1', categoryId: 'cat1',
    title: 'A Arte de Fechar Negócios', description: 'Vídeo aula avançada sobre negociação.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
    type: 'VIDEO', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    featured: true, recent: true
  }
];