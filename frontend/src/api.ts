import React, { useEffect, useState } from 'react';

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
