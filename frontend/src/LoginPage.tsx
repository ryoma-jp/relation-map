import React, { useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

type Mode = 'login' | 'register';

const LoginPage: React.FC = () => {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === 'login') return username.trim() && password.trim();
    return username.trim() && email.trim() && password.trim() && passwordConfirm.trim();
  }, [mode, username, email, password, passwordConfirm]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (mode === 'register' && password !== passwordConfirm) {
      setLocalError('パスワードが一致しません。');
      return;
    }

    if (mode === 'register') {
      const normalizedUsername = username.trim();
      if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
        setLocalError('ユーザー名は3〜50文字で入力してください。');
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
        setLocalError('ユーザー名は英数字・ハイフン・アンダースコアのみ使用できます。');
        return;
      }
      if (password.trim().length < 8) {
        setLocalError('パスワードは8文字以上で入力してください。');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setLocalError('有効なメールアドレスを入力してください。');
        return;
      }
    }

    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
    } catch (err) {
      // Error state is handled by AuthContext.
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Relation Map</h1>
            <p style={styles.subtitle}>ログインして編集を開始</p>
          </div>
          <div style={styles.modeSwitch}>
            <button
              type="button"
              onClick={() => setMode('login')}
              style={mode === 'login' ? styles.modeButtonActive : styles.modeButton}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              style={mode === 'register' ? styles.modeButtonActive : styles.modeButton}
            >
              新規登録
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            ユーザー名
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              autoComplete="username"
            />
          </label>

          {mode === 'register' && (
            <label style={styles.label}>
              メールアドレス
              <input
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
          )}

          <label style={styles.label}>
            パスワード
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="********"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'register' && (
            <label style={styles.label}>
              パスワード（確認）
              <input
                style={styles.input}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                type="password"
                placeholder="********"
                autoComplete="new-password"
              />
            </label>
          )}

          {(localError || error) && (
            <div style={styles.errorBox}>{localError || error}</div>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            style={canSubmit && !loading ? styles.primaryButton : styles.primaryButtonDisabled}
          >
            {loading ? '送信中...' : mode === 'login' ? 'ログイン' : '登録して開始'}
          </button>
        </form>

        <div style={styles.helpText}>
          {mode === 'login'
            ? '未登録の方は「新規登録」から作成できます。'
            : 'ユーザー名は英数字・ハイフン・アンダースコアのみ対応。パスワードは8文字以上。'}
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7ff, #eef6ff)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    padding: '24px',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e6ecff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700' as const,
    color: '#1b2559',
  },
  subtitle: {
    margin: '6px 0 0',
    fontSize: '13px',
    color: '#5b6478',
  },
  modeSwitch: {
    display: 'flex',
    gap: '8px',
  },
  modeButton: {
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #d7defc',
    backgroundColor: '#f4f6ff',
    color: '#3b4a7a',
    fontSize: '12px',
    cursor: 'pointer',
  },
  modeButtonActive: {
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #4f6cff',
    backgroundColor: '#4f6cff',
    color: 'white',
    fontSize: '12px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    fontSize: '12px',
    color: '#5b6478',
    fontWeight: '600' as const,
  },
  input: {
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d7defc',
    fontSize: '14px',
    outline: 'none',
  },
  primaryButton: {
    marginTop: '8px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#1b5cff',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
  },
  primaryButtonDisabled: {
    marginTop: '8px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#c3c9e8',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600' as const,
  },
  errorBox: {
    backgroundColor: '#fff1f1',
    color: '#d64545',
    border: '1px solid #ffc2c2',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
  },
  helpText: {
    marginTop: '16px',
    fontSize: '12px',
    color: '#6f7892',
  },
};

export default LoginPage;
