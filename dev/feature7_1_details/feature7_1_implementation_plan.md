# 機能7.1: 基本機能の完成度向上 - 実装計画

## 概要
このドキュメントは[feature7_1_design.md](feature7_1_design.md)に基づく詳細な実装計画です。
Phase単位でタスクを整理し、実装の進捗を管理します。

---

## Phase 1: エクスポート/インポート機能 (Priority: High)

### 1.1 バックエンド実装

#### Task 1.1.1: Export エンドポイント実装
**ファイル**: `backend/api.py`

**実装内容**:
```python
from datetime import datetime

@router.get("/export")
def export_data(database: Session = Depends(get_db)):
    """全データをJSON形式でエクスポート"""
    try:
        entities = database.query(models.Entity).all()
        relations = database.query(models.Relation).all()
        
        data = {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat() + "Z",
            "entities": [schemas.Entity.from_orm(e).dict() for e in entities],
            "relations": [schemas.Relation.from_orm(r).dict() for r in relations]
        }
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
```

**チェックリスト**:
- [ ] エンドポイント追加
- [ ] エラーハンドリング実装
- [ ] レスポンスヘッダー設定（Content-Type, Content-Disposition）
- [ ] 動作確認（curl または Swagger UI で確認）

---

#### Task 1.1.2: Import エンドポイント実装
**ファイル**: `backend/api.py`, `backend/schemas.py`

**実装内容**:
```python
from pydantic import BaseModel
from typing import List

# schemas.py に追加
class ImportData(BaseModel):
    version: str
    entities: List[EntityCreate]
    relations: List[RelationCreate]

# api.py に追加
@router.post("/import")
def import_data(
    data: ImportData,
    mode: str = Query(default="merge", regex="^(merge|replace)$"),
    database: Session = Depends(get_db)
):
    """JSON形式のデータをインポート"""
    try:
        if mode == "replace":
            # 既存データ削除
            database.query(models.Relation).delete()
            database.query(models.Entity).delete()
            database.commit()
        
        # エンティティインポート
        entity_id_map = {}  # 旧ID → 新ID のマッピング
        
        for entity_data in data.entities:
            entity_dict = entity_data.dict()
            old_id = entity_dict.pop("id", None)
            
            new_entity = models.Entity(**entity_dict)
            database.add(new_entity)
            database.flush()
            
            if old_id:
                entity_id_map[old_id] = new_entity.id
        
        # リレーションインポート
        for relation_data in data.relations:
            relation_dict = relation_data.dict()
            relation_dict.pop("id", None)
            
            # IDマッピングを適用
            if relation_dict["source_id"] in entity_id_map:
                relation_dict["source_id"] = entity_id_map[relation_dict["source_id"]]
            if relation_dict["target_id"] in entity_id_map:
                relation_dict["target_id"] = entity_id_map[relation_dict["target_id"]]
            
            new_relation = models.Relation(**relation_dict)
            database.add(new_relation)
        
        database.commit()
        
        return {
            "ok": True,
            "imported_entities": len(data.entities),
            "imported_relations": len(data.relations),
            "skipped": 0
        }
    except Exception as e:
        database.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
```

**チェックリスト**:
- [ ] ImportData スキーマ定義
- [ ] エンドポイント追加
- [ ] merge/replace モード実装
- [ ] ID マッピング処理実装
- [ ] エラーハンドリング実装
- [ ] ロールバック処理確認
- [ ] 動作確認（両モードをテスト）

---

### 1.2 フロントエンド実装

#### Task 1.2.1: API関数追加
**ファイル**: `frontend/src/api.ts`

