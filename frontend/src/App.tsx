import React, { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { useEntities, useRelations, Entity, Relation, createEntity, updateEntity, deleteEntity, createRelation, updateRelation, deleteRelation, resetAllData, exportData, importData, fetchEntityTypes, fetchRelationTypes, createEntityType, createRelationType, deleteEntityTypeOnly, deleteRelationTypeOnly } from './api';
import Graph from './Graph';
import EntityModal from './EntityModal';
import RelationModal from './RelationModal';
import ConfirmDialog from './ConfirmDialog';
import { ImportDialog } from './ImportDialog';
import { TypeManagementDialog } from './TypeManagementDialog';
import { sampleEntities, sampleRelations } from './sampleData';

type ModalState = 'closed' | 'addEntity' | 'editEntity' | 'addRelation' | 'editRelation';
type ConfirmState = { open: false } | { open: true; type: 'deleteEntity' | 'deleteRelation' | 'resetData'; id?: number };

function App() {
  const { entities: apiEntities, refetch: refetchEntities } = useEntities();
  const { relations: apiRelations, refetch: refetchRelations } = useRelations();

  // ローカルバックアップ状態
  const [localEntities, setLocalEntities] = useState<Entity[]>([]);
  const [localRelations, setLocalRelations] = useState<Relation[]>([]);

  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedEntity, setSelectedEntity] = useState<Entity | undefined>(undefined);
  const [selectedRelation, setSelectedRelation] = useState<Relation | undefined>(undefined);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTypeManagement, setShowTypeManagement] = useState(false);
  
  // 検索・フィルタ状態
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleRelationTypes, setVisibleRelationTypes] = useState<Set<string>>(new Set());
  const [visibleEntityTypes, setVisibleEntityTypes] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewingEntity, setViewingEntity] = useState<Entity | null>(null);
  const [manuallyAddedEntityTypes, setManuallyAddedEntityTypes] = useState<string[]>([]);
  const [manuallyAddedRelationTypes, setManuallyAddedRelationTypes] = useState<string[]>([]);

  const loadTypes = async () => {
    try {
      const [entityTypes, relationTypes] = await Promise.all([
        fetchEntityTypes(),
        fetchRelationTypes(),
      ]);
      setManuallyAddedEntityTypes(entityTypes);
      setManuallyAddedRelationTypes(relationTypes);
    } catch (error) {
      console.error('Failed to load types:', error);
    }
  };

  // APIからデータ取得時にローカル状態を更新、ない場合はサンプルで初期化
  useEffect(() => {
    if (apiEntities.length > 0) {
      setLocalEntities(apiEntities);
    } else {
      setLocalEntities(sampleEntities);
    }
  }, [apiEntities]);

  useEffect(() => {
    if (apiRelations.length > 0) {
      setLocalRelations(apiRelations);
    } else {
      setLocalRelations(sampleRelations);
    }
  }, [apiRelations]);

  useEffect(() => {
    loadTypes();
  }, []);

  // debounce処理
  useEffect(() => {
    const handler = debounce(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    
    handler();
    
    return () => {
      handler.cancel();
    };
  }, [searchQuery]);

  // エンティティタイプとリレーションタイプの一覧を取得
  const entityTypes = useMemo(() => {
    const types = Array.from(new Set(localEntities.map(e => e.type)));
    // 手動で追加されたタイプも含める
    return Array.from(new Set([...types, ...manuallyAddedEntityTypes])).sort();
  }, [localEntities, manuallyAddedEntityTypes]);
  const relationTypes = useMemo(() => {
    const types = Array.from(new Set(localRelations.map(r => r.relation_type)));
    // 手動で追加されたタイプも含める
    return Array.from(new Set([...types, ...manuallyAddedRelationTypes])).sort();
  }, [localRelations, manuallyAddedRelationTypes]);

  // 初期化：すべてのタイプを表示
  useEffect(() => {
    setVisibleEntityTypes(new Set(entityTypes));
  }, [entityTypes.join(',')]);

  useEffect(() => {
    setVisibleRelationTypes(new Set(relationTypes));
  }, [relationTypes.join(',')]);

  // フィルタリング
  const filteredEntities = useMemo(() => {
    return localEntities.filter(entity => {
      // タイプフィルタ
      if (!visibleEntityTypes.has(entity.type)) return false;
      
      // 検索フィルタ
      if (debouncedQuery) {
        const query = debouncedQuery.toLowerCase();
        return (
          entity.name.toLowerCase().includes(query) ||
          entity.type.toLowerCase().includes(query) ||
          (entity.description || '').toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [localEntities, visibleEntityTypes, debouncedQuery]);

  const filteredRelations = useMemo(() => {
    return localRelations.filter(relation => {
      // リレーションタイプフィルタ
      if (!visibleRelationTypes.has(relation.relation_type)) return false;
      
      // ソースまたはターゲットがフィルタされたエンティティに含まれる場合のみ表示
      return (
        filteredEntities.some(e => e.id === relation.source_id) &&
        filteredEntities.some(e => e.id === relation.target_id)
      );
    });
  }, [localRelations, visibleRelationTypes, filteredEntities]);

  // 使用するデータがサンプルか判定
  const isUsingSampleData = apiEntities.length === 0;

  // Entity handlers
  const handleAddEntity = () => {
    setSelectedEntity(undefined);
    setModalState('addEntity');
  };

  const handleEditEntity = (entity: Entity) => {
    setSelectedEntity(entity);
    setModalState('editEntity');
  };

  const handleDeleteEntity = (entity: Entity) => {
    setConfirmState({ open: true, type: 'deleteEntity', id: entity.id });
  };

  const handleSaveEntity = async (data: Omit<Entity, 'id'>) => {
    try {
      if (selectedEntity) {
        const existsInDb = apiEntities.some(e => e.id === selectedEntity.id);
        if (existsInDb) {
          await updateEntity(selectedEntity.id, data);
          await refetchEntities();
        } else {
          if (isUsingSampleData) {
            for (const entity of sampleEntities) {
              if (entity.id === selectedEntity.id) {
                await createEntity(data);
              } else {
                await createEntity({
                  name: entity.name,
                  type: entity.type,
                  description: entity.description,
                });
              }
            }
            await refetchEntities();
            await new Promise(resolve => setTimeout(resolve, 100));
            const newEntities = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/entities/`).then(r => r.json());
            
            const idMap = new Map<number, number>();
            sampleEntities.forEach((sample, index) => {
              idMap.set(sample.id, newEntities[index]?.id || sample.id);
            });
            
            for (const relation of sampleRelations) {
              const newSourceId = idMap.get(relation.source_id);
              const newTargetId = idMap.get(relation.target_id);
              if (newSourceId && newTargetId) {
                await createRelation({
                  source_id: newSourceId,
                  target_id: newTargetId,
                  relation_type: relation.relation_type,
                  description: relation.description,
                });
              }
            }
            await refetchRelations();
            await refetchEntities();
          } else {
            await createEntity(data);
            await refetchEntities();
          }
        }
      } else {
        await createEntity(data);
        await refetchEntities();
      }
      setModalState('closed');
    } catch (err) {
      throw err;
    }
  };

  // Relation handlers
  const handleAddRelation = () => {
    setSelectedRelation(undefined);
    setModalState('addRelation');
  };

  const handleEditRelation = (relation: Relation) => {
    setSelectedRelation(relation);
    setModalState('editRelation');
  };

  const handleDeleteRelation = (relation: Relation) => {
    setConfirmState({ open: true, type: 'deleteRelation', id: relation.id });
  };

  const handleViewEntity = (entity: Entity) => {
    setViewingEntity(entity);
  };

  const handleAddType = async (category: 'entity' | 'relation', typeName: string) => {
    if (category === 'entity') {
      await createEntityType(typeName);
    } else {
      await createRelationType(typeName);
    }
    await loadTypes();
  };

  const handleRemoveType = async (category: 'entity' | 'relation', typeName: string) => {
    if (category === 'entity') {
      await deleteEntityTypeOnly(typeName);
    } else {
      await deleteRelationTypeOnly(typeName);
    }
    await loadTypes();
  };

  const handleResetData = () => {
    setConfirmState({ open: true, type: 'resetData' });
  };

  const handleSaveRelation = async (data: Omit<Relation, 'id'>) => {
    try {
      if (selectedRelation) {
        const existsInDb = apiRelations.some(r => r.id === selectedRelation.id);
        if (existsInDb) {
          await updateRelation(selectedRelation.id, data);
          await refetchRelations();
        } else {
          if (isUsingSampleData) {
            for (const entity of sampleEntities) {
              await createEntity({
                name: entity.name,
                type: entity.type,
                description: entity.description,
              });
            }
            await refetchEntities();
            await new Promise(resolve => setTimeout(resolve, 100));
            const newEntities = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/entities/`).then(r => r.json());
            const idMap = new Map<number, number>();
            sampleEntities.forEach((sample, index) => {
              idMap.set(sample.id, newEntities[index]?.id || sample.id);
            });
            for (const relation of sampleRelations) {
              const newSourceId = idMap.get(relation.source_id);
              const newTargetId = idMap.get(relation.target_id);
              if (newSourceId && newTargetId) {
                if (relation.id === selectedRelation.id) {
                  const mappedSourceId = idMap.get(data.source_id) || data.source_id;
                  const mappedTargetId = idMap.get(data.target_id) || data.target_id;
                  await createRelation({
                    source_id: mappedSourceId,
                    target_id: mappedTargetId,
                    relation_type: data.relation_type,
                    description: data.description,
                  });
                } else {
                  await createRelation({
                    source_id: newSourceId,
                    target_id: newTargetId,
                    relation_type: relation.relation_type,
                    description: relation.description,
                  });
                }
              }
            }
            await refetchRelations();
            await refetchEntities();
          } else {
            await createRelation(data);
            await refetchRelations();
          }
        }
      } else {
        await createRelation(data);
        await refetchRelations();
      }
      setModalState('closed');
    } catch (err) {
      throw err;
    }
  };

  // Confirm handlers
  const handleConfirmDelete = async () => {
    if (confirmState.open) {
      if (confirmState.type === 'deleteEntity') {
        const existsInDb = apiEntities.some(e => e.id === confirmState.id);
        
        if (existsInDb) {
          await deleteEntity(confirmState.id!);
          await refetchEntities();
          await refetchRelations();
        } else if (isUsingSampleData) {
          setLocalEntities(prev => prev.filter(e => e.id !== confirmState.id));
          setLocalRelations(prev =>
            prev.filter(
              r => r.source_id !== confirmState.id && r.target_id !== confirmState.id
            )
          );
        } else {
          console.warn(`Entity with id ${confirmState.id} not found in DB`);
          await refetchEntities();
        }
      } else if (confirmState.type === 'deleteRelation') {
        const existsInDb = apiRelations.some(r => r.id === confirmState.id);
        
        if (existsInDb) {
          await deleteRelation(confirmState.id!);
          await refetchRelations();
        } else if (isUsingSampleData) {
          setLocalRelations(prev => prev.filter(r => r.id !== confirmState.id));
        } else {
          console.warn(`Relation with id ${confirmState.id} not found in DB`);
          await refetchRelations();
        }
      } else if (confirmState.type === 'resetData') {
        try {
          await resetAllData();
          await refetchEntities();
          await refetchRelations();
        } catch (err) {
          console.error("Failed to reset data:", err);
          alert("データのリセットに失敗しました");
        }
      }
      setConfirmState({ open: false });
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relation-map-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const handleImport = async (file: File, mode: 'merge' | 'replace') => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await importData(data, mode);
      
      await refetchEntities();
      await refetchRelations();
      await loadTypes();
      
      alert(`インポート成功: ${result.imported_entities} エンティティ, ${result.imported_relations} リレーション`);
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  const getEntityById = (id: number) => filteredEntities.find(e => e.id === id);

  const handleToggleRelationType = (type: string) => {
    setVisibleRelationTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleToggleEntityType = (type: string) => {
    setVisibleEntityTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  return (
    <div style={styles.appContainer}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Relation Map</h1>
          <p style={styles.subtitle}>人物相関図 Webアプリ</p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={handleAddEntity} style={styles.primaryButton}>
            + ノード
          </button>
          <button onClick={handleAddRelation} style={styles.primaryButton}>
            + リレーション
          </button>
          <button onClick={handleExport} style={styles.secondaryButton} aria-label="データをエクスポート">
            📥 エクスポート
          </button>
          <button onClick={() => setShowImportDialog(true)} style={styles.secondaryButton} aria-label="データをインポート">
            📤 インポート
          </button>
          <button onClick={handleResetData} style={styles.warningButton}>
            🔄 リセット
          </button>
        </div>
      </header>

      {isUsingSampleData && (
        <div style={styles.notice}>
          ℹ️ サンプルデータを表示中。編集・追加すると自動的にDBへ保存されます。
        </div>
      )}

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        {/* サイドバー */}
        <aside style={{
          ...styles.sidebar,
          width: sidebarCollapsed ? '50px' : '320px',
        }}>
          {sidebarCollapsed ? (
            <button 
              onClick={() => setSidebarCollapsed(false)} 
              style={styles.toggleButton}
              aria-label="サイドバーを開く"
            >
              ▶
            </button>
          ) : (
            <>
              <button 
                onClick={() => setSidebarCollapsed(true)} 
                style={styles.toggleButton}
                aria-label="サイドバーを閉じる"
              >
                ◀
              </button>
              
              {/* 検索バー */}
              <div style={styles.searchSection}>
                <div style={styles.searchBar}>
                  <input
                    type="text"
                    placeholder="🔍 ノードを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={styles.searchInput}
                    aria-label="ノード検索"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={styles.clearButton}>
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* フィルタセクション */}
              <div style={styles.filterSection}>
                <h3 style={styles.sectionTitle}>表示フィルタ</h3>
                
                <div style={styles.filterGroup}>
                  <h4 style={styles.filterTitle}>ノードタイプ</h4>
                  <div style={styles.checkboxGroup}>
                    {entityTypes.map(type => (
                      <label key={type} style={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={visibleEntityTypes.has(type)}
                          onChange={() => handleToggleEntityType(type)}
                        />
                        <span style={styles.checkboxLabel}>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={styles.filterGroup}>
                  <h4 style={styles.filterTitle}>リレーションタイプ</h4>
                  <div style={styles.checkboxGroup}>
                    {relationTypes.map(type => (
                      <label key={type} style={styles.checkbox}>
                        <input
                          type="checkbox"
                          checked={visibleRelationTypes.has(type)}
                          onChange={() => handleToggleRelationType(type)}
                        />
                        <span style={styles.checkboxLabel}>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* タイプ管理 */}
              <div style={styles.typeManagementSection}>
                <button
                  onClick={() => setShowTypeManagement(true)}
                  style={styles.typeManagementButton}
                >
                  📋 タイプ管理
                </button>
              </div>

              {/* ノード一覧 */}
              <div style={styles.listSection}>
                <h3 style={styles.sectionTitle}>
                  ノード一覧 ({filteredEntities.length})
                </h3>
                <div style={styles.listContainer}>
                  {filteredEntities.map(e => (
                    <div key={e.id} style={styles.listItem}>
                      <div style={styles.listItemInfo}>
                        <div style={styles.listItemName}>{e.name}</div>
                        <div style={styles.listItemType}>{e.type}</div>
                        {e.description && (
                          <div 
                            style={styles.listItemDescription} 
                            title={e.description}
                          >
                            {e.description}
                          </div>
                        )}
                      </div>
                      <div style={styles.listItemActions}>
                        <button onClick={() => handleEditEntity(e)} style={styles.editButton} aria-label={`${e.name}を編集`}>
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteEntity(e)} style={styles.deleteButton} aria-label={`${e.name}を削除`}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* リレーション一覧 */}
              <div style={styles.listSection}>
                <h3 style={styles.sectionTitle}>
                  リレーション一覧 ({filteredRelations.length})
                </h3>
                <div style={styles.listContainer}>
                  {filteredRelations.map(r => {
                    const source = getEntityById(r.source_id);
                    const target = getEntityById(r.target_id);
                    return (
                      <div key={r.id} style={styles.listItem}>
                        <div style={styles.listItemInfo}>
                          <div style={styles.listItemName}>
                            {source?.name} → {target?.name}
                          </div>
                          <div style={styles.listItemType}>{r.relation_type}</div>
                        </div>
                        <div style={styles.listItemActions}>
                          <button onClick={() => handleEditRelation(r)} style={styles.editButton} aria-label="リレーションを編集">
                            ✏️
                          </button>
                          <button onClick={() => handleDeleteRelation(r)} style={styles.deleteButton} aria-label="リレーションを削除">
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>

        {/* グラフエリア */}
        <main style={styles.graphArea}>
          <div style={styles.graphContainer}>
            <Graph
              entities={filteredEntities}
              relations={filteredRelations}
              width={900}
              height={600}
              onEditEntity={handleEditEntity}
              onDeleteEntity={handleDeleteEntity}
              onEditRelation={handleEditRelation}
              onDeleteRelation={handleDeleteRelation}
              onViewEntity={handleViewEntity}
            />
          </div>
        </main>
      </div>

      {/* Modals */}
      {(modalState === 'addEntity' || modalState === 'editEntity') && (
        <EntityModal
          entity={selectedEntity}
          existingTypes={entityTypes}
          onSave={handleSaveEntity}
          onClose={() => setModalState('closed')}
        />
      )}

      {(modalState === 'addRelation' || modalState === 'editRelation') && (
        <RelationModal
          relation={selectedRelation}
          entities={localEntities}
          existingTypes={relationTypes}
          onSave={handleSaveRelation}
          onClose={() => setModalState('closed')}
        />
      )}

      {confirmState.open && (
        <ConfirmDialog
          title="削除確認"
          message={
            confirmState.type === 'deleteEntity'
              ? 'このノードを削除しますか？'
              : confirmState.type === 'deleteRelation'
              ? 'このリレーションを削除しますか？'
              : 'すべてのデータを削除してリセットしますか？この操作は取り消せません。'
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmState({ open: false })}
        />
      )}

      {showImportDialog && (
        <ImportDialog
          onImport={handleImport}
          onClose={() => setShowImportDialog(false)}
        />
      )}

      {showTypeManagement && (
        <TypeManagementDialog
          entities={localEntities}
          relations={localRelations}
          manuallyAddedEntityTypes={manuallyAddedEntityTypes}
          manuallyAddedRelationTypes={manuallyAddedRelationTypes}
          onClose={() => setShowTypeManagement(false)}
          onUpdate={async () => {
            await refetchEntities();
            await refetchRelations();
            await loadTypes();
          }}
          onAddType={handleAddType}
          onRemoveType={handleRemoveType}
        />
      )}

      {viewingEntity && (
        <div style={styles.viewDialogOverlay} onClick={() => setViewingEntity(null)}>
          <div style={styles.viewDialogContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.viewDialogHeader}>
              <h2 style={styles.viewDialogTitle}>ノード情報</h2>
              <button
                onClick={() => setViewingEntity(null)}
                style={styles.viewDialogCloseButton}
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div style={styles.viewDialogBody}>
              <div style={styles.viewField}>
                <label style={styles.viewFieldLabel}>名前</label>
                <div style={styles.viewFieldValue}>{viewingEntity.name}</div>
              </div>
              <div style={styles.viewField}>
                <label style={styles.viewFieldLabel}>タイプ</label>
                <div style={styles.viewFieldValue}>{viewingEntity.type}</div>
              </div>
              <div style={styles.viewField}>
                <label style={styles.viewFieldLabel}>説明</label>
                <div style={styles.viewFieldValue}>
                  {viewingEntity.description || '(なし)'}
                </div>
              </div>
            </div>
            <div style={styles.viewDialogFooter}>
              <button
                onClick={() => {
                  setViewingEntity(null);
                  handleEditEntity(viewingEntity);
                }}
                style={styles.primaryButton}
              >
                編集
              </button>
              <button
                onClick={() => setViewingEntity(null)}
                style={styles.secondaryButton}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  subtitle: {
    margin: 0,
    fontSize: '14px',
    color: '#757575',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  primaryButton: {
    padding: '10px 16px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 16px',
    backgroundColor: '#757575',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'background-color 0.2s',
  },
  warningButton: {
    padding: '10px 16px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'background-color 0.2s',
  },
  notice: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '12px 24px',
    fontSize: '14px',
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    overflow: 'auto',
    transition: 'width 0.3s ease',
    position: 'relative' as const,
  },
  toggleButton: {
    position: 'absolute' as const,
    top: '8px',
    right: '8px',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '12px',
    zIndex: 10,
  },
  searchSection: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative' as const,
  },
  searchInput: {
    width: '100%',
    padding: '10px 32px 10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  clearButton: {
    position: 'absolute' as const,
    right: '8px',
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#757575',
    padding: '0 4px',
  },
  filterSection: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },
  filterGroup: {
    marginBottom: '16px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  filterTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    fontWeight: '500' as const,
    color: '#757575',
  },
  typeManagementSection: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
  },
  typeManagementButton: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#9C27B0',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500' as const,
    transition: 'background-color 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#212121',
  },
  listSection: {
    padding: '16px',
    borderBottom: '1px solid #e0e0e0',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    overflowY: 'auto' as const,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9f9f9',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    transition: 'background-color 0.2s',
  },
  listItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  listItemName: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#212121',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listItemType: {
    fontSize: '12px',
    color: '#757575',
    marginTop: '2px',
  },
  listItemDescription: {
    fontSize: '12px',
    color: '#616161',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    cursor: 'help',
  },
  listItemActions: {
    display: 'flex',
    gap: '4px',
    marginLeft: '8px',
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  graphArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '16px',
    overflow: 'auto',
  },
  graphContainer: {
    flex: 1,
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
  },
  viewDialogOverlay: {
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
  viewDialogContent: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  viewDialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e0e0e0',
  },
  viewDialogTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600' as const,
    color: '#212121',
  },
  viewDialogCloseButton: {
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
    transition: 'background-color 0.2s',
  },
  viewDialogBody: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  viewField: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  viewFieldLabel: {
    fontSize: '14px',
    fontWeight: '500' as const,
    color: '#757575',
  },
  viewFieldValue: {
    fontSize: '16px',
    color: '#212121',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap' as const,
  },
  viewDialogFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e0e0e0',
    alignItems: 'center',
    overflow: 'hidden',
  },
};

export default App;
