import { Repository, User, OrgTopLevel, OrgUnit } from '../types';

/**
 * Valida o acesso de um usuário a um repositório específico seguindo as regras de negócio:
 * 1. SUPER_ADMIN e ADMIN sempre têm acesso total.
 * 2. Usuários comuns (USER) respeitam o tipo de acesso (RESTRICTED ou ALL).
 * 3. Repositórios RESTRICTED validam permissão direta (ID do usuário), por unidade (loja) ou por nível macro (regional/diretoria).
 * 4. Exclusões explícitas por ID de usuário têm prioridade máxima de bloqueio.
 */
export const checkRepoAccess = (
  repo: Repository, 
  user: User | null | undefined, 
  orgUnits: OrgUnit[], 
  orgTopLevels: OrgTopLevel[]
): boolean => {
  if (!user) return false;
  if (user.role !== 'USER') return true; 
  if (repo.access_type !== 'RESTRICTED') return true; 
  
  // 1. Verifica exceções (bloqueio prioritário)
  if (repo.excluded_user_ids?.includes(user.id)) return false; 
  
  // 2. Permissões diretas por usuário
  const hasUserPerm = repo.allowed_user_ids?.includes(user.id);
  
  // 3. Permissão por unidade organizacional (Unidade/Loja)
  const hasUnitPerm = user.org_unit_id && repo.allowed_store_ids?.includes(user.org_unit_id);
  
  // 4. Permissão por nível hierárquico macro (Região/Diretoria) - Varredura recursiva na árvore
  let hasTopLevelPerm = false;
  if (user.org_unit_id && repo.allowed_region_ids && repo.allowed_region_ids.length > 0) {
    const unit = orgUnits.find(u => u.id === user.org_unit_id);
    let currentParent = orgTopLevels.find(t => t.id === unit?.parent_id);
    
    // Sobe a árvore verificando se o repositório foi liberado para algum dos pais
    while (currentParent) {
      if (repo.allowed_region_ids.includes(currentParent.id)) {
        hasTopLevelPerm = true;
        break;
      }
      currentParent = orgTopLevels.find(t => t.id === currentParent?.parent_id);
    }
  }
  
  // Fallback para dados legados ou mapeamentos diretos de nível macro
  if (!hasTopLevelPerm && user.org_top_level_id && repo.allowed_region_ids?.includes(user.org_top_level_id)) {
    hasTopLevelPerm = true;
  }
  
  return !!(hasUserPerm || hasUnitPerm || hasTopLevelPerm);
};
