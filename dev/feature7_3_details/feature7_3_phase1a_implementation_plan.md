# Feature 7.3 Phase 1a 実装計画書 - バージョン管理（基本）

## 1. 概要

Phase 1aでは、relation-mapアプリケーションに基本的なバージョン管理機能を実装します。
グラフの各状態をスナップショットとして記録し、ユーザーが過去のバージョンに復元したり、Undo/Redoを実行できるようにします。

**目標期間**: 3-4 日  
**依存関係**: なし（既存の Entity/Relation 機構をベースに構築）

---

## 2. 実装詳細

### 2.1 バックエンド実装

#### 2.1.1 データベーススキーマ変更

**新規テーブル: `versions`**

```sql
CREATE TABLE versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version_number INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    snapshot JSON NOT NULL,
    changes JSON,
    created_by TEXT DEFAULT 'system'
);
```

**実装ステップ:**
1. `backend/models.py` に `Version` SQLAlchemy モデルを追加
2. `backend/db.py` の `init_db()` 関数を更新（`Version` テーブル作成）
3. `backend/schemas.py` に `VersionSchema` Pydantic モデルを追加

#### 2.1.2 Version モデル実装

**ファイル**: `backend/models.py`

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from datetime import datetime

class Version(Base):
    __tablename__ = "versions"
    
    id = Column(Integer, primary_key=True, index=True)
    version_number = Column(Integer, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    description = Column(String, nullable=True)
    snapshot = Column(JSON, nullable=False)
    changes = Column(JSON, nullable=True)
    created_by = Column(String, default="system")
```

**ファイル**: `backend/schemas.py`

```python
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any

class VersionSnapshot(BaseModel):
    entities: List[Dict[str, Any]]
    relations: List[Dict[str, Any]]
    relationTypes: List[Dict[str, Any]]

class VersionSchema(BaseModel):
    id: Optional[int] = None
    version_number: int
    created_at: datetime
    description: Optional[str] = None
    snapshot: VersionSnapshot
    created_by: str = "system"
    
    class Config:
        from_attributes = True

class VersionListItemSchema(BaseModel):
    id: int
    version_number: int
    created_at: datetime
    description: Optional[str] = None
    created_by: str
    
    class Config:
        from_attributes = True
```

#### 2.1.3 バージョン管理サービス実装

**ファイル**: `backend/version_service.py` （新規作成）

```python
from sqlalchemy.orm import Session
from models import Version, Entity, Relation, RelationType
from schemas import VersionSnapshot
from datetime import datetime
from typing import Dict, Any, List
import json

class VersionService:
    """バージョン管理のビジネスロジックを担当"""
    
    @staticmethod
    def get_current_snapshot(db: Session) -> VersionSnapshot:
        """現在のグラフ状態をスナップショットとして取得"""
        entities = db.query(Entity).all()
        relations = db.query(Relation).all()
        relation_types = db.query(RelationType).all()
        
        return {
            "entities": [
                {
                    "id": e.id,
                    "label": e.label,
                    "properties": e.properties or {}
                }
                for e in entities
            ],
            "relations": [
                {
                    "id": r.id,
                    "from": r.from_entity_id,
                    "to": r.to_entity_id,
                    "type": r.type_name,
                    "properties": r.properties or {}
                }
                for r in relations
            ],
            "relationTypes": [
                {
                    "id": rt.id,
                    "name": rt.name,
                    "color": rt.color
                }
                for rt in relation_types
            ]
        }
    
    @staticmethod
    def create_version(
        db: Session,
        description: str = None,
        created_by: str = "system"
    ) -> Version:
        """新しいバージョンを作成"""
        snapshot = VersionService.get_current_snapshot(db)
        
        # 最新のバージョン番号を取得
        latest_version = db.query(Version).order_by(Version.version_number.desc()).first()
        next_version_number = (latest_version.version_number + 1) if latest_version else 1
        
        version = Version(
            version_number=next_version_number,
            description=description or f"Version {next_version_number}",
            snapshot=snapshot,
            created_by=created_by
        )
        db.add(version)
        db.commit()
        db.refresh(version)
        return version
    
    @staticmethod
    def get_all_versions(db: Session) -> List[Version]:
        """全バージョンを取得（新しい順）"""
        return db.query(Version).order_by(Version.version_number.desc()).all()
    
    @staticmethod
    def get_version(db: Session, version_id: int) -> Version:
        """特定のバージョンを取得"""
        return db.query(Version).filter(Version.id == version_id).first()
    
    @staticmethod
    def restore_version(
        db: Session,
        version_id: int,
        create_backup: bool = True
    ) -> Version:
        """指定バージョンに復元"""
        # バックアップを作成（オプション）
        if create_backup:
            VersionService.create_version(
                db,
                description=f"Backup before restore",
                created_by="system"
            )
        
        # 復元対象のバージョンを取得
        target_version = VersionService.get_version(db, version_id)
        if not target_version:
            raise ValueError(f"Version {version_id} not found")
        
        snapshot = target_version.snapshot
        
        # 既存のエンティティ・リレーションを削除
        db.query(Relation).delete()
        db.query(Entity).delete()
        db.commit()
        
        # スナップショットからデータを復元
        for entity_data in snapshot.get("entities", []):
            entity = Entity(
                id=entity_data["id"],
                label=entity_data["label"],
                properties=entity_data.get("properties", {})
            )
            db.add(entity)
        
        for relation_data in snapshot.get("relations", []):
            relation = Relation(
                id=relation_data["id"],
                from_entity_id=relation_data["from"],
                to_entity_id=relation_data["to"],
                type_name=relation_data["type"],
                properties=relation_data.get("properties", {})
            )
            db.add(relation)
        
        db.commit()
        
        # 復元後の新しいバージョンを作成
        restored_version = VersionService.create_version(
            db,
            description=f"Restored from version {target_version.version_number}",
            created_by="system"
        )
        
        return restored_version
```

#### 2.1.4 API エンドポイント実装

**ファイル**: `backend/api.py` に以下を追加

```python
from fastapi import APIRouter, HTTPException
from version_service import VersionService
from schemas import VersionListItemSchema, VersionSchema

router = APIRouter()

# バージョン関連エンドポイント
@router.get("/api/versions", response_model=List[VersionListItemSchema])
def get_versions(db: Session = Depends(get_db)):
    """全バージョン一覧を取得"""
    versions = VersionService.get_all_versions(db)
    return versions

@router.get("/api/versions/{version_id}", response_model=VersionSchema)
def get_version(version_id: int, db: Session = Depends(get_db)):
    """特定バージョンを取得"""
    version = VersionService.get_version(db, version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    return version

@router.post("/api/versions/{version_id}/restore", response_model=dict)
def restore_version(
    version_id: int,
    create_backup: bool = True,
    db: Session = Depends(get_db)
):
    """指定バージョンに復元"""
    try:
        restored_version = VersionService.restore_version(db, version_id, create_backup)
        return {
            "message": f"Restored to version {restored_version.version_number}",
            "new_version_id": restored_version.id
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/api/versions/create-checkpoint", response_model=VersionSchema)
def create_checkpoint(
    description: str = None,
    db: Session = Depends(get_db)
):
    """現在の状態をチェックポイントとして保存"""
    version = VersionService.create_version(db, description, "user")
    return version

# Undo/Redo（簡易実装）
undo_stack = []  # クライアント側で管理するため、サーバー側は簡易的
redo_stack = []

@router.post("/api/undo")
def undo(db: Session = Depends(get_db)):
    """最後の操作を取り消す"""
    # NOTE: フル実装にはクライアント側での状態管理が必要
    # ここでは簡易的な実装とする
    versions = VersionService.get_all_versions(db)
    if len(versions) >= 2:
        # 最新バージョンの1つ前に復元
        target_version = versions[1]
        VersionService.restore_version(db, target_version.id, create_backup=False)
        return {"message": "Undo successful"}
    raise HTTPException(status_code=400, detail="No undo available")

@router.post("/api/redo")
def redo():
    """最後の取り消しを再適用"""
    # NOTE: full Redo 実装にはクライアント側での Redo スタック管理が必要
    raise HTTPException(status_code=501, detail="Redo not yet implemented")
```

#### 2.1.5 既存エンドポイントの修正

Entity/Relation 作成・更新・削除時に自動的にバージョンを作成するよう修正：

**ファイル**: `backend/api.py`

Entity/Relation の CRUD エンドポイントに以下を追加：

```python
# 例: Entity 作成の後に

@router.post("/api/entities/", response_model=EntitySchema)
def create_entity(entity: EntitySchema, db: Session = Depends(get_db)):
    db_entity = Entity(**entity.dict())
    db.add(db_entity)
    db.commit()
    db.refresh(db_entity)
    
    # バージョンを自動作成
    VersionService.create_version(db, f"Added entity: {entity.label}", "system")
    
    return db_entity
```

同様に `update_entity`, `delete_entity`, 関連エンドポイントも修正。

---

### 2.2 フロントエンド実装

#### 2.2.1 API クライアント拡張

**ファイル**: `frontend/src/api/versionApi.ts` （新規作成）

```typescript
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface VersionInfo {
  id: number;
  version_number: number;
  created_at: string;
  description?: string;
  created_by: string;
}

export interface VersionSnapshot {
  entities: any[];
  relations: any[];
  relationTypes: any[];
}

export interface FullVersion {
  id: number;
  version_number: number;
  created_at: string;
  description?: string;
  snapshot: VersionSnapshot;
  created_by: string;
}

class VersionAPI {
  async getVersions(): Promise<VersionInfo[]> {
    const response = await axios.get(`${API_BASE}/api/versions`);
    return response.data;
  }

  async getVersion(versionId: number): Promise<FullVersion> {
    const response = await axios.get(`${API_BASE}/api/versions/${versionId}`);
    return response.data;
  }

  async createCheckpoint(description: string): Promise<VersionInfo> {
    const response = await axios.post(`${API_BASE}/api/versions/create-checkpoint`, null, {
      params: { description }
    });
    return response.data;
  }

  async restoreVersion(versionId: number, createBackup: boolean = true): Promise<any> {
    const response = await axios.post(
      `${API_BASE}/api/versions/${versionId}/restore`,
      null,
      { params: { create_backup: createBackup } }
    );
    return response.data;
  }

  async undo(): Promise<any> {
    const response = await axios.post(`${API_BASE}/api/undo`);
    return response.data;
  }

  async redo(): Promise<any> {
    const response = await axios.post(`${API_BASE}/api/redo`);
    return response.data;
  }
}

export default new VersionAPI();
```

#### 2.2.2 React Context による状態管理

**ファイル**: `frontend/src/context/HistoryContext.tsx` （新規作成）

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import versionAPI, { VersionInfo } from '../api/versionApi';

interface HistoryContextType {
  versions: VersionInfo[];
  isLoading: boolean;
  loadVersions: () => Promise<void>;
  createCheckpoint: (description: string) => Promise<void>;
  restoreVersion: (versionId: number) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await versionAPI.getVersions();
      setVersions(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCheckpoint = useCallback(async (description: string) => {
    await versionAPI.createCheckpoint(description);
    await loadVersions();
  }, [loadVersions]);

  const restoreVersion = useCallback(async (versionId: number) => {
    await versionAPI.restoreVersion(versionId);
    await loadVersions();
  }, [loadVersions]);

  const undo = useCallback(async () => {
    await versionAPI.undo();
    await loadVersions();
  }, [loadVersions]);

  const redo = useCallback(async () => {
    await versionAPI.redo();
    await loadVersions();
  }, [loadVersions]);

  return (
    <HistoryContext.Provider
      value={{
        versions,
        isLoading,
        loadVersions,
        createCheckpoint,
        restoreVersion,
        undo,
        redo
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = () => {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used inside HistoryProvider');
  }
  return context;
};
```

#### 2.2.3 HistoryPanel コンポーネント

**ファイル**: `frontend/src/components/HistoryPanel.tsx` （新規作成）

```typescript
import React, { useEffect, useState } from 'react';
import { useHistory } from '../context/HistoryContext';
import './HistoryPanel.css';

const HistoryPanel: React.FC = () => {
  const { versions, isLoading, loadVersions, createCheckpoint, restoreVersion } = useHistory();
  const [showInput, setShowInput] = useState(false);
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreateCheckpoint = async () => {
    if (description.trim()) {
      await createCheckpoint(description);
      setDescription('');
      setShowInput(false);
    }
  };

  const handleRestore = async (versionId: number) => {
    if (window.confirm('Are you sure you want to restore to this version?')) {
      await restoreVersion(versionId);
    }
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3>Version History</h3>
        <button className="btn-small" onClick={() => setShowInput(!showInput)}>
          + Checkpoint
        </button>
      </div>

      {showInput && (
        <div className="checkpoint-input">
          <input
            type="text"
            placeholder="Checkpoint description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button onClick={handleCreateCheckpoint}>Save</button>
          <button onClick={() => setShowInput(false)}>Cancel</button>
        </div>
      )}

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="history-list">
          {versions.map((version) => (
            <div key={version.id} className="history-item">
              <div className="version-info">
                <span className="version-number">v{version.version_number}</span>
                <span className="description">{version.description}</span>
                <span className="timestamp">{new Date(version.created_at).toLocaleString()}</span>
              </div>
              <button
                className="btn-restore"
                onClick={() => handleRestore(version.id)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
```

#### 2.2.4 スタイル

**ファイル**: `frontend/src/components/HistoryPanel.css`

```css
.history-panel {
  border-left: 1px solid #ddd;
  padding: 15px;
  width: 250px;
  background-color: #f9f9f9;
  max-height: 600px;
  overflow-y: auto;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

.history-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid #ccc;
  background-color: white;
  cursor: pointer;
  border-radius: 3px;
}

.checkpoint-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.checkpoint-input input {
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 3px;
}

.checkpoint-input button {
  padding: 6px;
  border: 1px solid #ccc;
  background-color: #f0f0f0;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background-color: white;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.version-number {
  font-weight: bold;
  color: #333;
}

.description {
  color: #666;
  word-break: break-word;
}

.timestamp {
  font-size: 11px;
  color: #999;
}

.btn-restore {
  padding: 6px;
  border: 1px solid #ccc;
  background-color: #e3f2fd;
  color: #1976d2;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
}

.btn-restore:hover {
  background-color: #bbdefb;
}
```

#### 2.2.5 App コンポーネントの更新

**ファイル**: `frontend/src/App.tsx` を更新

```typescript
import { HistoryProvider } from './context/HistoryContext';
import HistoryPanel from './components/HistoryPanel';

function App() {
  return (
    <HistoryProvider>
      <div className="app-container">
        <main>
          {/* 既存のコンテンツ */}
        </main>
        <aside>
          <HistoryPanel />
        </aside>
      </div>
    </HistoryProvider>
  );
}
```

---

## 3. テスト計画

### 3.1 バックエンドユニットテスト

**ファイル**: `backend/tests/test_versions.py` （新規作成）

主要テストケース:
- `test_create_version`: バージョン作成のテスト
- `test_get_all_versions`: バージョン一覧取得のテスト
- `test_restore_version`: バージョン復元のテスト
- `test_version_snapshot_contains_entities`: スナップショットにエンティティが含まれるテスト
- `test_version_snapshot_contains_relations`: スナップショットにリレーションが含まれるテスト
- `test_auto_version_on_entity_create`: エンティティ作成時に自動バージョンが作成されるテスト
- `test_auto_version_on_entity_delete`: エンティティ削除時に自動バージョンが作成されるテスト
- `test_auto_version_on_relation_create`: リレーション作成時に自動バージョンが作成されるテスト

### 3.2 フロントエンドユニットテスト

**ファイル**: `frontend/src/components/__tests__/HistoryPanel.test.tsx` （新規作成）

主要テストケース:
- `test_renders_history_panel`: HistoryPanel レンダリングのテスト
- `test_displays_versions`: バージョン一覧表示のテスト
- `test_create_checkpoint_button`: チェックポイント作成ボタンのテスト
- `test_restore_version_button`: リストア ボタンのテスト

### 3.3 E2E テスト

**ファイル**: `e2e/history.spec.ts` （新規作成）

シナリオ:
1. アプリケーション起動
2. エンティティ作成
3. バージョン履歴を確認
4. チェックポイント作成
5. 新しいエンティティを追加
6. 古いバージョンに復元
7. データが復元されていることを確認

---

## 4. 実装手順（推奨順序）

### Week 1: バックエンド実装
1. **Day 1**: Version モデル・スキーマ実装、`version_service.py` 作成
2. **Day 2**: API エンドポイント実装、既存エンドポイントの修正
3. **Day 3**: バックエンドテスト実装・実行、バグ修正

### Week 2: フロントエンド実装
1. **Day 1**: API クライアント、Context 実装
2. **Day 2**: HistoryPanel コンポーネント実装
3. **Day 3**: フロントエンドテスト実装、UI 微調整

### Week 3: テスト・統合
1. **Day 1**: E2E テスト実装
2. **Day 2**: 統合テスト、バグ修正
3. **Day 3**: ドキュメント更新

---

## 5. マイグレーション戦略

### 5.1 既存インストール へのマイグレーション

```python
# backend/db.py に以下を追加

def migrate_versions():
    """既存のインストールをマイグレーション"""
    db_url = DATABASE_URL
    engine = create_engine(db_url)
    Base.metadata.create_all(bind=engine)
    
    with Session(engine) as session:
        # 既存データがあれば、初期バージョンを作成
        entity_count = session.query(Entity).count()
        if entity_count > 0 and session.query(Version).count() == 0:
            VersionService.create_version(
                session,
                "Migrated from previous version",
                "migration"
            )
```

### 5.2 起動時の自動マイグレーション

`backend/main.py` の起動処理で `migrate_versions()` を呼び出す。

---

## 6. 開発環境セットアップ

### 6.1 バックエンド依存パッケージ

既存の `backend/requirements.txt` に追加する必要はありません（SQLAlchemy、Pydantic は既に含まれている）。

### 6.2 フロントエンド依存パッケージ

既存の依存パッケージで充分です（axios、React は既に含まれている）。

---

## 7. 品質基準

- **テストカバレッジ**: 80% 以上
- **API レスポンス時間**: 200ms 以下
- **UI レスポンシブネス**: ボタンクリックから API 呼び出しまで 100ms 以下
- **ドキュメント**: すべての API エンドポイント、コンポーネント を記載

---

## 8. 参考資料

- [SQLAlchemy JSON Type](https://docs.sqlalchemy.org/en/14/dialects/sqlite.html#json-support)
- [FastAPI Depends](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
