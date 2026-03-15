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
    link_name: 'acme',
    active: true, 
    theme: mockThemes.netflix,
    logo_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=150&h=150&fit=crop&q=80',
    created_at: new Date('2024-01-01').toISOString()
  },
  { 
    id: 'c2', 
    name: 'TechFlow', 
    slug: 'techflow',
    link_name: 'techflow',
    active: true, 
    theme: mockThemes.corporateBlue,
    created_at: new Date('2024-02-15').toISOString()
  },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Admin', email: 'sadmin@entstore.com', password: '123456', role: 'SUPER_ADMIN' },
  { id: 'u2', name: 'Admin Company', email: 'admin@entstore.com', password: '123456', role: 'ADMIN', company_id: 'c1' },
  { id: 'u3', name: 'User Premium', email: 'user@entstore.com', password: '123456', role: 'USER', company_id: 'c1', avatar_url: 'https://i.pravatar.cc/150?u=u3' },
];

export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 'r1', company_id: 'c1', name: 'Treinamento de Vendas 2024',
    description: 'Materiais completos para capacitação do time comercial.',
    cover_image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80',
    banner_image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1600&q=80',
    type: 'FULL', featured: true, status: 'ACTIVE', access_type: 'ALL', allowed_user_ids: []
  },
  {
    id: 'r2', company_id: 'c1', name: 'Cultura & Onboarding',
    description: 'Bem-vindo à Acme! Tudo que você precisa saber.',
    cover_image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
    type: 'FULL', featured: true, status: 'ACTIVE', access_type: 'ALL', allowed_user_ids: []
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', repository_id: 'r1', name: 'Técnicas de Fechamento' },
  { id: 'cat2', repository_id: 'r1', name: 'Prospecção' },
];

export const MOCK_CONTENTS: Content[] = [
  {
    id: 'cnt1', company_id: 'c1', repository_id: 'r1', category_id: 'cat1',
    title: 'A Arte de Fechar Negócios', description: 'Vídeo aula avançada sobre negociação.',
    thumbnail_url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
    type: 'VIDEO', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    featured: true, recent: true, status: 'ACTIVE'
  }
];