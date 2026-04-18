import type { Step } from 'react-joyride';

// ─────────────────────────────────────────────
// COURSE DETAILS — Tour para criação de cursos
// ─────────────────────────────────────────────
export const COURSE_DETAILS_STEPS: Step[] = [
  {
    target: '.tour-title-step',
    title: '1. Informações Básicas',
    content: 'Defina um título claro e uma descrição atraente. Isso ajuda os alunos a entenderem o objetivo da trilha de aprendizagem logo de cara!',
    skipBeacon: true,
  },
  {
    target: '.tour-settings-step',
    title: '2. Configurações & Acesso',
    content: 'É essencial configurar a imagem de Capa, mas aqui você também define a Nota Mínima, obrigatoriedade de reconhecimento visual, emissão de Certificado e as regras de Acesso (quem está autorizado a ver e fazer este curso).',
  },
  {
    target: '.tour-add-module-step',
    title: '3. Grade Curricular (Módulos)',
    content: 'A estrutura do curso funciona em Módulos. Crie seu primeiro módulo e, dentro dele, você deve adicionar as Aulas (Vídeo, PDF ou Áudio), além de Quizzes interativos para testar o conhecimento do aluno!',
  },
  {
    target: '.tour-publish-step',
    title: '4. Resumo e Publicação',
    content: 'Quando seu conteúdo e testes estiverem prontos, é aqui que você publica o curso. Se já estiver publicado, você verá a indicação de que a trilha está ativa e disponível.',
  },
];

// ─────────────────────────────────────────────
// CHECKLISTS — Tour para gestão de checklists
// ─────────────────────────────────────────────
export const CHECKLISTS_STEPS: Step[] = [
  {
    target: '.tour-checklist-header',
    title: '📋 Gestão de Checklists',
    content: 'Centralize suas avaliações de conformidade, qualidade e auditoria. Aqui você gerencia e cria os modelos que os usuários responderão em campo.',
    skipBeacon: true,
  },
  {
    target: '.tour-checklist-create',
    title: '➕ Criação e Importação',
    content: 'Você pode montar um checklist do zero com nosso editor ou poupar tempo operacional importando todas as perguntas rapidamente em massa via planilha de Excel.',
  },
  {
    target: '.tour-checklist-folders',
    title: '📁 Pastas de Organização',
    content: 'Se o seu negócio possui muitas rotinas, agrupe checklists em pastas temáticas, como "Auditorias de Higiene" ou "Vistorias de Fechamento".',
  },
  {
    target: '.tour-checklist-list',
    title: '📑 Lista de Checklists',
    content: 'Aqui estão todos os seus checklists. Clique em qualquer um para abrir o Editor e configurar seções, perguntas e comportamentos.',
  },
  {
    target: '.tour-checklist-history',
    title: '📊 Relatórios e Checagens',
    content: 'Nesta aba você pode visualizar, acompanhar e exportar todas as auditorias e inspeções preenchidas pelos seus usuários em tempo real.',
  },
];

// ──────────────────────────────────────────────────
// CHECKLIST BUILDER — Tour para montagem de checklist
// ──────────────────────────────────────────────────
export const CHECKLIST_BUILDER_STEPS: Step[] = [
  {
    target: '.tour-builder-header',
    title: '⚙️ Configurações e Público',
    content: 'Regule o perfil da sua auditoria: restrinja a avaliação por níveis hierárquicos, regiões estruturais ou usuários específicos autorizados a realizar a visita.',
    skipBeacon: true,
  },
  {
    target: '.tour-builder-sections',
    title: '📂 Agrupamento em Seções',
    content: 'Dividir o checklist em Seções lógicas (Ex: \'Fachada\', \'Banheiro\', \'Estoque\') ajuda o auditor a focar em uma coisa por vez na inspeção real.',
  },
  {
    target: '.tour-builder-add-question',
    title: '➕ Adicionando Perguntas + Fotos',
    content: 'Nas perguntas, além dos formatos padrões, use as **Engrenagens de Opção** da pergunta: lá você pode exigir obrigatoriamente que o auditor não avance sem anexar foto como evidência!',
  },
  {
    target: '.tour-builder-publish',
    title: '🚀 Ativação do Checklist',
    content: 'Tudo pronto? Salve e publique! O checklist ficará instantaneamente disponível no app dos auditores designados.',
  },
];

