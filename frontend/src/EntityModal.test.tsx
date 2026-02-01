import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntityModal from './EntityModal';

describe('EntityModal', () => {
  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <EntityModal
        existingTypes={['person']}
        onSave={onSave}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('名前は必須です')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with trimmed values', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(
      <EntityModal
        existingTypes={['person']}
        onSave={onSave}
        onClose={onClose}
      />
    );

    const nameInput = screen.getByPlaceholderText('例：太郎');
    const descInput = screen.getByPlaceholderText('例：太郎の友人');

    await user.type(nameInput, '  Bob  ');
    await user.type(descInput, '  friend  ');
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Bob',
      type: 'person',
      description: 'friend',
    });
  });
});
