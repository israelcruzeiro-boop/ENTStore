import type { Step } from 'react-joyride';

export const GENERAL_USER_TOUR: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo ao seu novo painel! Vamos fazer um tour rápido para você conhecer as principais funcionalidades.',
    placement: 'center',
  },
  {
    target: '.tour-nav-home',
    content: 'Aqui na Home você encontra um resumo das suas atividades, cursos em destaque e avisos importantes.',
    placement: 'bottom',
  },
  {
    target: '.tour-nav-cursos',
    content: 'Em Cursos, você acessa suas trilhas de aprendizado e treinamentos disponíveis.',
    placement: 'bottom',
  },
  {
    target: '.tour-nav-checklist',
    content: 'A aba de Checklists é onde você realiza suas auditorias, vistorias e verificações operacionais.',
    placement: 'bottom',
  },
  {
    target: '.tour-nav-hub',
    content: 'No Hub, você encontra repositórios, bibliotecas, vídeos e playlists liberados para o seu acesso.',
    placement: 'bottom',
  },
  {
    target: '.tour-nav-perfil',
    content: 'Por fim, aqui você pode editar seu perfil, ver suas medalhas e sair da plataforma.',
    placement: 'bottom',
  }
];

export const CHECKLIST_PLAYER_TOUR: Step[] = [
  {
    target: '.tour-checklist-header',
    content: 'Este é o seu checklist. Ele é dividido em etapas para facilitar o preenchimento.',
    placement: 'bottom',
  },
  {
    target: '.tour-checklist-question',
    content: 'Leia atentamente cada item. Algumas perguntas podem ser obrigatórias.',
    placement: 'top',
  },
  {
    target: '.tour-checklist-compliance',
    content: 'Responda com honestidade. Se um item não estiver conforme, você poderá gerar um Plano de Ação.',
    placement: 'top',
  },
  {
    target: '.tour-checklist-photo',
    content: 'Sempre que necessário (ou obrigatório), utilize este botão para anexar fotos como evidência.',
    placement: 'top',
  },
  {
    target: '.tour-checklist-navigation',
    content: 'Navegue entre as etapas e, ao final, utilize o botão de finalizar para enviar suas respostas.',
    placement: 'top',
  }
];

export const COURSE_PLAYER_TOUR: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo à sua trilha de conhecimento! Aqui você assiste aulas, lê materiais e responde perguntas para completar o curso.',
    placement: 'center',
  },
  {
    target: '.tour-course-nav',
    content: 'Acompanhe as aulas por aqui. Você precisa concluir a aula atual para liberar a próxima. Use os botões de navegação abaixo do conteúdo para avançar.',
    placement: 'bottom',
  },
  {
    target: '.tour-course-viewer',
    content: 'Assista aos vídeos ou leia os documentos aqui. O progresso é salvo automaticamente.',
    placement: 'bottom',
  },
];

export const REPOSITORY_TOUR: Step[] = [
  {
    target: 'body',
    content: 'Este é o repositório de conteúdos. Aqui você encontra documentos, links, vídeos e outros materiais compartilhados pela empresa.',
    placement: 'center',
  },
  {
    target: '.tour-repo-nav',
    content: 'Use este botão para voltar à tela inicial a qualquer momento.',
    placement: 'bottom',
  },
  {
    target: '.tour-repo-item',
    content: 'Toque ou clique em um item para visualizar o documento ou abrir o link externo. Dentro do visualizador, você também poderá baixar arquivos.',
    placement: 'bottom',
  },
];

/**
 * Mapeamento de Tours por Chave
 */
export const USER_TOURS = {
  GENERAL: GENERAL_USER_TOUR,
  CHECKLIST: CHECKLIST_PLAYER_TOUR,
  COURSE: COURSE_PLAYER_TOUR,
  REPOSITORY: REPOSITORY_TOUR
} as const;

export type TourKey = keyof typeof USER_TOURS;

/**
 * Resolve qual tour deve ser exibido baseado no pathname atual
 */
export const getTourKeyByPath = (pathname: string): TourKey => {
  if (pathname.includes('/checklists/')) return 'CHECKLIST';
  if (pathname.includes('/cursos/')) return 'COURSE';
  if (pathname.includes('/repo/')) return 'REPOSITORY';
  return 'GENERAL';
};
