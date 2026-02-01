import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RelationModal from './RelationModal';
import { Entity } from './api';

describe('RelationModal', () => {
  const entities: Entity[] = [
    { id: 1, name: 'Alice', type: 'person' },
    { id: 2, name: 'Bob', type: 'person' },
  ];

  it('shows error when source and target are the same', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <RelationModal
        entities={entities}
        existingTypes={['friend']}
        onSave={onSave}
        onClose={onClose}
      />
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    await user.selectOptions(selects[1], '1');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('ソースとターゲットは異なる必要があります')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with selected values', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <RelationModal
        entities={entities}
        existingTypes={['friend']}
        onSave={onSave}
        onClose={onClose}
      />
    );

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], '1');
    await user.selectOptions(selects[1], '2');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith({
      source_id: 1,
      target_id: 2,
      relation_type: 'friend',
      description: undefined,
    });
  });
});
