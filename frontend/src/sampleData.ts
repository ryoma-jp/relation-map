import { Entity, Relation } from './api';

export const sampleEntities: Entity[] = [
  { id: 1, name: 'Alice', type: 'person' },
  { id: 2, name: 'Bob', type: 'person' },
  { id: 3, name: 'Carol', type: 'person' },
  { id: 4, name: 'Dave', type: 'person' },
];

export const sampleRelations: Relation[] = [
  { id: 1, source_id: 1, target_id: 2, relation_type: 'friend' },
  { id: 2, source_id: 2, target_id: 3, relation_type: 'colleague' },
  { id: 3, source_id: 1, target_id: 3, relation_type: 'sibling' },
  { id: 4, source_id: 3, target_id: 4, relation_type: 'mentor' },
];

export default { sampleEntities, sampleRelations };
