import React, { useState, useEffect } from 'react';
import { Entity } from './api';

type Props = {
  entity?: Entity;
  onSave: (data: Omit<Entity, 'id'>) => Promise<void>;
  onClose: () => void;
};

export default function EntityModal({ entity, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [type, setType] = useState('person');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entity) {
      setName(entity.name);
      setType(entity.type);
      setDescription(entity.description || '');
    }
  }, [entity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name.trim()) {
        setError('名前は必須です');
        setLoading(false);
        return;
      }
      await onSave({ name: name.trim(), type, description: description.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2>{entity ? 'ノードを編集' : 'ノードを追加'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>名前 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：太郎"
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>タイプ</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={styles.input}>
              <option value="person">person</option>
              <option value="organization">organization</option>
              <option value="other">other</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：太郎の友人"
              style={styles.textarea}
            />
          </div>
          {error && <div style={styles.error}>{error}</div>}
          <div style={styles.buttonGroup}>
            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? '保存中...' : '保存'}
            </button>
            <button type="button" onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
          </div>
        </form>
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
  modal: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '400px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box' as const,
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
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#4DA1FF',
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
