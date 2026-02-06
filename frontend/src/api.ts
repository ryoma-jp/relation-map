import { useEffect, useState } from 'react';

export const AUTH_TOKEN_KEY = 'relation-map-token';

export type User = {
  id: number;
  username: string;
  email: string;
  created_at: string;
  is_active: boolean;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Entity = {
  id: number;
  name: string;
  type: string;
  description?: string;
};

export type Relation = {
  id: number;
  source_id: number;
  target_id: number;
  relation_type: string;
  description?: string;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const getStoredToken = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
};

const buildAuthHeaders = (includeJson: boolean): HeadersInit | undefined => {
  const headers: Record<string, string> = {};
  if (includeJson) headers['Content-Type'] = 'application/json';
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return Object.keys(headers).length ? headers : undefined;
};

const withAuthHeaders = (options: RequestInit = {}, includeJson: boolean = false): RequestInit => {
  const headers = buildAuthHeaders(includeJson);
  if (!headers) return options;
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...headers,
    },
  };
};

// Auth API
export async function registerUser(data: { username: string; email: string; password: string }): Promise<AuthToken> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to register: ${res.statusText}`);
  return res.json();
}

export async function loginUser(data: { username: string; password: string }): Promise<AuthToken> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to login: ${res.statusText}`);
  return res.json();
}

export async function fetchCurrentUser(): Promise<User> {
  const headers = buildAuthHeaders(false);
  if (!headers) throw new Error('Not authenticated');
  const res = await fetch(`${API_URL}/auth/me`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.statusText}`);
  return res.json();
}

export async function logoutUser(): Promise<{ message: string }> {
  const headers = buildAuthHeaders(false);
  const res = headers
    ? await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers })
    : await fetch(`${API_URL}/auth/logout`, { method: 'POST' });
  if (!res.ok) throw new Error(`Failed to logout: ${res.statusText}`);
  return res.json();
}

// Entities API
export async function createEntity(data: Omit<Entity, 'id'>): Promise<Entity> {
  const res = await fetch(`${API_URL}/entities/`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create entity: ${res.statusText}`);
  return res.json();
}

export async function updateEntity(id: number, data: Omit<Entity, 'id'>): Promise<Entity> {
  const res = await fetch(`${API_URL}/entities/${id}`, {
    method: 'PUT',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update entity: ${res.statusText}`);
  return res.json();
}

export async function deleteEntity(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/entities/${id}`, withAuthHeaders({ method: 'DELETE' }));
  if (!res.ok) throw new Error(`Failed to delete entity: ${res.statusText}`);
}

// Relations API
export async function createRelation(data: Omit<Relation, 'id'>): Promise<Relation> {
  const res = await fetch(`${API_URL}/relations/`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create relation: ${res.statusText}`);
  return res.json();
}

export async function updateRelation(id: number, data: Omit<Relation, 'id'>): Promise<Relation> {
  const res = await fetch(`${API_URL}/relations/${id}`, {
    method: 'PUT',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update relation: ${res.statusText}`);
  return res.json();
}

export async function deleteRelation(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/relations/${id}`, withAuthHeaders({ method: 'DELETE' }));
  if (!res.ok) throw new Error(`Failed to delete relation: ${res.statusText}`);
}

// Data management API
export async function resetAllData(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_URL}/reset`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
  });
  if (!res.ok) throw new Error(`Failed to reset data: ${res.statusText}`);
  return res.json();
}

export async function exportData(): Promise<Blob> {
  const headers = buildAuthHeaders(false);
  const response = headers
    ? await fetch(`${API_URL}/export`, { headers })
    : await fetch(`${API_URL}/export`);
  if (!response.ok) {
    throw new Error('Export failed');
  }
  return response.blob();
}

export async function importData(
  data: any,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ ok: boolean; imported_entities: number; imported_relations: number }> {
  const response = await fetch(`${API_URL}/import?mode=${mode}`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Import failed');
  }
  
  return response.json();
}

