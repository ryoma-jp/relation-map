import { useEffect, useState } from 'react';

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

// Entities API
export async function createEntity(data: Omit<Entity, 'id'>): Promise<Entity> {
  const res = await fetch(`${API_URL}/entities/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create entity: ${res.statusText}`);
  return res.json();
}

export async function updateEntity(id: number, data: Omit<Entity, 'id'>): Promise<Entity> {
  const res = await fetch(`${API_URL}/entities/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update entity: ${res.statusText}`);
  return res.json();
}

export async function deleteEntity(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/entities/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete entity: ${res.statusText}`);
}

// Relations API
export async function createRelation(data: Omit<Relation, 'id'>): Promise<Relation> {
  const res = await fetch(`${API_URL}/relations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create relation: ${res.statusText}`);
  return res.json();
}

export async function updateRelation(id: number, data: Omit<Relation, 'id'>): Promise<Relation> {
  const res = await fetch(`${API_URL}/relations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update relation: ${res.statusText}`);
  return res.json();
}

export async function deleteRelation(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/relations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete relation: ${res.statusText}`);
}

// Data management API
export async function resetAllData(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(`${API_URL}/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to reset data: ${res.statusText}`);
  return res.json();
}

export async function exportData(): Promise<Blob> {
  const response = await fetch(`${API_URL}/export`);
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
    headers: {
      'Content-Type': 'application/json',
    },
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
  const response = await fetch(`${API_URL}/entities/types/${encodeURIComponent(oldType)}?new_type=${encodeURIComponent(newType)}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to rename entity type');
  }
  return response.json();
}

export async function deleteEntityType(typeName: string): Promise<{ ok: boolean; deleted_entities: number; deleted_relations: number }> {
  const response = await fetch(`${API_URL}/entities/types/${encodeURIComponent(typeName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete entity type');
  }
  return response.json();
}

export async function fetchEntityTypes(): Promise<string[]> {
  const response = await fetch(`${API_URL}/entities/types`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch entity types');
  }
  return response.json();
}

export async function createEntityType(typeName: string): Promise<{ ok: boolean; name: string }> {
  const response = await fetch(`${API_URL}/entities/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: typeName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create entity type');
  }
  return response.json();
}

export async function deleteEntityTypeOnly(typeName: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_URL}/entities/types/${encodeURIComponent(typeName)}/only`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete entity type');
  }
  return response.json();
}

export async function renameRelationType(oldType: string, newType: string): Promise<{ ok: boolean; updated_count: number }> {
  const response = await fetch(`${API_URL}/relations/types/${encodeURIComponent(oldType)}?new_type=${encodeURIComponent(newType)}`, {
    method: 'PUT',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to rename relation type');
  }
  return response.json();
}

export async function deleteRelationType(typeName: string): Promise<{ ok: boolean; deleted_count: number }> {
  const response = await fetch(`${API_URL}/relations/types/${encodeURIComponent(typeName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete relation type');
  }
  return response.json();
}

export async function fetchRelationTypes(): Promise<string[]> {
  const response = await fetch(`${API_URL}/relations/types`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch relation types');
  }
  return response.json();
}

export async function createRelationType(typeName: string): Promise<{ ok: boolean; name: string }> {
  const response = await fetch(`${API_URL}/relations/types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: typeName }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create relation type');
  }
  return response.json();
}

export async function deleteRelationTypeOnly(typeName: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_URL}/relations/types/${encodeURIComponent(typeName)}/only`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete relation type');
  }
  return response.json();
}

// Hooks with refetch capability
export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);

  const fetchEntities = async () => {
    const res = await fetch(`${API_URL}/entities/`);
    const data = await res.json();
    setEntities(data);
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  return { entities, refetch: fetchEntities };
}

export function useRelations() {
  const [relations, setRelations] = useState<Relation[]>([]);

  const fetchRelations = async () => {
    const res = await fetch(`${API_URL}/relations/`);
    const data = await res.json();
    setRelations(data);
  };

  useEffect(() => {
    fetchRelations();
  }, []);

  return { relations, refetch: fetchRelations };
}
