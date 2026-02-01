import React, { useState, useEffect } from 'react';
import { useEntities, useRelations, Entity, Relation, createEntity, updateEntity, deleteEntity, createRelation, updateRelation, deleteRelation, resetAllData } from './api';
import Graph from './Graph';
import EntityModal from './EntityModal';
import RelationModal from './RelationModal';
import ConfirmDialog from './ConfirmDialog';
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

  // 使用するデータがサンプルか判定
  const isUsingSampleData = apiEntities.length === 0;

  const nodesToUse = localEntities;
  const linksToUse = localRelations;

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
        // 編集の場合：サンプルデータかDB データか確認
        const existsInDb = apiEntities.some(e => e.id === selectedEntity.id);
        if (existsInDb) {
          // DB に存在する場合：更新
          await updateEntity(selectedEntity.id, data);
          await refetchEntities();
        } else {
          // サンプルデータの場合：すべてのサンプルデータをDBに移行してから編集
          if (isUsingSampleData) {
            // まずすべてのサンプルエンティティをDBに登録
            for (const entity of sampleEntities) {
              if (entity.id === selectedEntity.id) {
                // 編集対象は編集後のデータで登録
                await createEntity(data);
              } else {
                // 他のサンプルデータはそのまま登録
                await createEntity({
                  name: entity.name,
                  type: entity.type,
                  description: entity.description,
                });
              }
            }
            // 確実にエンティティを再取得
            await refetchEntities();
            // 少し待ってから新しいエンティティを取得（API応答の完了を確実にする）
            await new Promise(resolve => setTimeout(resolve, 100));
            const newEntities = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/entities/`).then(r => r.json());
            
            // IDマッピングを作成（サンプルID → 新しいDB ID）
            const idMap = new Map<number, number>();
            sampleEntities.forEach((sample, index) => {
              idMap.set(sample.id, newEntities[index]?.id || sample.id);
            });
            
            // リレーションを登録
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
            // 最終的にデータを再取得して確実に更新
            await refetchEntities();
          } else {
            // すでに一部データがある場合は新規作成として扱う
            await createEntity(data);
            await refetchEntities();
          }
        }
      } else {
        // 新規追加の場合：常にAPI追加
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

  const handleResetData = () => {
    setConfirmState({ open: true, type: 'resetData' });
  };

  const handleSaveRelation = async (data: Omit<Relation, 'id'>) => {
    try {
      if (selectedRelation) {
        // 編集の場合：サンプルデータかDB データか確認
        const existsInDb = apiRelations.some(r => r.id === selectedRelation.id);
        if (existsInDb) {
          // DB に存在する場合：更新
          await updateRelation(selectedRelation.id, data);
          await refetchRelations();
        } else {
          // サンプルデータの場合：エンティティがすでにDBに移行されているか確認
          if (isUsingSampleData) {
            // エンティティがまだサンプルデータの場合、まずエンティティを移行
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
            // すべてのサンプルリレーションを登録
            for (const relation of sampleRelations) {
              const newSourceId = idMap.get(relation.source_id);
              const newTargetId = idMap.get(relation.target_id);
              if (newSourceId && newTargetId) {
                if (relation.id === selectedRelation.id) {
                  // 編集対象は編集後のデータで登録
                  const mappedSourceId = idMap.get(data.source_id) || data.source_id;
                  const mappedTargetId = idMap.get(data.target_id) || data.target_id;
                  await createRelation({
                    source_id: mappedSourceId,
                    target_id: mappedTargetId,
                    relation_type: data.relation_type,
                    description: data.description,
                  });
                } else {
                  // 他のサンプルデータはそのまま登録
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
            // 新規作成として扱う
            await createRelation(data);
            await refetchRelations();
          }
        }
      } else {
        // 新規追加の場合：常にAPI追加
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
        // 削除対象がDB内に存在するか確認
        const existsInDb = apiEntities.some(e => e.id === confirmState.id);
        
        if (existsInDb) {
          // DB データの場合：API削除
          await deleteEntity(confirmState.id!);
          await refetchEntities();
          await refetchRelations(); // 関連リレーションも再取得
        } else if (isUsingSampleData) {
          // サンプルデータの場合：ローカル削除のみ
          setLocalEntities(prev => prev.filter(e => e.id !== confirmState.id));
          setLocalRelations(prev =>
            prev.filter(
              r => r.source_id !== confirmState.id && r.target_id !== confirmState.id
            )
          );
        } else {
          // DBに存在しない場合は何もしない（既に削除済みまたはIDが古い）
          console.warn(`Entity with id ${confirmState.id} not found in DB`);
          await refetchEntities();
        }
      } else if (confirmState.type === 'deleteRelation') {
        // 削除対象がDB内に存在するか確認
        const existsInDb = apiRelations.some(r => r.id === confirmState.id);
        
        if (existsInDb) {
          // DB データの場合：API削除
          await deleteRelation(confirmState.id!);
          await refetchRelations();
        } else if (isUsingSampleData) {
          // サンプルデータの場合：ローカル削除のみ
          setLocalRelations(prev => prev.filter(r => r.id !== confirmState.id));
        } else {
          // DBに存在しない場合は何もしない
          console.warn(`Relation with id ${confirmState.id} not found in DB`);
          await refetchRelations();
        }
      } else if (confirmState.type === 'resetData') {
        try {
          // リセット：APIリセット実行
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

  const getEntityById = (id: number) => nodesToUse.find(e => e.id === id);
  const getRelationById = (id: number) => linksToUse.find(r => r.id === id);

  return (
    <div style={styles.container}>
      <h1>Relation Map</h1>
      <p>人物相関図 Webアプリ</p>

      <div style={styles.controls}>
        <button onClick={handleAddEntity} style={styles.button}>
          + ノードを追加
        </button>
        <button onClick={handleAddRelation} style={styles.button}>
          + リレーションを追加
        </button>
        <button onClick={handleResetData} style={{ ...styles.button, backgroundColor: '#ff9800' }}>
          🔄 データをリセット
        </button>
      </div>

      {isUsingSampleData && (
        <div style={styles.notice}>
          ℹ️ サンプルデータを表示中。編集・追加すると自動的にDBへ保存されます。
        </div>
      )}

      <h2>グラフ表示</h2>
      <div style={styles.graphContainer}>
        <Graph
          entities={nodesToUse}
          relations={linksToUse}
          width={900}
          height={600}
          onEditEntity={handleEditEntity}
          onDeleteEntity={handleDeleteEntity}
          onEditRelation={handleEditRelation}
          onDeleteRelation={handleDeleteRelation}
        />
      </div>

      <div style={styles.dataPanel}>
        <div style={styles.panelSection}>
          <h2>ノード一覧</h2>
          <ul style={styles.list}>
            {nodesToUse.map(e => (
              <li key={e.id} style={styles.listItem}>
                <span>{e.name} ({e.type})</span>
                <div style={styles.actions}>
                  <button onClick={() => handleEditEntity(e)} style={styles.smallButton}>
                    編集
                  </button>
                  <button onClick={() => handleDeleteEntity(e)} style={{ ...styles.smallButton, backgroundColor: '#f44336' }}>
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div style={styles.panelSection}>
          <h2>リレーション一覧</h2>
          <ul style={styles.list}>
            {linksToUse.map(r => {
              const source = getEntityById(r.source_id);
              const target = getEntityById(r.target_id);
              return (
                <li key={r.id} style={styles.listItem}>
                  <span>
                    {source?.name} -[{r.relation_type}]→ {target?.name}
                  </span>
                  <div style={styles.actions}>
                    <button onClick={() => handleEditRelation(r)} style={styles.smallButton}>
                      編集
                    </button>
                    <button onClick={() => handleDeleteRelation(r)} style={{ ...styles.smallButton, backgroundColor: '#f44336' }}>
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Modals */}
      {(modalState === 'addEntity' || modalState === 'editEntity') && (
        <EntityModal
          entity={selectedEntity}
          onSave={handleSaveEntity}
          onClose={() => setModalState('closed')}
        />
      )}

      {(modalState === 'addRelation' || modalState === 'editRelation') && (
        <RelationModal
          relation={selectedRelation}
          entities={nodesToUse}
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
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'sans-serif',
  },
  controls: {
    marginBottom: '20px',
    display: 'flex',
    gap: '10px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  notice: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '12px 16px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  graphContainer: {
    border: '1px solid #ccc',
    marginBottom: '20px',
    borderRadius: '4px',
  },
  dataPanel: {
    display: 'flex',
    gap: '20px',
    marginTop: '20px',
  },
  panelSection: {
    flex: 1,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderBottom: '1px solid #eee',
    gap: '10px',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '5px',
  },
  smallButton: {
    padding: '4px 12px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
  },
};

export default App;
