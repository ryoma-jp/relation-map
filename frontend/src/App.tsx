import React, { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { debounce } from 'lodash';
import { useEntities, useRelations, Entity, Relation, createEntity, updateEntity, deleteEntity, createRelation, updateRelation, deleteRelation, resetAllData, exportData, importData, fetchEntityTypes, fetchRelationTypes, createEntityType, createRelationType, deleteEntityTypeOnly, deleteRelationTypeOnly, fetchEntitiesList, renameEntityType, renameRelationType } from './api';
import { useAuth } from './AuthContext';
import LoginPage from './LoginPage';
import Graph from './Graph';
import EntityModal from './EntityModal';
import RelationModal from './RelationModal';
import ConfirmDialog from './ConfirmDialog';
import { ImportDialog } from './ImportDialog';
import { TypeManagementDialog } from './TypeManagementDialog';
import HistoryPanel from './HistoryPanel';
import { sampleEntities, sampleRelations } from './sampleData';
import AdminPage from './AdminPage';

type ModalState = 'closed' | 'addEntity' | 'editEntity' | 'addRelation' | 'editRelation';
type ConfirmState = { open: false } | { open: true; type: 'deleteEntity' | 'deleteRelation' | 'resetData'; id?: number };

function AppContent() {
  const { user, logout } = useAuth();
  const { entities: apiEntities, refetch: refetchEntities } = useEntities();
  const { relations: apiRelations, refetch: refetchRelations } = useRelations();
  const isMountedRef = useRef(true);

  // ローカルバックアップ状態
  const [localEntities, setLocalEntities] = useState<Entity[]>([]);
  const [localRelations, setLocalRelations] = useState<Relation[]>([]);

  const [modalState, setModalState] = useState<ModalState>('closed');
  const [selectedEntity, setSelectedEntity] = useState<Entity | undefined>(undefined);
  const [selectedRelation, setSelectedRelation] = useState<Relation | undefined>(undefined);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showTypeManagement, setShowTypeManagement] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'admin'>('main');
  
  // 検索・フィルタ状態
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visibleRelationTypes, setVisibleRelationTypes] = useState<Set<string>>(new Set());
  const [visibleEntityTypes, setVisibleEntityTypes] = useState<Set<string>>(new Set());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewingEntity, setViewingEntity] = useState<Entity | null>(null);
  const [manuallyAddedEntityTypes, setManuallyAddedEntityTypes] = useState<string[]>([]);
  const [manuallyAddedRelationTypes, setManuallyAddedRelationTypes] = useState<string[]>([]);
  const [hasExitedSampleMode, setHasExitedSampleMode] = useState(false);

  const loadTypes = async () => {
    try {
      const [entityTypes, relationTypes] = await Promise.all([
        fetchEntityTypes(),
        fetchRelationTypes(),
      ]);
      console.log('[loadTypes] Fetched types:', { entityTypes, relationTypes });
      if (isMountedRef.current) {
        // 状態更新を同時に行って batch 処理させる
        setManuallyAddedEntityTypes(entityTypes);
        setManuallyAddedRelationTypes(relationTypes);
        // 戻り値として新しい値を返す
        return { entityTypes, relationTypes };
      }
      return null;
    } catch (error) {
      if (isMountedRef.current) {
        console.error('Failed to load types:', error);
      }
      return null;
    }
  };

  // APIからデータ取得時にローカル状態を更新、ない場合はサンプルで初期化
  useEffect(() => {
    if (apiEntities.length > 0) {
      setLocalEntities(apiEntities);
    } else if (!hasExitedSampleMode) {
      setLocalEntities(sampleEntities);
    } else {
      setLocalEntities([]);
    }
  }, [apiEntities, hasExitedSampleMode]);

  useEffect(() => {
    if (apiRelations.length > 0) {
      setLocalRelations(apiRelations);
    } else if (!hasExitedSampleMode) {
      setLocalRelations(sampleRelations);
    } else {
      setLocalRelations([]);
    }
  }, [apiRelations, hasExitedSampleMode]);

  useEffect(() => {
    loadTypes();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ユーザー認証後にタイプを再読み込み
  useEffect(() => {
    if (user) {
      loadTypes();
    }
  }, [user]);

  // TypeManagementDialog が閉じた時にタイプを再読み込み
  const prevShowTypeManagementRef = useRef<boolean>(false);
  useEffect(() => {
    if (prevShowTypeManagementRef.current && !showTypeManagement) {
      console.log('[App] TypeManagementDialog closed, reloading types');
      loadTypes();
    }
    prevShowTypeManagementRef.current = showTypeManagement;
  }, [showTypeManagement]);

  // サンプルモード脱出フラグの管理
  // 実際のエンティティやリレーションが作成された時のみサンプルモードを脱出
  // タイプだけを追加してもサンプルモードは継続
  useEffect(() => {
    if (apiEntities.length > 0 || apiRelations.length > 0) {
      setHasExitedSampleMode(true);
    }
  }, [apiEntities, apiRelations]);

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
    const manualTypes = Array.isArray(manuallyAddedEntityTypes) ? manuallyAddedEntityTypes : [];
    return Array.from(new Set([...types, ...manualTypes])).sort();
  }, [localEntities, manuallyAddedEntityTypes]);
  const relationTypes = useMemo(() => {
    const types = Array.from(new Set(localRelations.map(r => r.relation_type)));
    // 手動で追加されたタイプも含める
    const manualTypes = Array.isArray(manuallyAddedRelationTypes) ? manuallyAddedRelationTypes : [];
    const result = Array.from(new Set([...types, ...manualTypes])).sort();
    console.log('[relationTypes] Calculated:', { 
      fromRelations: types, 
      manualTypes, 
      result,
      localRelationsCount: localRelations.length 
    });
    return result;
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

  // 使用するデータがサンプルか判定（entities と relations 両方空で、かつサンプルモードを脱出していない場合）
  const isUsingSampleData = apiEntities.length === 0 && apiRelations.length === 0 && !hasExitedSampleMode;
  
  console.log('[App] State:', { 
    apiEntitiesCount: apiEntities.length, 
    apiRelationsCount: apiRelations.length, 
    hasExitedSampleMode, 
    isUsingSampleData,
    manuallyAddedRelationTypesCount: Array.isArray(manuallyAddedRelationTypes)
      ? manuallyAddedRelationTypes.length
      : 0
  });

  if (activeView === 'admin' && user) {
    return <AdminPage currentUser={user} onBack={() => setActiveView('main')} />;
  }

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
            const newEntities = await fetchEntitiesList();
            
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
    // 使用数0のタイプを削除する場合はローカルデータに影響しない
    // API呼び出しのみ行う
    try {
      if (category === 'entity') {
        await deleteEntityTypeOnly(typeName);
      } else {
        await deleteRelationTypeOnly(typeName);
      }
    } catch (error) {
      // 404エラーの場合は無視（既に削除済み）
      const errorMsg = error instanceof Error ? error.message : '';
      if (!errorMsg.includes('not found') && !errorMsg.includes('404')) {
        throw error;
      }
    }
    await loadTypes();
  };

  const handleRenameType = async (category: 'entity' | 'relation', oldType: string, newType: string) => {
    const trimmedNewType = newType.trim();
    if (!trimmedNewType) {
      throw new Error('新しいタイプ名を入力してください');
    }
    if (oldType === trimmedNewType) {
      return;
    }

    if (category === 'entity') {
      const existsInDb = apiEntities.some(entity => entity.type === oldType)
        || manuallyAddedEntityTypes.includes(oldType);

      if (existsInDb) {
        await renameEntityType(oldType, trimmedNewType);
        await refetchEntities();
        await refetchRelations();
        await loadTypes();
        return;
      }

      // Sample/local-only types: rename in local state without API calls.
      setLocalEntities(prev => prev.map(entity => (
        entity.type === oldType ? { ...entity, type: trimmedNewType } : entity
      )));
      setManuallyAddedEntityTypes(prev => {
        const replaced = prev.map(type => (type === oldType ? trimmedNewType : type));
        if (!replaced.includes(trimmedNewType)) {
          replaced.push(trimmedNewType);
        }
        return Array.from(new Set(replaced));
      });
      return;
    }

    const existsInDb = apiRelations.some(relation => relation.relation_type === oldType)
      || manuallyAddedRelationTypes.includes(oldType);

    if (existsInDb) {
      await renameRelationType(oldType, trimmedNewType);
      await refetchEntities();
      await refetchRelations();
      await loadTypes();
      return;
    }

    // Sample/local-only types: rename in local state without API calls.
    setLocalRelations(prev => prev.map(relation => (
      relation.relation_type === oldType ? { ...relation, relation_type: trimmedNewType } : relation
    )));
    setManuallyAddedRelationTypes(prev => {
      const replaced = prev.map(type => (type === oldType ? trimmedNewType : type));
      if (!replaced.includes(trimmedNewType)) {
        replaced.push(trimmedNewType);
      }
      return Array.from(new Set(replaced));
    });
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
            const newEntities = await fetchEntitiesList();
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
            await refetchEntities();
          }
        }
      } else {
        await createRelation(data);
        await refetchRelations();
        await refetchEntities();
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
        const existsLocally = localEntities.some(e => e.id === confirmState.id);
        
        if (existsInDb) {
          await deleteEntity(confirmState.id!);
          // 削除後 refetch して DB 状態を反映
          await refetchEntities();
          await refetchRelations();
        } else if (existsLocally) {
          // Entity exists in local state but not in DB (sample data or local-only)
          // ローカルのみで削除し、refetch は呼ばない（refetch が削除を上書きするのを防ぐ）
          setLocalEntities(prev => prev.filter(e => e.id !== confirmState.id));
          setLocalRelations(prev =>
            prev.filter(
              r => r.source_id !== confirmState.id && r.target_id !== confirmState.id
            )
          );
          // ローカル削除はデータ操作なのでサンプルモード脱出と判定
          setHasExitedSampleMode(true);
        } else {
          console.warn(`Entity with id ${confirmState.id} not found`);
        }
      } else if (confirmState.type === 'deleteRelation') {
        const existsInDb = apiRelations.some(r => r.id === confirmState.id);
        const existsLocally = localRelations.some(r => r.id === confirmState.id);
        
        if (existsInDb) {
          await deleteRelation(confirmState.id!);
          // 削除後 refetch して DB 状態を反映
          await refetchEntities();
          await refetchRelations();
        } else if (existsLocally) {
          // Relation exists in local state but not in DB (sample data or local-only)
          // ローカルのみで削除し、refetch は呼ばない（refetch が削除を上書きするのを防ぐ）
          setLocalRelations(prev => prev.filter(r => r.id !== confirmState.id));
          // ローカル削除はデータ操作なのでサンプルモード脱出と判定
          setHasExitedSampleMode(true);
        } else {
          console.warn(`Relation with id ${confirmState.id} not found`);
        }
      } else if (confirmState.type === 'resetData') {
        try {
          await resetAllData();
          await refetchEntities();
          await refetchRelations();
        } catch (err) {
          console.error("Failed to reset data:", err);
          alert("データのリセットに失敗しました");
        } finally {
          // リセット後はサンプルモード脱出フラグをリセットしてバナーが表示されるようにする
          setHasExitedSampleMode(false);
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
          {user?.is_admin && (
            <button onClick={() => setActiveView('admin')} style={styles.adminButton}>
              🛡️ 管理
            </button>
          )}
          <div style={styles.userBadge}>
            <span style={styles.userName}>@{user?.username}</span>
            <button onClick={logout} style={styles.logoutButton}>
              ログアウト
            </button>
          </div>
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
                  onClick={async () => {
                    const result = await loadTypes();
                    if (result) {
                      // 状態更新を同期的に実行（React が確実に最新の状態でコンポーネントを再レンダリング）
                      flushSync(() => {
                        setManuallyAddedEntityTypes(result.entityTypes);
                        setManuallyAddedRelationTypes(result.relationTypes);
                      });
                    }
                    setShowTypeManagement(true);
                  }}
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
              onViewEntity={handleViewEntity}
            />
          </div>
        </main>

        {/* 履歴パネル */}
        <HistoryPanel onRefresh={() => {
          refetchEntities();
          refetchRelations();
        }} />
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
          key={`typeManagementDialog-${showTypeManagement}`}
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
          onRenameType={handleRenameType}
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

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.loadingCard}>認証状態を確認中...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppContent />;
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
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    borderLeft: '1px solid #e0e0e0',
  },
  userName: {
    fontSize: '13px',
    fontWeight: '600' as const,
    color: '#424242',
  },
  logoutButton: {
    padding: '8px 12px',
    backgroundColor: '#424242',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500' as const,
  },
  loadingScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: '20px 28px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    fontSize: '14px',
    color: '#424242',
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
  adminButton: {
    padding: '10px 16px',
    backgroundColor: '#1f2a4d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600' as const,
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