// ─────────────────────────────────────────────
// REPOSITORIES — Tour para criação de repositórios
// ─────────────────────────────────────────────
export const REPOSITORIES_STEPS: Step[] = [
  {
    target: '.tour-repo-header',
    title: '📚 Repositórios de Conteúdo',
    content: 'Esta é a central de conteúdos da sua empresa. Repositórios são como "canais" que agrupam vídeos, documentos, links e playlists.',
    skipBeacon: true,
  },
  {
    target: '.tour-repo-create',
    title: '➕ Criar Repositório',
    content: 'Crie um novo repositório escolhendo o tipo: Completo (estilo Netflix), Simples (links rápidos), Playlist de Músicas ou Playlist de Vídeos.',
  },
  {
    target: '.tour-repo-list',
    title: '📊 Gerenciar Repositórios',
    content: 'Aqui você vê todos os repositórios criados, com status, tipo de conteúdo e nível de acesso. Clique em "Abrir" para adicionar conteúdos.',
  },
];

// ─────────────────────────────────────────────
// DASHBOARD — Tour para visão geral do painel
// ─────────────────────────────────────────────
export const DASHBOARD_STEPS: Step[] = [
  {
    target: '.tour-dash-header',
    title: '🏠 Painel Administrativo',
    content: 'Bem-vindo ao centro de comando da sua empresa! Aqui você tem uma visão geral de todas as métricas e atalhos importantes.',
    skipBeacon: true,
  },
  {
    target: '.tour-dash-panels',
    title: '📊 Painéis Especializados',
    content: 'Acesse dashboards detalhados de Cursos (progresso, conclusões) e Checklists (conformidade, auditorias) com gráficos e relatórios.',
  },
  {
    target: '.tour-dash-metrics',
    title: '📈 Métricas Rápidas',
    content: 'Acompanhe os indicadores mais importantes: total de repositórios, conteúdos publicados, usuários ativos e administradores da plataforma.',
  },
];

// ─────────────────────────────────────────────
// USUÁRIOS — Tour para gestão de usuários
// ─────────────────────────────────────────────
export const USERS_STEPS: Step[] = [
  {
    target: '.tour-users-header',
    title: '👥 Gestão de Usuários',
    content: 'Neste painel você tem o controle total de todos os colaboradores e administradores cadastrados na sua empresa.',
    skipBeacon: true,
  },
  {
    target: '.tour-users-import',
    title: '📥 Importação em Massa (Excel)',
    content: 'Não adicione usuários um a um! Baixe a Planilha Modelo, preencha com Nomes, E-mails e CPFs, e envie aqui. O sistema criará todos automaticamente, sem precisar de senhas iniciais complexas!',
  },
  {
    target: '.tour-users-roles',
    title: '🛡️ Níveis de Permissão',
    content: 'Lembre-se: Usuários (que acessam pelo app e respondem treinamentos) não são Administradores. Diferencie corretamente os acessos na hora de criar ou importar.',
  },
];

// ─────────────────────────────────────────────
// ESTRUTURA — Tour para organização de regionais e lojas
// ─────────────────────────────────────────────
export const STRUCTURE_STEPS: Step[] = [
  {
    target: '.tour-structure-header',
    title: '🏢 Estrutura Organizacional',
    content: 'Este é o coração da organização da sua base. Entenda bem como dividir para enviar relatórios, cursos e checklists com precisão.',
    skipBeacon: true,
  },
  {
    target: '.tour-structure-toplevel',
    title: '🌍 Nível Superior (Regionais/Redes)',
    content: 'O Nível Superior agrupa unidades. Se você tem 10 lojas em São Paulo, "São Paulo" é o Nível Superior. Ele serve para puxar relatórios de grandes grupos de uma vez!',
  },
  {
    target: '.tour-structure-unit',
    title: '🏪 Nível Unidade (Lojas/Setores)',
    content: 'A Unidade é a ponta da linha (ex: Loja do Shopping X). É nela que os usuários estão vinculados fisicamente na vida real.',
  },
];

// ─────────────────────────────────────────────
// APARÊNCIA — Tour para personalização visual
// ─────────────────────────────────────────────
export const APPEARANCE_STEPS: Step[] = [
  {
    target: '.tour-appearance-visual',
    title: '🎨 Personalização Visual (Branding)',
    content: 'Deixe a plataforma com as cores da sua marca! Selecione rapidamente um dos nossos Temas Pré-definidos ou defina as cores exatas para o ambiente de ensino e aplicativo.',
    skipBeacon: true,
  },
  {
    target: '.tour-appearance-forms',
    title: '🌐 Página Pública (Landing Page)',
    content: 'Transforme o seu acesso em um Mini-Site. Você pode ativar a visibilidade pública para mostrar um catálogo aberto dos seus Repositórios e escolher diferentes layouts impressionantes de Landing Page.',
  },
];

