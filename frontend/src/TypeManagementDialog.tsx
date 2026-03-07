import React, { useState, useMemo, useEffect } from 'react';
import { Entity, Relation, deleteEntityType, deleteRelationType, fetchEntityTypes, fetchRelationTypes } from './api';

type Props = {
  entities: Entity[];
  relations: Relation[];
  manuallyAddedEntityTypes: string[];
  manuallyAddedRelationTypes: string[];
  onClose: () => void;
  onUpdate: () => Promise<void>;
  onRenameType: (category: 'entity' | 'relation', oldType: string, newType: string) => Promise<void>;
  onAddType: (category: 'entity' | 'relation', typeName: string) => Promise<void>;
  onRemoveType: (category: 'entity' | 'relation', typeName: string) => Promise<void>;
};

type EditingState = {
  category: 'entity' | 'relation';
  oldType: string;
  newType: string;
} | null;

const replaceTypeName = (types: string[], oldType: string, newType: string): string[] => {
  const replaced = types.map(type => (type === oldType ? newType : type));
  if (!replaced.includes(newType)) {
    replaced.push(newType);
  }
  return Array.from(new Set(replaced));
};

export function TypeManagementDialog({ entities, relations, manuallyAddedEntityTypes, manuallyAddedRelationTypes, onClose, onUpdate, onRenameType, onAddType, onRemoveType }: Props) {
  const [editing, setEditing] = useState<EditingState>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ category: 'entity' | 'relation'; type: string; count: number } | null>(null);
  const [addingType, setAddingType] = useState<{ category: 'entity' | 'relation'; value: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // ダイアログ内で最新のタイプを保持
  const [localEntityTypes, setLocalEntityTypes] = useState<string[]>(manuallyAddedEntityTypes);
  const [localRelationTypes, setLocalRelationTypes] = useState<string[]>(manuallyAddedRelationTypes);

  // ダイアログが開いた時に最新のタイプを取得
  useEffect(() => {
    const loadLatestTypes = async () => {
      try {
        const [entityTypes, relationTypes] = await Promise.all([
          fetchEntityTypes(),
          fetchRelationTypes(),
        ]);
        console.log('[TypeManagementDialog] Loaded latest types:', { entityTypes, relationTypes });
        setLocalEntityTypes(entityTypes);
        setLocalRelationTypes(relationTypes);
      } catch (err) {
        console.error('[TypeManagementDialog] Failed to load types:', err);
      }
    };
    loadLatestTypes();
  }, []); // マウント時のみ実行

  // 親コンポーネント側のタイプ変更をダイアログにも反映
  useEffect(() => {
    setLocalEntityTypes(manuallyAddedEntityTypes);
  }, [manuallyAddedEntityTypes]);

  useEffect(() => {
    setLocalRelationTypes(manuallyAddedRelationTypes);
  }, [manuallyAddedRelationTypes]);

  // エンティティタイプの集計
  const entityTypeStats = useMemo(() => {
    const stats = new Map<string, number>();
    entities.forEach(e => {
      stats.set(e.type, (stats.get(e.type) || 0) + 1);
    });
    // ダイアログ内で取得した最新のタイプを使用
    localEntityTypes.forEach(type => {
      if (!stats.has(type)) {
        stats.set(type, 0);
      }
    });
    return Array.from(stats.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [entities, localEntityTypes]);

  // リレーションタイプの集計
  const relationTypeStats = useMemo(() => {
    const stats = new Map<string, number>();
    relations.forEach(r => {
      stats.set(r.relation_type, (stats.get(r.relation_type) || 0) + 1);
    });
    // ダイアログ内で取得した最新のタイプを使用
    localRelationTypes.forEach(type => {
      if (!stats.has(type)) {
        stats.set(type, 0);
      }
    });
    const result = Array.from(stats.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    console.log('[TypeManagementDialog] relationTypeStats calculated:', { 
      localRelationTypes, 
      relationsCount: relations.length, 
      result 
    });
    return result;
  }, [relations, localRelationTypes]);

  const handleAddType = async () => {
    if (!addingType || !addingType.value.trim()) {
      setError('タイプ名を入力してください');
      return;
    }

    const trimmedValue = addingType.value.trim();

    // 既存タイプと重複していないか確認
    if (addingType.category === 'entity') {
      if (entityTypeStats.some(s => s.type === trimmedValue)) {
        setError('このエンティティタイプは既に存在します');
        return;
      }
    } else {
      if (relationTypeStats.some(s => s.type === trimmedValue)) {
        setError('このリレーションタイプは既に存在します');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // 新しいタイプをDBに追加
      await onAddType(addingType.category, trimmedValue);
      setAddingType(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タイプ追加に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category: 'entity' | 'relation', oldType: string) => {
    setEditing({ category, oldType, newType: oldType });
    setError('');
  };

  const handleSaveEdit = async () => {
    if (!editing || !editing.newType.trim()) {
      setError('新しいタイプ名を入力してください');
      return;
    }

    const trimmedNewType = editing.newType.trim();

    if (trimmedNewType !== editing.oldType) {
      const duplicated = editing.category === 'entity'
        ? entityTypeStats.some(s => s.type === trimmedNewType)
        : relationTypeStats.some(s => s.type === trimmedNewType);
      if (duplicated) {
        setError('同じタイプ名が既に存在します');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await onRenameType(editing.category, editing.oldType, trimmedNewType);

      if (editing.category === 'entity') {
        setLocalEntityTypes(prev => replaceTypeName(prev, editing.oldType, trimmedNewType));
      } else {
        setLocalRelationTypes(prev => replaceTypeName(prev, editing.oldType, trimmedNewType));
      }
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'リネームに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDelete = (category: 'entity' | 'relation', type: string) => {
    const count = category === 'entity'
      ? entityTypeStats.find(s => s.type === type)?.count || 0
      : relationTypeStats.find(s => s.type === type)?.count || 0;
    
    setConfirmDelete({ category, type, count });
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    setLoading(true);
    setError('');

    try {
      // 使用数がある場合はAPIで削除（関連データも含めて削除）
      if (confirmDelete.count > 0) {
        try {
          if (confirmDelete.category === 'entity') {
            await deleteEntityType(confirmDelete.type);
          } else {
            await deleteRelationType(confirmDelete.type);
          }
          // 削除成功後にデータを更新
          await onUpdate();
          setConfirmDelete(null);
          // 削除成功後はダイアログを閉じる
          onClose();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '削除に失敗しました';
          // 404エラーの場合はサンプルデータ由来なので、ローカル状態のみ削除
          if (errorMsg.includes('not found') || errorMsg.includes('404')) {
            await onRemoveType(confirmDelete.category, confirmDelete.type);
            setConfirmDelete(null);
            // サンプルデータの削除なのでダイアログは閉じずに続行
          } else {
            setError(errorMsg);
          }
        }
      } else {
        // 使用数が0件の場合はタイプ定義のみ削除
        try {
          await onRemoveType(confirmDelete.category, confirmDelete.type);
          setConfirmDelete(null);
          // タイプのみ削除なのでダイアログは閉じずに続行
        } catch (err) {
          // 404エラーの場合は無視（既に存在しない）
          const errorMsg = err instanceof Error ? err.message : '';
          if (!errorMsg.includes('not found') && !errorMsg.includes('404')) {
            setError(err instanceof Error ? err.message : 'タイプ削除に失敗しました');
          } else {
            setConfirmDelete(null);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
          <div style={styles.header}>
            <h2 style={styles.title}>タイプ管理</h2>
            <button onClick={onClose} style={styles.closeButton} aria-label="閉じる">
              ✕
            </button>
          </div>

          <div style={styles.body}>
            {error && <div style={styles.error}>{error}</div>}

            {/* エンティティタイプ */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>エンティティタイプ ({entityTypeStats.length})</h3>
              {addingType?.category === 'entity' ? (
                <div style={styles.addTypeSection}>
                  <input
                    type="text"
                    value={addingType.value}
                    onChange={(e) => setAddingType({ ...addingType, value: e.target.value })}
                    placeholder="新しいエンティティタイプを入力"
                    style={styles.addTypeInput}
                    autoFocus
                  />
                  <button onClick={handleAddType} style={styles.addTypeButton}>追加</button>
                  <button onClick={() => setAddingType(null)} style={styles.cancelAddButton}>キャンセル</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingType({ category: 'entity', value: '' })}
                  style={styles.newTypeButton}
                >
                  ＋ 新しいタイプを追加
                </button>
              )}
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <div style={styles.colType}>タイプ名</div>
                  <div style={styles.colCount}>使用数</div>
                  <div style={styles.colActions}>操作</div>
                </div>
                {entityTypeStats.map(({ type, count }) => (
                  <div key={type} style={styles.tableRow}>
                    {editing?.category === 'entity' && editing.oldType === type ? (
                      <>
                        <div style={styles.colType}>
                          <input
                            type="text"
                            value={editing.newType}
                            onChange={(e) => setEditing({ ...editing, newType: e.target.value })}
                            style={styles.editInput}
                            autoFocus
                          />
                        </div>
                        <div style={styles.colCount}>{count}件</div>
                        <div style={styles.colActions}>
                          <button onClick={handleSaveEdit} disabled={loading} style={styles.saveButton}>
                            ✓
                          </button>
                          <button onClick={() => setEditing(null)} style={styles.cancelEditButton}>
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.colType}>{type}</div>
                        <div style={styles.colCount}>{count}件</div>
                        <div style={styles.colActions}>
                          <button onClick={() => handleStartEdit('entity', type)} style={styles.editButton} title="リネーム">
                            ✏️
                          </button>
                          <button onClick={() => handleStartDelete('entity', type)} style={styles.deleteButton} title="削除">
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* リレーションタイプ */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>リレーションタイプ ({relationTypeStats.length})</h3>
              {addingType?.category === 'relation' ? (
                <div style={styles.addTypeSection}>
                  <input
                    type="text"
                    value={addingType.value}
                    onChange={(e) => setAddingType({ ...addingType, value: e.target.value })}
                    placeholder="新しいリレーションタイプを入力"
                    style={styles.addTypeInput}
                    autoFocus
                  />
                  <button onClick={handleAddType} style={styles.addTypeButton}>追加</button>
                  <button onClick={() => setAddingType(null)} style={styles.cancelAddButton}>キャンセル</button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingType({ category: 'relation', value: '' })}
                  style={styles.newTypeButton}
                >
                  ＋ 新しいタイプを追加
                </button>
              )}
              <div style={styles.table}>
                <div style={styles.tableHeader}>
                  <div style={styles.colType}>タイプ名</div>
                  <div style={styles.colCount}>使用数</div>
                  <div style={styles.colActions}>操作</div>
                </div>
                {relationTypeStats.map(({ type, count }) => (
                  <div key={type} style={styles.tableRow}>
                    {editing?.category === 'relation' && editing.oldType === type ? (
                      <>
                        <div style={styles.colType}>
                          <input
                            type="text"
                            value={editing.newType}
                            onChange={(e) => setEditing({ ...editing, newType: e.target.value })}
                            style={styles.editInput}
                            autoFocus
                          />
                        </div>
                        <div style={styles.colCount}>{count}件</div>
                        <div style={styles.colActions}>
                          <button onClick={handleSaveEdit} disabled={loading} style={styles.saveButton}>
                            ✓
                          </button>
                          <button onClick={() => setEditing(null)} style={styles.cancelEditButton}>
                            ✕
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.colType}>{type}</div>
                        <div style={styles.colCount}>{count}件</div>
                        <div style={styles.colActions}>
                          <button onClick={() => handleStartEdit('relation', type)} style={styles.editButton} title="リネーム">
                            ✏️
                          </button>
                          <button onClick={() => handleStartDelete('relation', type)} style={styles.deleteButton} title="削除">
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button onClick={onClose} style={styles.closeFooterButton}>
              閉じる
            </button>
          </div>
        </div>
      </div>

      {/* 削除確認ダイアログ */}
      {confirmDelete && (
        <div style={styles.confirmOverlay} onClick={() => setConfirmDelete(null)}>
          <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.confirmTitle}>削除確認</h3>
            <p style={styles.confirmMessage}>
              {confirmDelete.category === 'entity' ? (
                <>
                  「{confirmDelete.type}」タイプのエンティティ <strong>{confirmDelete.count}件</strong> を削除しますか？
                  <br />
                  関連するリレーションも削除されます。
                </>
              ) : (
                <>
                  「{confirmDelete.type}」タイプのリレーション <strong>{confirmDelete.count}件</strong> を削除しますか？
                </>
              )}
            </p>
            <div style={styles.confirmButtons}>
              <button onClick={handleConfirmDelete} disabled={loading} style={styles.confirmDeleteButton}>
                {loading ? '削除中...' : '削除'}
              </button>
              <button onClick={() => setConfirmDelete(null)} style={styles.confirmCancelButton}>
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    width: '90%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#757575',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
  },
  body: {
    padding: '24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '16px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  table: {
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    backgroundColor: '#f5f5f5',
    padding: '12px',
    fontWeight: '600' as const,
    fontSize: '14px',
    color: '#616161',
    borderBottom: '1px solid #e0e0e0',
  },
  tableRow: {
    display: 'flex',
    padding: '12px',
    alignItems: 'center',
    borderBottom: '1px solid #f0f0f0',
  },
  colType: {
    flex: 2,
    fontSize: '14px',
    color: '#212121',
  },
  colCount: {
    flex: 1,
    fontSize: '14px',
    color: '#757575',
  },
  colActions: {
    flex: 1,
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  newTypeButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    marginBottom: '12px',
  },
  addTypeSection: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  addTypeInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #4DA1FF',
    borderRadius: '4px',
    fontSize: '14px',
  },
  addTypeButton: {
    padding: '8px 16px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  cancelAddButton: {
    padding: '8px 16px',
    backgroundColor: '#e0e0e0',
    color: '#212121',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  editInput: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #4DA1FF',
    borderRadius: '4px',
    fontSize: '14px',
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  },
  saveButton: {
    background: '#4DA1FF',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 12px',
    borderRadius: '4px',
  },
  cancelEditButton: {
    background: '#e0e0e0',
    color: '#212121',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 12px',
    borderRadius: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '16px 24px',
    borderTop: '1px solid #e0e0e0',
  },
  closeFooterButton: {
    padding: '10px 16px',
    backgroundColor: '#757575',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  confirmOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
  confirmDialog: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
  },
  confirmTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  confirmMessage: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#616161',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  confirmDeleteButton: {
    padding: '10px 16px',
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
  confirmCancelButton: {
    padding: '10px 16px',
    backgroundColor: '#e0e0e0',
    color: '#212121',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
  },
};