// Type management API
export async function renameEntityType(oldType: string, newType: string): Promise<{ ok: boolean; updated_count: number }> {
  const response = await fetch(
    `${API_URL}/entities/types/${encodeURIComponent(oldType)}?new_type=${encodeURIComponent(newType)}`,
    withAuthHeaders({ method: 'PUT' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to rename entity type');
  }
  return response.json();
}

export async function deleteEntityType(typeName: string): Promise<{ ok: boolean; deleted_entities: number; deleted_relations: number }> {
  const response = await fetch(
    `${API_URL}/entities/types/${encodeURIComponent(typeName)}`,
    withAuthHeaders({ method: 'DELETE' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete entity type');
  }
  return response.json();
}

export async function fetchEntityTypes(): Promise<string[]> {
  const headers = buildAuthHeaders(false);
  const response = headers
    ? await fetch(`${API_URL}/entities/types`, { headers })
    : await fetch(`${API_URL}/entities/types`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch entity types');
  }
  return response.json();
}

export async function createEntityType(typeName: string): Promise<{ ok: boolean; name: string }> {
  const response = await fetch(`${API_URL}/entities/types`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify({ name: typeName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create entity type');
  }
  return response.json();
}

export async function deleteEntityTypeOnly(typeName: string): Promise<{ ok: boolean }> {
  const response = await fetch(
    `${API_URL}/entities/types/${encodeURIComponent(typeName)}/only`,
    withAuthHeaders({ method: 'DELETE' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete entity type');
  }
  return response.json();
}

export async function renameRelationType(oldType: string, newType: string): Promise<{ ok: boolean; updated_count: number }> {
  const response = await fetch(
    `${API_URL}/relations/types/${encodeURIComponent(oldType)}?new_type=${encodeURIComponent(newType)}`,
    withAuthHeaders({ method: 'PUT' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to rename relation type');
  }
  return response.json();
}

export async function deleteRelationType(typeName: string): Promise<{ ok: boolean; deleted_count: number }> {
  const response = await fetch(
    `${API_URL}/relations/types/${encodeURIComponent(typeName)}`,
    withAuthHeaders({ method: 'DELETE' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete relation type');
  }
  return response.json();
}

export async function fetchRelationTypes(): Promise<string[]> {
  const headers = buildAuthHeaders(false);
  const response = headers
    ? await fetch(`${API_URL}/relations/types`, { headers })
    : await fetch(`${API_URL}/relations/types`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch relation types');
  }
  return response.json();
}

export async function createRelationType(typeName: string): Promise<{ ok: boolean; name: string }> {
  const response = await fetch(`${API_URL}/relations/types`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify({ name: typeName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create relation type');
  }
  return response.json();
}

export async function deleteRelationTypeOnly(typeName: string): Promise<{ ok: boolean }> {
  const response = await fetch(
    `${API_URL}/relations/types/${encodeURIComponent(typeName)}/only`,
    withAuthHeaders({ method: 'DELETE' })
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete relation type');
  }
  return response.json();
}

// Hooks with refetch capability
export async function fetchEntitiesList(): Promise<Entity[]> {
  const headers = buildAuthHeaders(false);
  const res = headers
    ? await fetch(`${API_URL}/entities/`, { headers })
    : await fetch(`${API_URL}/entities/`);
  if (!res.ok) throw new Error(`Failed to fetch entities: ${res.statusText}`);
  return res.json();
}

export function useEntities(enabled: boolean = true) {
  const [entities, setEntities] = useState<Entity[]>([]);

  const fetchEntities = async () => {
    if (!enabled) {
      setEntities([]);
      return;
    }
    const headers = buildAuthHeaders(false);
    const res = headers
      ? await fetch(`${API_URL}/entities/`, { headers })
      : await fetch(`${API_URL}/entities/`);
    if (res.status === 401) {
      setEntities([]);
      return;
    }
    if (!res.ok) throw new Error(`Failed to fetch entities: ${res.statusText}`);
    const data = await res.json();
    setEntities(data);
  };

  useEffect(() => {
    fetchEntities();
  }, [enabled]);

  return { entities, refetch: fetchEntities };
}

export function useRelations(enabled: boolean = true) {
  const [relations, setRelations] = useState<Relation[]>([]);

  const fetchRelations = async () => {
    if (!enabled) {
      setRelations([]);
      return;
    }
    const headers = buildAuthHeaders(false);
    const res = headers
      ? await fetch(`${API_URL}/relations/`, { headers })
      : await fetch(`${API_URL}/relations/`);
    if (res.status === 401) {
      setRelations([]);
      return;
    }
    if (!res.ok) throw new Error(`Failed to fetch relations: ${res.statusText}`);
    const data = await res.json();
    setRelations(data);
  };

  useEffect(() => {
    fetchRelations();
  }, [enabled]);

  return { relations, refetch: fetchRelations };
}

// Version management API
export type VersionInfo = {
  id: number;
  version_number: number;
  created_at: string;
  description?: string;
  created_by: string;
};

export type VersionSnapshot = {
  entities: Entity[];
  relations: Relation[];
  entity_types?: { id: number; name: string }[];
  relation_types?: { id: number; name: string }[];
};

export type FullVersion = {
  id: number;
  version_number: number;
  created_at: string;
  description?: string;
  snapshot: VersionSnapshot;
  created_by: string;
};

export async function fetchVersions(): Promise<VersionInfo[]> {
  const headers = buildAuthHeaders(false);
  const res = headers
    ? await fetch(`${API_URL}/versions`, { headers })
    : await fetch(`${API_URL}/versions`);
  if (!res.ok) throw new Error(`Failed to fetch versions: ${res.statusText}`);
  return res.json();
}

export async function fetchVersion(versionId: number): Promise<FullVersion> {
  const headers = buildAuthHeaders(false);
  const res = headers
    ? await fetch(`${API_URL}/versions/${versionId}`, { headers })
    : await fetch(`${API_URL}/versions/${versionId}`);
  if (!res.ok) throw new Error(`Failed to fetch version: ${res.statusText}`);
  return res.json();
}

export async function createCheckpoint(description?: string): Promise<VersionInfo> {
  const params = new URLSearchParams();
  if (description) params.append('description', description);
  const res = await fetch(`${API_URL}/versions/create-checkpoint?${params}`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
  });
  if (!res.ok) throw new Error(`Failed to create checkpoint: ${res.statusText}`);
  return res.json();
}

export async function restoreVersion(versionId: number, createBackup: boolean = true): Promise<{ ok: boolean; message: string; new_version_id: number }> {
  const params = new URLSearchParams();
  params.append('create_backup', createBackup.toString());
  const res = await fetch(`${API_URL}/versions/${versionId}/restore?${params}`, {
    method: 'POST',
    headers: buildAuthHeaders(true),
  });
  if (!res.ok) throw new Error(`Failed to restore version: ${res.statusText}`);
  return res.json();
}

