import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportDialog } from './ImportDialog';

describe('ImportDialog', () => {
  const originalAlert = window.alert;

  beforeEach(() => {
    window.alert = jest.fn();
  });

  afterEach(() => {
    window.alert = originalAlert;
  });

  it('disables import button when no file selected', () => {
    const onImport = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(<ImportDialog onImport={onImport} onClose={onClose} />);

    const importButton = screen.getByLabelText('インポートを実行');
    expect(importButton).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it('calls onImport with selected file and mode', async () => {
    const user = userEvent.setup();
    const onImport = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    render(<ImportDialog onImport={onImport} onClose={onClose} />);

    const file = new File(['{}'], 'data.json', { type: 'application/json' });
    const input = screen.getByLabelText('JSONファイルを選択') as HTMLInputElement;

    await user.upload(input, file);
    await user.click(screen.getByLabelText('インポートを実行'));

    expect(onImport).toHaveBeenCalledWith(file, 'merge');
  });
});
