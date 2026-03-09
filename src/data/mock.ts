import { Company, User, Repository, Category, Content } from '../types';

export const mockThemes = {
  netflix: { primary: '#E50914', secondary: '#B81D24', background: '#141414', card: '#2F2F2F', text: '#FFFFFF' },
  corporateBlue: { primary: '#2563EB', secondary: '#1D4ED8', background: '#0F172A', card: '#1E293B', text: '#F8FAFC' },
  premiumGold: { primary: '#D4AF37', secondary: '#AA8C2C', background: '#000000', card: '#1A1A1A', text: '#FFFFFF' },
};

export const MOCK_COMPANIES: Company[] = [
  { id: 'c1', name: 'Acme Corp', active: true, theme: mockThemes.netflix },
  { id: 'c2', name: 'TechFlow', active: true, theme: mockThemes.corporateBlue },
];

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Super Chefe', email: 'super@store.com', role: 'SUPER_ADMIN' },
  { id: 'u2', name: 'Admin Acme', email: 'admin@acme.com', role: 'ADMIN', companyId: 'c1' },
  { id: 'u3', name: 'User Acme', email: 'user@acme.com', role: 'USER', companyId: 'c1', avatarUrl: 'https://i.pravatar.cc/150?u=u3' },
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
  },
  {
    id: 'r3', companyId: 'c1', name: 'Manuais Técnicos',
    description: 'Documentação profunda dos nossos produtos.',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80',
    featured: false, status: 'ACTIVE'
  }
];

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat1', repositoryId: 'r1', name: 'Técnicas de Fechamento' },
  { id: 'cat2', repositoryId: 'r1', name: 'Prospecção' },
  { id: 'cat3', repositoryId: 'r2', name: 'Primeira Semana' },
];

export const MOCK_CONTENTS: Content[] = [
  {
    id: 'cnt1', repositoryId: 'r1', categoryId: 'cat1',
    title: 'A Arte de Fechar Negócios', description: 'Vídeo aula avançada sobre negociação.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=600&q=80',
    type: 'VIDEO', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    featured: true, recent: true
  },
  {
    id: 'cnt2', repositoryId: 'r1', categoryId: 'cat2',
    title: 'Script de Prospecção Outbound', description: 'PDF com os melhores scripts.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80',
    type: 'PDF', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    featured: false, recent: true
  },
  {
    id: 'cnt3', repositoryId: 'r2', categoryId: 'cat3',
    title: 'Nossa Missão e Visão', description: 'Apresentação institucional.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
    type: 'DOCUMENT', url: 'https://docs.google.com/presentation/d/1...',
    featured: true, recent: false
  },
  {
    id: 'cnt4', repositoryId: 'r1',
    title: 'Portal de Metas', description: 'Acesso rápido ao sistema de metas.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80',
    type: 'LINK', url: 'https://google.com',
    featured: false, recent: true
  }
];