**実装内容**:
```typescript
export const exportData = async (): Promise<Blob> => {
  const response = await fetch(`${API_URL}/export`);
  if (!response.ok) {
    throw new Error('Export failed');
  }
  return response.blob();
};

export const importData = async (
  data: any,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ ok: boolean; imported_entities: number; imported_relations: number }> => {
  const response = await fetch(`${API_URL}/import?mode=${mode}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Import failed');
  }
  
  return response.json();
};
```

**チェックリスト**:
- [ ] exportData 関数追加
- [ ] importData 関数追加
- [ ] エラーハンドリング実装
- [ ] 型定義追加

---

#### Task 1.2.2: Export機能UI実装
**ファイル**: `frontend/src/App.tsx`

**実装内容**:
```typescript
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
```

**UI配置**:
```tsx
<div style={styles.controls}>
  <button onClick={handleAddEntity} style={styles.button}>
    + ノードを追加
  </button>
  <button onClick={handleAddRelation} style={styles.button}>
    + リレーションを追加
  </button>
  <button onClick={handleExport} style={styles.button}>
    📥 エクスポート
  </button>
  <button onClick={handleResetData} style={{ ...styles.button, backgroundColor: '#ff9800' }}>
    🔄 データをリセット
  </button>
</div>
```

**チェックリスト**:
- [ ] handleExport 関数実装
- [ ] エクスポートボタン追加
- [ ] エラーハンドリング実装
- [ ] ダウンロード動作確認

---

#### Task 1.2.3: Import機能UI実装
**ファイル**: `frontend/src/App.tsx`, `frontend/src/ImportDialog.tsx` (新規)

**ImportDialog コンポーネント作成**:
```typescript
// ImportDialog.tsx
import React, { useState } from 'react';