// ─────────────────────────────────────────────
// CONFIGURAÇÕES — Tour para controles globais
// ─────────────────────────────────────────────
export const SETTINGS_STEPS: Step[] = [
  {
    target: '.tour-settings-header',
    title: '⚙️ Configurações Globais',
    content: 'Neste painel você controla configurações fundamentais da empresa. As alterações aqui refletem instantaneamente no painel dos alunos.',
    skipBeacon: true,
  },
  {
    target: '.tour-settings-modules',
    title: '🖼️ Capa do Painel',
    content: 'A imagem de capa é a primeira coisa que seus alunos verão ao acessar a plataforma. Escolha uma imagem de alta qualidade que represente a identidade visual da sua trilha educacional ou marca.',
  },
];

// ─────────────────────────────────────────────
// CHECKLIST CONFIGURATIONS — Tour para modal de config
// ─────────────────────────────────────────────
export const CHECKLIST_CONFIG_STEPS: Step[] = [
  {
    target: '.tour-checklist-settings-modal',
    title: '📝 Configurações Básicas do Checklist',
    content: 'Antes de construir as perguntas, definimos os metadados dessa vistoria. Use as "Pastas" para organizar centenas de checklists e facilitar a busca.',
    skipBeacon: true,
    placement: 'center',
  },
  {
    target: '.tour-checklist-settings-access',
    title: '🔐 Público & Acesso',
    content: 'Quem pode preencher esse checklist? Na aba "Público & Acesso", você pode restringir uma auditoria apenas a determinados cargos (ex: Apenas Gerentes Regionais) ou Grupos de Acesso.',
  },
];

// ─────────────────────────────────────────────
// REPOSITORY CONTENTS — Tour interno de trilhas (Completo)
// ─────────────────────────────────────────────
export const REPOSITORY_CONTENTS_STEPS: Step[] = [
  {
    target: '.tour-repo-contents-header',
    title: '📊 Engajamento Diário',
    content: 'Sempre que um usuário consumir um material aqui dentro, a plataforma contará os acessos únicos e as visualizações. Isso indica se a trilha está fazendo sucesso!',
    skipBeacon: true,
  },
  {
    target: '.tour-repo-contents-phases',
    title: '📚 Fases Lógicas',
    content: 'Trilhas robustas requerem ordem. Crie "Fases" (como Módulo 1, Semana 2, Nível Básico) para agrupar conteúdos e exigir conclusão em cadeia do seu usuário.',
  },
  {
    target: '.tour-repo-contents-add',
    title: '➕ Adicionar Material',
    content: 'Aqui a mágica acontece. Você pode plugar vídeos do YouTube (com progressão rastreada), enviar apostilas em PDF que não podem ser baixadas, ou apenas disparar links úteis.',
  },
  {
    target: '.tour-repo-contents-table',
    title: '🕹️ Controle ao Vivo',
    content: 'Precisa ocultar um vídeo porque ficou desatualizado? Basta virar a chave de Status para inativá-lo, o conteúdo some na hora para o aluno.',
  },
];

// ─────────────────────────────────────────────
// REPOSITORY CONTENTS SIMPLE — Tour interno de trilhas (Simples)
// ─────────────────────────────────────────────
export const REPOSITORY_CONTENTS_SIMPLE_STEPS: Step[] = [
  {
    target: '.tour-repo-contents-header',
    title: '📊 Painel Simples de Engajamento',
    content: 'Em Trilhas Curtas / Repositórios Simples, não temos Fases. Aqui é um aglomerado direto ao ponto. Acompanhe nesta área os engajamentos dos usuários.',
    skipBeacon: true,
  },
  {
    target: '.tour-repo-contents-add',
    title: '⚡ Importação Ultrarrápida Tabela',
    content: 'O botão de Adicionar Link aqui é especial: Você pode abrir a tela e usar o comando COLAR enviando uma cópia inteira do seu Excel ou Planilha Google contendo "Nome" e "Link" colunas!',
  },
  {
    target: '.tour-repo-contents-table',
    title: '🕹️ Controle de Visibilidade',
    content: 'Assim como na Trilha Completa, você controla em tempo real o acesso desativando ou excluindo os links através da tabela.',
  },
];
