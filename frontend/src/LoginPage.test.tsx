import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';

const mockLogin = jest.fn();
const mockRegister = jest.fn();

jest.mock('./AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
    loading: false,
    error: null,
  }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockRegister.mockReset();
  });

  it('submits login with trimmed values', async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('username'), {
      target: { value: ' tester ' },
    });
    fireEvent.change(screen.getByPlaceholderText('********'), {
      target: { value: 'secret' },
    });

    const loginButtons = screen.getAllByRole('button', { name: 'ログイン' });
    const submitButton = loginButtons.find(
      (button) => button.getAttribute('type') === 'submit'
    );
    expect(submitButton).toBeDefined();
    fireEvent.click(submitButton!);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('tester', 'secret');
    });
  });

  it('shows register fields and validates password confirmation', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '新規登録' }));

    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('username'), {
      target: { value: 'new-user' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'you@example.com' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('********')[0], {
      target: { value: 'secret' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('********')[1], {
      target: { value: 'mismatch' },
    });

    fireEvent.click(screen.getByRole('button', { name: '登録して開始' }));

    expect(await screen.findByText('パスワードが一致しません。')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('submits register with valid values', async () => {
    render(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: '新規登録' }));

    fireEvent.change(screen.getByPlaceholderText('username'), {
      target: { value: 'new-user' },
    });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'you@example.com' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('********')[0], {
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getAllByPlaceholderText('********')[1], {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: '登録して開始' }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('new-user', 'you@example.com', 'secret123');
    });
  });
});