interface ImportDialogProps {
  onImport: (file: File, mode: 'merge' | 'replace') => Promise<void>;
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setLoading(true);
    try {
      await onImport(file, mode);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      alert('インポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <h2>データをインポート</h2>
        
        <div style={styles.section}>
          <label>ファイル選択:</label>
          <input type="file" accept=".json" onChange={handleFileChange} />
        </div>

        <div style={styles.section}>
          <label>インポートモード:</label>
          <div>
            <label>
              <input
                type="radio"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              追加（既存データを保持）
            </label>
            <label>
              <input
                type="radio"
                value="replace"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
              />
              置換（既存データを削除）
            </label>
          </div>
        </div>

        {mode === 'replace' && (
          <div style={styles.warning}>
            ⚠️ すべての既存データが削除されます。この操作は取り消せません。
          </div>
        )}

        <div style={styles.actions}>
          <button onClick={handleSubmit} disabled={loading} style={styles.button}>
            {loading ? 'インポート中...' : 'インポート'}
          </button>
          <button onClick={onClose} disabled={loading} style={styles.cancelButton}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    minWidth: '400px',
    maxWidth: '600px',
  },
  section: {
    marginBottom: '20px',
  },
  warning: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffc107',
    color: '#856404',
    padding: '12px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#4DA1FF',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#757575',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};
```

**App.tsx への統合**:
```typescript
// App.tsx
const [showImportDialog, setShowImportDialog] = useState(false);

const handleImport = async (file: File, mode: 'merge' | 'replace') => {
  const text = await file.text();
  const data = JSON.parse(text);
  
  const result = await importData(data, mode);
  
  await refetchEntities();
  await refetchRelations();
  
  alert(`インポート成功: ${result.imported_entities} エンティティ, ${result.imported_relations} リレーション`);
};

// ボタン追加
<button onClick={() => setShowImportDialog(true)} style={styles.button}>
  📤 インポート
</button>

// ダイアログ表示
{showImportDialog && (
  <ImportDialog
    onImport={handleImport}
    onClose={() => setShowImportDialog(false)}
  />
)}
```

**チェックリスト**:
- [ ] ImportDialog コンポーネント作成
- [ ] ファイル選択機能実装
- [ ] モード選択UI実装
- [ ] handleImport 関数実装
- [ ] JSON パース・バリデーション
- [ ] App.tsx へ統合
- [ ] エラーハンドリング実装
- [ ] 動作確認（merge/replace 両方）

---

### 1.3 テスト

#### Task 1.3.1: E2Eテスト実行
**テストシナリオ**:
1. データを追加（ノード2つ、リレーション1つ）
2. エクスポート実行
3. ダウンロードされたJSONファイルを確認
4. データをリセット
5. JSONファイルをインポート（merge モード）
6. データが復元されることを確認
7. さらにデータを追加
8. JSONファイルをインポート（replace モード）
9. 追加したデータが削除され、インポートデータのみになることを確認

**チェックリスト**:
- [ ] エクスポートテスト
- [ ] インポート（merge）テスト
- [ ] インポート（replace）テスト
- [ ] エラーケーステスト（不正なJSON）
- [ ] エラーケーステスト（不正なフォーマット）

---

## Phase 2: 検索・フィルタ機能 (Priority: High)

### 2.1 検索機能実装

#### Task 2.1.1: 検索UI追加
**ファイル**: `frontend/src/App.tsx`

**実装内容**:
```typescript
import { debounce } from 'lodash';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');

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

// フィルタリング
const filteredEntities = localEntities.filter(entity => {
  if (!debouncedQuery) return true;
  const query = debouncedQuery.toLowerCase();
  return (
    entity.name.toLowerCase().includes(query) ||
    entity.type.toLowerCase().includes(query) ||
    (entity.description || '').toLowerCase().includes(query)
  );
});

const filteredRelations = localRelations.filter(relation => {
  // ソースまたはターゲットがフィルタされたエンティティに含まれる場合のみ表示
  return (
    filteredEntities.some(e => e.id === relation.source_id) &&
    filteredEntities.some(e => e.id === relation.target_id)
  );
});
```

**UI配置**:
```tsx
<div style={styles.searchBar}>
  <input
    type="text"
    placeholder="🔍 ノードを検索..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    style={styles.searchInput}
  />
  {searchQuery && (
    <button onClick={() => setSearchQuery('')} style={styles.clearButton}>
      ×
    </button>
  )}
</div>
```

**チェックリスト**:
- [ ] lodash インストール（`npm install lodash @types/lodash`）
- [ ] 検索入力フィールド追加
- [ ] debounce 処理実装
- [ ] フィルタリングロジック実装
- [ ] クリアボタン追加
- [ ] 動作確認

---

#### Task 2.1.2: 検索結果のハイライト
**ファイル**: `frontend/src/Graph.tsx`

**実装内容**:
```typescript
interface GraphProps {
  // ... 既存のprops
  highlightedEntityIds?: Set<number>;
}

// ノードのスタイル適用
const getNodeOpacity = (entityId: number) => {
  if (!highlightedEntityIds || highlightedEntityIds.size === 0) {
    return 1.0;
  }
  return highlightedEntityIds.has(entityId) ? 1.0 : 0.3;
};
```

**チェックリスト**:
- [ ] highlightedEntityIds props 追加
- [ ] ノードの透明度制御実装
- [ ] エッジの透明度制御実装
- [ ] 動作確認

---

### 2.2 フィルタ機能実装

#### Task 2.2.1: 関係タイプフィルタUI
**ファイル**: `frontend/src/App.tsx`, `frontend/src/FilterPanel.tsx` (新規)

**FilterPanel コンポーネント作成**:
```typescript
// FilterPanel.tsx
import React from 'react';

interface FilterPanelProps {
  relationTypes: string[];
  visibleRelationTypes: Set<string>;
  onToggleRelationType: (type: string) => void;
  entityTypes: string[];
  visibleEntityTypes: Set<string>;
  onToggleEntityType: (type: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  relationTypes,
  visibleRelationTypes,
  onToggleRelationType,
  entityTypes,
  visibleEntityTypes,
  onToggleEntityType,
}) => {
  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <h3>表示する関係タイプ</h3>
        <div style={styles.checkboxGroup}>
          {relationTypes.map(type => (
            <label key={type} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={visibleRelationTypes.has(type)}
                onChange={() => onToggleRelationType(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>
      
      <div style={styles.section}>
        <h3>表示するノードタイプ</h3>
        <div style={styles.checkboxGroup}>
          {entityTypes.map(type => (
            <label key={type} style={styles.checkbox}>
              <input
                type="checkbox"
                checked={visibleEntityTypes.has(type)}
                onChange={() => onToggleEntityType(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles = {
  panel: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  section: {
    marginBottom: '16px',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
  },
};
```

**App.tsx への統合**:
```typescript
// 関係タイプの一覧を取得
const relationTypes = Array.from(new Set(localRelations.map(r => r.relation_type)));
const entityTypes = Array.from(new Set(localEntities.map(e => e.type)));

const [visibleRelationTypes, setVisibleRelationTypes] = useState<Set<string>>(new Set());
const [visibleEntityTypes, setVisibleEntityTypes] = useState<Set<string>>(new Set());

// 初期化
useEffect(() => {
  setVisibleRelationTypes(new Set(relationTypes));
}, [localRelations]);

useEffect(() => {
  setVisibleEntityTypes(new Set(entityTypes));
}, [localEntities]);

// フィルタリング
const filteredByTypeEntities = filteredEntities.filter(entity =>
  visibleEntityTypes.has(entity.type)
);

const filteredByTypeRelations = filteredRelations.filter(relation =>
  visibleRelationTypes.has(relation.relation_type) &&
  filteredByTypeEntities.some(e => e.id === relation.source_id) &&
  filteredByTypeEntities.some(e => e.id === relation.target_id)
);

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
```

**チェックリスト**:
- [ ] FilterPanel コンポーネント作成
- [ ] 関係タイプ一覧取得ロジック
- [ ] エンティティタイプ一覧取得ロジック
- [ ] チェックボックスUI実装
- [ ] フィルタリングロジック実装
- [ ] App.tsx へ統合
- [ ] 動作確認

---

## Phase 3: スタイリング改善 (Priority: Medium)

### 3.1 デザインシステム導入

#### Task 3.1.1: CSS変数定義
**ファイル**: `frontend/src/index.css` (または新規 `frontend/src/theme.css`)

**実装内容**:
```css
:root {
  /* プライマリーカラー */
  --color-primary: #4DA1FF;
  --color-primary-dark: #3A7ACD;
  --color-primary-light: #7BBFFF;

  /* セマンティックカラー */
  --color-success: #4CAF50;
  --color-warning: #FF9800;
  --color-danger: #F44336;
  --color-info: #2196F3;

  /* ニュートラルカラー */
  --color-bg: #FFFFFF;
  --color-bg-secondary: #F5F5F5;
  --color-border: #E0E0E0;
  --color-text: #212121;
  --color-text-secondary: #757575;

  /* エンティティタイプ別カラー */
  --color-entity-person: #4DA1FF;
  --color-entity-organization: #9C27B0;
  --color-entity-place: #4CAF50;
  --color-entity-other: #757575;

  /* 関係タイプ別カラー */
  --color-relation-friend: #4CAF50;
  --color-relation-parent: #2196F3;
  --color-relation-boss: #FF9800;
  --color-relation-enemy: #F44336;
  --color-relation-other: #757575;

  /* スペーシング */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* ボーダー半径 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* シャドウ */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.16);
  --shadow-lg: 0 10px 20px rgba(0, 0, 0, 0.19);
}
```

**チェックリスト**:
- [ ] CSS変数定義
- [ ] index.css へインポート
- [ ] 既存スタイルをCSS変数に置き換え

---

#### Task 3.1.2: ノード・エッジスタイル改善
**ファイル**: `frontend/src/Graph.tsx`

**実装内容**:
```typescript
// カラーマッピング
const ENTITY_COLOR_MAP: Record<string, string> = {
  'person': 'var(--color-entity-person)',
  'organization': 'var(--color-entity-organization)',
  'place': 'var(--color-entity-place)',
  'other': 'var(--color-entity-other)',
};

const RELATION_COLOR_MAP: Record<string, string> = {
  'friend': 'var(--color-relation-friend)',
  'parent': 'var(--color-relation-parent)',
  'boss': 'var(--color-relation-boss)',
  'enemy': 'var(--color-relation-enemy)',
  'other': 'var(--color-relation-other)',
};

const getNodeColor = (type: string): string => {
  return ENTITY_COLOR_MAP[type] || ENTITY_COLOR_MAP['other'];
};

const getEdgeColor = (relationType: string): string => {
  return RELATION_COLOR_MAP[relationType] || RELATION_COLOR_MAP['other'];
};
```

**チェックリスト**:
- [ ] カラーマッピング定義
- [ ] getNodeColor 関数実装
- [ ] getEdgeColor 関数実装
- [ ] D3.js 描画コードに適用
- [ ] 動作確認

---

### 3.2 レスポンシブデザイン

#### Task 3.2.1: メディアクエリ追加
**ファイル**: `frontend/src/App.tsx`, `frontend/src/index.css`

**実装内容**:
```css
/* デスクトップ */
@media (min-width: 1200px) {
  .app-container {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--spacing-lg);
  }
}

/* タブレット */
@media (min-width: 768px) and (max-width: 1199px) {
  .app-container {
    padding: var(--spacing-md);
  }
  
  .controls {
    flex-wrap: wrap;
  }
}

/* モバイル */
@media (max-width: 767px) {
  .app-container {
    padding: var(--spacing-sm);
  }
  
  .controls {
    flex-direction: column;
  }
  
  .controls button {
    width: 100%;
  }
  
  .data-panel {
    flex-direction: column;
  }
}
```

**チェックリスト**:
- [ ] CSS クラス付与
- [ ] メディアクエリ実装
- [ ] 各デバイスサイズで動作確認

---

### 3.3 アクセシビリティ改善

#### Task 3.3.1: ARIA属性追加
**ファイル**: 各コンポーネント

**実装内容**:
```tsx
<button
  onClick={handleAddEntity}
  aria-label="ノードを追加"
  aria-describedby="add-entity-help"
>
  + ノードを追加
</button>

<input
  type="text"
  placeholder="🔍 ノードを検索..."
  aria-label="ノード検索"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>
```

**チェックリスト**:
- [ ] ボタンに aria-label 追加
- [ ] 入力フィールドに aria-label 追加
- [ ] モーダルに role 属性追加
- [ ] キーボード操作確認（Tab, Enter, Esc）
- [ ] スクリーンリーダーで確認（可能であれば）

---

## Phase 4: パフォーマンス改善 (Priority: Low)

### 4.1 検索のデバウンス

#### Task 4.1.1: デバウンス実装
**ステータス**: Phase 2.1 で完了

---

### 4.2 リストの仮想化（オプション）

#### Task 4.2.1: react-window 導入検討
**条件**: ノード数が100件を超える場合に検討

**実装方針**:
```bash
npm install react-window @types/react-window
```

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={filteredEntities.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      {/* エンティティアイテム */}
    </div>
  )}
</FixedSizeList>
```

**チェックリスト**:
- [ ] パフォーマンス測定（100件以上のデータで）
- [ ] 必要に応じて react-window 導入
- [ ] 仮想化リスト実装
- [ ] 動作確認

---

## Phase 5: ドキュメント整備 (Priority: High)

### 5.1 README.md 拡張

#### Task 5.1.1: 使い方ガイド追加
**ファイル**: `README.md`

**追加セクション**:
```markdown
## 使い方

### 基本操作

#### 1. ノードの追加
1. [+ ノードを追加] ボタンをクリック
2. 名前、タイプ、説明を入力
3. [保存] をクリック

#### 2. リレーションの追加
1. [+ リレーションを追加] ボタンをクリック
2. ソースとターゲットのノードを選択
3. リレーションタイプを選択
4. [保存] をクリック

#### 3. データのエクスポート
1. [📥 エクスポート] ボタンをクリック
2. JSON ファイルがダウンロードされます

#### 4. データのインポート
1. [📤 インポート] ボタンをクリック
2. JSON ファイルを選択
3. インポートモード（追加/置換）を選択
4. [インポート] をクリック

#### 5. 検索
1. 検索ボックスにキーワードを入力
2. ノード名、タイプ、説明から検索されます
3. 一致するノードがハイライトされます

#### 6. フィルタ
1. 表示したい関係タイプ・ノードタイプをチェック
2. グラフが自動的に更新されます
```

**チェックリスト**:
- [ ] 使い方ガイド追加
- [ ] スクリーンショット撮影・追加
- [ ] トラブルシューティング追加

---

#### Task 5.1.2: トラブルシューティング追加
**ファイル**: `README.md`

**追加セクション**:
```markdown
## トラブルシューティング

### よくある問題

#### Q: グラフが表示されない
**A**: 以下を確認してください：
- ブラウザのコンソールでエラーを確認
- バックエンドが起動しているか確認（`docker compose ps`）
- `http://localhost:8000/docs` にアクセスしてAPI が応答するか確認

#### Q: データが保存されない
**A**: 以下を確認してください：
- データベースの接続を確認
- `docker compose logs backend` でバックエンドのログを確認
- ブラウザの開発者ツールでネットワークエラーを確認

#### Q: インポートが失敗する
**A**: 以下を確認してください：
- JSON ファイルの形式が正しいか確認
- エクスポートされたファイルと同じ構造か確認
- バージョン情報が含まれているか確認

#### Q: Docker Compose の起動に失敗する
**A**: 以下を試してください：
```bash
# コンテナを停止・削除
docker compose down

# イメージを再ビルド
docker compose build --no-cache

# 再起動
docker compose up -d
```
```

**チェックリスト**:
- [ ] トラブルシューティングセクション追加
- [ ] よくある問題のQ&A作成

---

### 5.2 API リファレンス

#### Task 5.2.1: API ドキュメント作成
**ファイル**: `docs/api-reference.md` (新規)

**内容**: feature7_1_design.md の「3.2 API リファレンス」を参照

**チェックリスト**:
- [ ] docs/ ディレクトリ作成
- [ ] api-reference.md 作成
- [ ] 全エンドポイントの仕様を記載
- [ ] リクエスト・レスポンス例を記載

---

### 5.3 アーキテクチャドキュメント

#### Task 5.3.1: アーキテクチャ図作成
**ファイル**: `docs/architecture.md` (新規)

**内容**: feature7_1_design.md の「3.3 アーキテクチャドキュメント」を参照

**チェックリスト**:
- [ ] architecture.md 作成
- [ ] システム構成図（Mermaid）追加
- [ ] コンポーネント説明追加
- [ ] データフロー図追加

---

### 5.4 コントリビューションガイド

#### Task 5.4.1: CONTRIBUTING.md 作成
**ファイル**: `CONTRIBUTING.md` (新規)

**内容**: feature7_1_design.md の「3.4 コントリビューションガイド」を参照

**チェックリスト**:
- [ ] CONTRIBUTING.md 作成
- [ ] 開発環境セットアップ手順
- [ ] コーディング規約
- [ ] プルリクエストガイドライン

---

### 5.5 スクリーンショット

#### Task 5.5.1: スクリーンショット撮影
**ディレクトリ**: `docs/images/` (新規)

**撮影対象**:
- メイン画面
- ノード追加モーダル
- リレーション追加モーダル
- エクスポート機能
- インポート機能
- 検索機能
- フィルタ機能

**チェックリスト**:
- [ ] docs/images/ ディレクトリ作成
- [ ] スクリーンショット撮影
- [ ] README.md へ埋め込み

---

## 進捗管理

### 完了済み
- [ ] Phase 1: エクスポート/インポート機能
- [ ] Phase 2: 検索・フィルタ機能
- [ ] Phase 3: スタイリング改善
- [ ] Phase 4: パフォーマンス改善
- [ ] Phase 5: ドキュメント整備

### 次のステップ
実装を開始する際は、Phase 1 から順に進めることを推奨します。
各 Task の実装後に動作確認を行い、問題がないことを確認してから次に進んでください。
