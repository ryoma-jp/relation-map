import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { fetchCurrentUser, loginUser, logoutUser, registerUser, AUTH_TOKEN_KEY } from './api';

jest.mock('./api', () => ({
  AUTH_TOKEN_KEY: 'relation-map-token',
  fetchCurrentUser: jest.fn(),
  loginUser: jest.fn(),
  registerUser: jest.fn(),
  logoutUser: jest.fn(),
}));

const sampleUser = {
  id: 1,
  username: 'tester',
  email: 'tester@example.com',
  created_at: '2024-01-01T00:00:00',
  is_active: true,
};

const sampleToken = {
  access_token: 'token-123',
  token_type: 'bearer',
  user: sampleUser,
};

const AuthConsumer = () => {
  const { user, loading, error, login, register, logout } = useAuth();
  return (
    <div>
      <div data-testid="status">{loading ? 'loading' : user ? user.username : 'none'}</div>
      <div data-testid="error">{error || ''}</div>
      <button type="button" onClick={() => login('tester', 'secret')}>login</button>
      <button type="button" onClick={() => register('tester', 'tester@example.com', 'secret')}>register</button>
      <button type="button" onClick={() => logout()}>logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    window.localStorage.clear();
    (fetchCurrentUser as jest.Mock).mockReset();
    (loginUser as jest.Mock).mockReset();
    (registerUser as jest.Mock).mockReset();
    (logoutUser as jest.Mock).mockReset();
  });

  it('loads user from stored token', async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'token-123');
    (fetchCurrentUser as jest.Mock).mockResolvedValue(sampleUser);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('tester');
    });

    expect(fetchCurrentUser).toHaveBeenCalled();
  });

  it('updates user on login', async () => {
    (loginUser as jest.Mock).mockResolvedValue(sampleToken);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'login' }));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('tester');
    });

    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBe('token-123');
  });

  it('clears user on logout', async () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'token-123');
    (fetchCurrentUser as jest.Mock).mockResolvedValue(sampleUser);
    (logoutUser as jest.Mock).mockResolvedValue({ message: 'Logged out successfully' });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('tester');
    });

    fireEvent.click(screen.getByRole('button', { name: 'logout' }));

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('none');
    });

    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });
});
