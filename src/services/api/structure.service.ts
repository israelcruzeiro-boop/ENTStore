import { api } from './client';
import type { ApiOrgTopLevel, ApiOrgUnit, ApiStructure } from './types';

export interface CreateTopLevelPayload {
  name: string;
  levelIndex: number;
  parentId?: string | null;
}

export interface UpdateTopLevelPayload {
  name?: string;
  levelIndex?: number;
  parentId?: string | null;
}

export interface CreateUnitPayload {
  name: string;
  code?: string | null;
  topLevelId?: string | null;
  active?: boolean;
}

export interface UpdateUnitPayload {
  name?: string;
  code?: string | null;
  topLevelId?: string | null;
  active?: boolean;
}

export const adminStructureService = {
  getStructure: () => api.get<ApiStructure>('/admin/structure'),

  listTopLevels: () => api.get<ApiOrgTopLevel[]>('/admin/structure/top-levels'),

  listUnits: () => api.get<ApiOrgUnit[]>('/admin/structure/units'),

  createTopLevel: (payload: CreateTopLevelPayload) =>
    api.post<ApiOrgTopLevel>('/admin/structure/top-levels', payload),

  updateTopLevel: (id: string, payload: UpdateTopLevelPayload) =>
    api.put<ApiOrgTopLevel>(`/admin/structure/top-levels/${id}`, payload),

  deleteTopLevel: (id: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/structure/top-levels/${id}`),

  createUnit: (payload: CreateUnitPayload) =>
    api.post<ApiOrgUnit>('/admin/structure/units', payload),

  updateUnit: (id: string, payload: UpdateUnitPayload) =>
    api.put<ApiOrgUnit>(`/admin/structure/units/${id}`, payload),

  deleteUnit: (id: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/structure/units/${id}`),
};

export const structureService = {
  getStructure: () => api.get<ApiStructure>('/structure'),

  listTopLevels: () => api.get<ApiOrgTopLevel[]>('/structure/top-levels'),

  listUnits: () => api.get<ApiOrgUnit[]>('/structure/units'),
};
