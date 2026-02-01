import React, { useState, useEffect } from 'react';
import { Relation, Entity } from './api';

type Props = {
  relation?: Relation;
  entities: Entity[];
  onSave: (data: Omit<Relation, 'id'>) => Promise<void>;
  onClose: () => void;
};

const RELATION_TYPES = ['friend', 'colleague', 'sibling', 'parent', 'mentor', 'member', 'other'];

export default function RelationModal({ relation, entities, onSave, onClose }: Props) {
  const [sourceId, setSourceId] = useState<number | ''>('');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [relationType, setRelationType] = useState('friend');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (relation) {
      setSourceId(relation.source_id);
      setTargetId(relation.target_id);
      setRelationType(relation.relation_type);
      setDescription(relation.description || '');
    }
  }, [relation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!sourceId || !targetId) {
        setError('ソースとターゲットを選択してください');
        setLoading(false);
        return;
      }
      if (sourceId === targetId) {
        setError('ソースとターゲットは異なる必要があります');
        setLoading(false);
        return;
      }
      await onSave({
        source_id: sourceId as number,
        target_id: targetId as number,
        relation_type: relationType,
        description: description.trim() || undefined,
      });
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
        <h2>{relation ? 'リレーションを編集' : 'リレーションを追加'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label>ソース (From) *</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value ? parseInt(e.target.value) : '')}
              style={styles.input}
            >
              <option value="">選択...</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>ターゲット (To) *</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value ? parseInt(e.target.value) : '')}
              style={styles.input}
            >
              <option value="">選択...</option>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>関係タイプ</label>
            <select value={relationType} onChange={(e) => setRelationType(e.target.value)} style={styles.input}>
              {RELATION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label>説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：高校時代の友人"
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
