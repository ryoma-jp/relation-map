import React from 'react';
import { render, screen } from '@testing-library/react';
import { TypeManagementDialog } from './TypeManagementDialog';
import { Entity, Relation } from './api';

describe('TypeManagementDialog', () => {
  it('renders entity types section', () => {
    const entities: Entity[] = [
      { id: 1, name: 'Alice', type: 'person' },
      { id: 2, name: 'Bob', type: 'person' },
    ];
    const relations: Relation[] = [];

    render(
      <TypeManagementDialog
        entities={entities}
        relations={relations}
        manuallyAddedEntityTypes={[]}
        manuallyAddedRelationTypes={[]}
        onClose={jest.fn()}
        onUpdate={jest.fn().mockResolvedValue(undefined)}
        onAddType={jest.fn().mockResolvedValue(undefined)}
        onRemoveType={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByText(/エンティティタイプ/)).toBeInTheDocument();
    expect(screen.getByText('person')).toBeInTheDocument();
  });
});
