import { User, Repository, Course, OrgUnit, OrgTopLevel, Checklist } from '../types';

/**
 * Interface genérica para objetos que possuem regras de acesso.
 * Compatível com Repository, Course e Checklist.
 */
interface AccessControlled {
  access_type?: 'ALL' | 'RESTRICTED';
  allowed_user_ids?: string[];
  allowed_region_ids?: string[];
  allowed_store_ids?: string[];
  excluded_user_ids?: string[];
}

/**
 * Função auxiliar para verificar se o usuário pertence a uma hierarquia organizacional permitida.
 * Percorre a árvore de unidades e níveis macro (Regionais/Diretorias).
 */
const checkHierarchyAccess = (
  allowedRegionIds: string[] | undefined,
  userUnitId: string | undefined,
  userTopLevelId: string | undefined,
  orgUnits: OrgUnit[],
  orgTopLevels: OrgTopLevel[]
): boolean => {
  if (!allowedRegionIds || allowedRegionIds.length === 0) return false;

  // 1. Verificação direta do nível macro do usuário
  if (userTopLevelId && allowedRegionIds.includes(userTopLevelId)) return true;

  // 2. Verificação recursiva subindo pelas unidades
  if (userUnitId) {
    const unit = orgUnits.find(u => u.id === userUnitId);
    let currentParentId = unit?.parent_id;

    while (currentParentId) {
      if (allowedRegionIds.includes(currentParentId)) return true;
      const parent = orgTopLevels.find(t => t.id === currentParentId);
      currentParentId = parent?.parent_id; // Sobe mais um nível se houver hierarquia macro
    }
  }

  return false;
};

/**
 * Lógica central de validação de acesso.
 */
const validateAccess = (
  item: AccessControlled,
  user: User | null | undefined,
  orgUnits: OrgUnit[],
  orgTopLevels: OrgTopLevel[]
): boolean => {
  if (!user) return false;
  
  // Super Admins e Admins têm acesso total (dentro da sua empresa, garantido pelo RLS)
  if (user.role && user.role !== 'USER') return true;

  // 1. Acesso Público
  if (item.access_type !== 'RESTRICTED') return true;

  // 2. Prioridade Máxima: Exclusão Manual (Blacklist)
  if (item.excluded_user_ids && Array.isArray(item.excluded_user_ids) && item.excluded_user_ids.includes(user.id)) {
    return false;
  }

  // 3. Permissão Direta (Whitelist)
  if (item.allowed_user_ids && Array.isArray(item.allowed_user_ids) && item.allowed_user_ids.includes(user.id)) {
    return true;
  }

  // 4. Permissão por Unidade (Loja)
  if (user.org_unit_id && item.allowed_store_ids && Array.isArray(item.allowed_store_ids) && item.allowed_store_ids.includes(user.org_unit_id)) {
    return true;
  }

  // 5. Permissão por Nível Hierárquico (Região/Diretoria)
  return checkHierarchyAccess(
    item.allowed_region_ids,
    user.org_unit_id,
    user.org_top_level_id,
    orgUnits,
    orgTopLevels
  );
};

// --- Exports Específicos para manter compatibilidade com o código existente ---

export const checkRepoAccess = (
  repo: Repository,
  user: User | null | undefined,
  orgUnits: OrgUnit[],
  orgTopLevels: OrgTopLevel[]
): boolean => validateAccess(repo, user, orgUnits, orgTopLevels);

export const checkCourseAccess = (
  course: Course,
  user: User | null | undefined,
  orgUnits: OrgUnit[],
  orgTopLevels: OrgTopLevel[]
): boolean => validateAccess(course, user, orgUnits, orgTopLevels);

export const checkChecklistAccess = (
  checklist: Checklist,
  user: User | null | undefined,
  orgUnits: OrgUnit[],
  orgTopLevels: OrgTopLevel[]
): boolean => validateAccess(checklist, user, orgUnits, orgTopLevels);
