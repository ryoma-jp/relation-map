import React, { useState } from 'react';

type Props = {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
};

export default function ConfirmDialog({ title, message, onConfirm, onCancel }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await onConfirm();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.buttonGroup}>
          <button onClick={handleConfirm} disabled={loading} style={styles.confirmButton}>
            {loading ? '削除中...' : '削除'}
          </button>
          <button onClick={onCancel} disabled={loading} style={styles.cancelButton}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  error: {
    color: '#d32f2f',
    marginBottom: '16px',
    padding: '8px',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
