import type { OrgLevelConfig, OrgTopLevel } from '@/types';

export interface OrgHierarchyLevel {
  id: string;
  name: string;
  levelIndex: number;
  visualPosition: number;
  previousLevel: OrgHierarchyLevel | null;
  isLast: boolean;
}

export interface OrgHierarchyInput {
  id?: string;
  name: string;
  visualPosition?: number;
}

export interface OrgHierarchy {
  levels: OrgHierarchyLevel[];
  lastLevel: OrgHierarchyLevel | null;
}

type OrgLevelSource = string | OrgLevelConfig | OrgHierarchyInput;

function normalizeLevel(source: OrgLevelSource, index: number): OrgHierarchyInput {
  if (typeof source === 'string') {
    return {
      name: source,
      visualPosition: index + 1,
    };
  }

  return {
    id: source.id,
    name: source.name,
    visualPosition: 'visualPosition' in source ? source.visualPosition : index + 1,
  };
}

export function deriveOrgHierarchy(sources: readonly OrgLevelSource[] | null | undefined): OrgHierarchy {
  const normalized = (sources ?? [])
    .map(normalizeLevel)
    .filter((level) => level.name.trim().length > 0);

  const levels = normalized.map<OrgHierarchyLevel>((level, index, allLevels) => ({
    id: level.id ?? String(index + 1),
    name: level.name.trim(),
    levelIndex: index + 1,
    visualPosition: level.visualPosition ?? index + 1,
    previousLevel: null,
    isLast: index === allLevels.length - 1,
  }));

  levels.forEach((level, index) => {
    level.previousLevel = index > 0 ? levels[index - 1] : null;
  });

  return {
    levels,
    lastLevel: levels.length > 0 ? levels[levels.length - 1] : null,
  };
}

export function topLevelBelongsToLevel(topLevel: OrgTopLevel, level: OrgHierarchyLevel): boolean {
  if (!topLevel.level_id) {
    return level.levelIndex === 1;
  }

  return Number(topLevel.level_id) === level.levelIndex;
}

export function getTopLevelsForLevel(
  topLevels: readonly OrgTopLevel[],
  level: OrgHierarchyLevel | null | undefined,
): OrgTopLevel[] {
  if (!level) return [];
  return topLevels.filter((topLevel) => topLevelBelongsToLevel(topLevel, level));
}

export function getParentOptionsForLevel(
  topLevels: readonly OrgTopLevel[],
  level: OrgHierarchyLevel | null | undefined,
  selectedParentId?: string | null,
): OrgTopLevel[] {
  const previousLevel = level?.previousLevel ?? null;
  if (!previousLevel) return [];

  return topLevels.filter(
    (topLevel) => topLevelBelongsToLevel(topLevel, previousLevel) || topLevel.id === selectedParentId,
  );
}

export function getParentOptionsForUnit(
  topLevels: readonly OrgTopLevel[],
  lastLevel: OrgHierarchyLevel | null | undefined,
  selectedParentId?: string | null,
): OrgTopLevel[] {
  if (!lastLevel) return [];

  return topLevels.filter(
    (topLevel) => topLevelBelongsToLevel(topLevel, lastLevel) || topLevel.id === selectedParentId,
  );
}
