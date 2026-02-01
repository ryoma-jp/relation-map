import React, { useState, useEffect } from 'react';
import { useEntities, useRelations, Entity, Relation, createEntity, updateEntity, deleteEntity, createRelation, updateRelation, deleteRelation } from './api';
import Graph from './Graph';
import EntityModal from './EntityModal';
import RelationModal from './RelationModal';
import ConfirmDialog from './ConfirmDialog';
import { sampleEntities, sampleRelations } from './sampleData';

type ModalState = 'closed' | 'addEntity' | 'editEntity' | 'addRelation' | 'editRelation';
type ConfirmState = { open: false } | { open: true; type: 'deleteEntity' | 'deleteRelation'; id: number };

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
        if (isUsingSampleData) {
          // サンプル数据の場合：ローカル更新のみ
          setLocalEntities(prev =>
            prev.map(e => e.id === selectedEntity.id ? { ...e, ...data } : e)
          );
        } else {
          // APIデータの場合：API更新
          await updateEntity(selectedEntity.id, data);
          await refetchEntities();
        }
      } else {
        if (isUsingSampleData) {
          // サンプル数据の場合：新しいローカルIDで追加
          const newId = Math.max(...localEntities.map(e => e.id), 0) + 1;
          setLocalEntities(prev => [...prev, { ...data, id: newId }]);
        } else {
          // APIデータの場合：API追加
          await createEntity(data);
          await refetchEntities();
        }
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

  const handleSaveRelation = async (data: Omit<Relation, 'id'>) => {
    try {
      if (selectedRelation) {
        if (isUsingSampleData) {
          // サンプル数据の場合：ローカル更新のみ
          setLocalRelations(prev =>
            prev.map(r => r.id === selectedRelation.id ? { ...r, ...data } : r)
          );
        } else {
          // APIデータの場合：API更新
          await updateRelation(selectedRelation.id, data);
          await refetchRelations();
        }
      } else {
        if (isUsingSampleData) {
          // サンプル数据の場合：新しいローカルIDで追加
          const newId = Math.max(...localRelations.map(r => r.id), 0) + 1;
          setLocalRelations(prev => [...prev, { ...data, id: newId }]);
        } else {
          // APIデータの場合：API追加
          await createRelation(data);
          await refetchRelations();
        }
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
        if (isUsingSampleData) {
          // サンプル数据の場合：ローカル削除、関連リレーションも削除
          setLocalEntities(prev => prev.filter(e => e.id !== confirmState.id));
          setLocalRelations(prev =>
            prev.filter(
              r => r.source_id !== confirmState.id && r.target_id !== confirmState.id
            )
          );
        } else {
          // APIデータの場合：API削除
          await deleteEntity(confirmState.id);
          await refetchEntities();
        }
      } else if (confirmState.type === 'deleteRelation') {
        if (isUsingSampleData) {
          // サンプル数据の場合：ローカル削除
          setLocalRelations(prev => prev.filter(r => r.id !== confirmState.id));
        } else {
          // APIデータの場合：API削除
          await deleteRelation(confirmState.id);
          await refetchRelations();
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
      </div>

      {isUsingSampleData && (
        <div style={styles.notice}>
          ⚠️ サンプルデータを使用中。変更はローカルのみで保存されません。
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
              : 'このリレーションを削除しますか？'
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
