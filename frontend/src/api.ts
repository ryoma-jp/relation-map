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

export function useEntities() {
  const [entities, setEntities] = useState<Entity[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/entities/`)
      .then(res => res.json())
      .then(setEntities);
  }, []);
  return entities;
}

export function useRelations() {
  const [relations, setRelations] = useState<Relation[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/relations/`)
      .then(res => res.json())
      .then(setRelations);
  }, []);
  return relations;
}
