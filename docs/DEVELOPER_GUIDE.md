# relation-map 開発ガイド

relation-mapの開発環境構築、コード構成、テスト方法などをまとめたドキュメントです。

---

## 目次

1. [開発環境セットアップ](#開発環境セットアップ)
2. [プロジェクト構成](#プロジェクト構成)
3. [バックエンド開発](#バックエンド開発)
4. [フロントエンド開発](#フロントエンド開発)
5. [テスト](#テスト)
6. [デプロイ](#デプロイ)
7. [トラブルシューティング](#トラブルシューティング)

---

## 開発環境セットアップ

### 前提条件

- Docker & Docker Compose
- Git
- オプション: Python 3.11+ (ローカル開発用)
- オプション: Node.js 20+ (ローカル開発用)

### Docker Compose での起動

```bash
# リポジトリをクローン
git clone https://github.com/yourname/relation-map.git
cd relation-map

# 全サービスを起動（自動ビルド）
docker compose up --build -d

# ログ確認
docker compose logs -f

# 特定サービスのログ
docker compose logs -f backend
docker compose logs -f frontend

# 停止
docker compose down

# データベースもリセット
docker compose down -v
docker compose up -d
```

### ローカル開発（Docker なし）

#### バックエンド

```bash
cd backend

# Python 3.11+ の環境を確認
python --version

# 依存関係をインストール
pip install -r requirements.txt

# データベース環境変数を設定
export POSTGRES_USER=user
export POSTGRES_PASSWORD=password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export POSTGRES_DB=relationmap

# PostgreSQL が起動しているか確認し、uvicorn で起動
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### フロントエンド

```bash
cd frontend

# Node.js 20+ を確認
node --version

# 依存関係をインストール
npm install

# 開発サーバー起動
npm start

# http://localhost:3000 でアクセス可能
```

---

## プロジェクト構成

```
relation-map/
│
├── backend/
│   ├── api.py              # FastAPI ルーター・エンドポイント定義
│   ├── main.py             # アプリ初期化・CORS設定・DB初期化
│   ├── models.py           # SQLAlchemy ORM モデル定義
│   ├── schemas.py          # Pydantic バリデーション スキーマ
│   ├── db.py               # DB接続・セッション管理
│   ├── requirements.txt     # Python 依存関係
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # メイン アプリ コンポーネント
│   │   ├── Graph.tsx            # D3.js グラフ ビジュアライゼーション
│   │   ├── EntityModal.tsx      # ノード作成・編集 フォーム
│   │   ├── RelationModal.tsx    # リレーション作成・編集 フォーム
│   │   ├── TypeManagementDialog.tsx  # タイプ管理 ダイアログ
│   │   ├── ImportDialog.tsx     # インポート ダイアログ
│   │   ├── api.ts              # API クライアント関数
│   │   ├── sampleData.ts       # デモ用サンプルデータ
│   │   ├── types.d.ts          # TypeScript 型定義
│   │   └── index.tsx           # エントリポイント
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── dev/
│   ├── design.md                        # 開発ステップ・ロードマップ
│   ├── feature7_1_details/
│   │   ├── feature7_1_design.md         # 機能7.1 設計書
│   │   ├── feature7_1_implementation_plan.md
│   │   └── feature7_1_implementation_summary.md
│   └── test_scripts/                    # テストスクリプト
│
├── docs/
│   ├── API_REFERENCE.md                 # API仕様書
│   └── DEVELOPER_GUIDE.md              # このファイル
│
├── docker-compose.yml
├── README.md
└── LICENSE
```

---

## バックエンド開発

### ファイル説明

#### main.py
- FastAPI アプリケーションの初期化
- CORS設定（全許可、本番環境では調整）
- 起動時の DB テーブル作成
- `on_startup` イベントで DB 接続確認

#### api.py
- すべての REST エンドポイント定義
- ビジネスロジック実装
- エラーハンドリング
- **重要**: タイプ管理エンドポイントは CRUD エンドポイントより先に定義する（FastAPI のルーティング順序のため）

#### models.py
- SQLAlchemy ORM モデル
- Entity, Relation, EntityType, RelationType テーブル定義
- リレーション・カスケード削除設定

#### schemas.py
- Pydantic v2 バリデーション スキーマ
- EntityCreate/EntityImport, RelationCreate/RelationImport 分離
- 全モデルで `model_config = ConfigDict(from_attributes=True)` を使用

#### db.py
- PostgreSQL 接続設定
- SessionLocal セッション生成関数
- エコシステム環境変数から設定値を読み込み

### 開発時の注意点

#### Pydantic v2 対応
```python
# ❌ 古い方法（Pydantic v1）
class Entity(BaseModel):
    class Config:
        orm_mode = True

entity.dict()
Entity.from_orm(db_entity)

# ✅ 新しい方法（Pydantic v2）
class Entity(BaseModel):
    model_config = ConfigDict(from_attributes=True)

entity.model_dump()
Entity.model_validate(db_entity)
```

#### タイプ管理エンドポイントのルーティング
```python
# すべてのタイプ管理エンドポイントを CRUD エンドポイントより BEFORE に配置

# ✅ 正しい順序
@router.get("/entities/types")  # より詳細
def list_entity_types():
    ...

@router.get("/entities/{entity_id}")  # より一般的
def read_entity(entity_id: int):
    ...

# ❌ 間違った順序
@router.get("/entities/{entity_id}")  # /{entity_id} が優先
def read_entity(entity_id: int):
    ...

@router.get("/entities/types")  # "types" が数字に変換されようとしてエラー
def list_entity_types():
    ...
```

#### エラーハンドリングのベストプラクティス
```python
try:
    # ビジネスロジック
    database.commit()
    return {"ok": True, ...}
except HTTPException:
    raise  # HTTPException はそのまま伝播
except Exception as e:
    database.rollback()  # トランザクション ロールバック
    raise HTTPException(status_code=500, detail=f"Failed: {str(e)}")
```

---

## フロントエンド開発

### ファイル説明

#### App.tsx
- メイン アプリケーション コンポーネント
- グローバル な状態管理（entities, relations, filters など）
- サイドバー レイアウト
- 検索・フィルタロジック
- 3つの主要ダイアログを管理

#### Graph.tsx
- D3.js を使用したグラフ ビジュアライゼーション
- ノード・エッジの描画
- ドラッグ・ズーム・パン機能
- ノードクリック時のコールバック

#### EntityModal.tsx / RelationModal.tsx
- フォーム コンポーネント
- 作成・編集モード
- バリデーション
- タイプの select 要素での管理

#### TypeManagementDialog.tsx
- タイプ管理 UI
- 使用数の集計と表示
- 追加・編集・削除機能
- 確認ダイアログ

#### ImportDialog.tsx
- ファイル選択
- merge/replace モード選択
- エラーメッセージ表示

#### api.ts
- fetchers と hooks を含む API クライアント
- CRUD 関数
- タイプ管理関数
- エラーハンドリング

### 開発時の注意点

#### useMemo によるパフォーマンス最適化
```typescript
// ✅ フィルタリングが再計算されるのは依存配列の値が変わったときだけ
const filteredEntities = useMemo(() => {
  return localEntities.filter(e => 
    e.name.includes(debouncedQuery) &&
    visibleEntityTypes.has(e.type)
  );
}, [localEntities, debouncedQuery, visibleEntityTypes]);

// ❌ 毎回 render で再計算される可能性
const filteredEntities = localEntities.filter(e => 
  e.name.includes(debouncedQuery)
);
```

#### Debounce による検索パフォーマンス
```typescript
// ✅ 300ms のデバウンスで過度な再描画を防止
const debouncedQuery = useMemo(
  () => debounce((q: string) => setDebouncedQuery(q), 300),
  []
);

useEffect(() => {
  debouncedQuery(searchQuery);
}, [searchQuery, debouncedQuery]);
```

#### TypeScript の型安全性
```typescript
// ✅ 型定義で IDE のサポートと型チェック
type ModalState = 'closed' | 'addEntity' | 'editEntity' | 'addRelation' | 'editRelation';

// ✅ Props の型定義
interface Props {
  entities: Entity[];
  onSave: (data: Omit<Entity, 'id'>) => Promise<void>;
}

// ❌ any を避ける
const handleClick = (e: any) => { ... }  // ❌
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... }  // ✅
```

---

## テスト

### バックエンド テスト（pytest）

```bash
cd backend

# 依存関係
pip install pytest pytest-asyncio

# テスト実行
pytest

# 詳細出力
pytest -v

# 特定テスト実行
pytest test_api.py::test_create_entity
```

### フロントエンド テスト（Jest）

```bash
cd frontend

# テスト実行
npm test

# ウォッチモード
npm test -- --watch

# カバレッジ
npm test -- --coverage
```

### E2E テスト（Playwright）

```bash
cd frontend

# インストール
npx playwright install

# テスト実行
npx playwright test

# ブラウザで実行
npx playwright test --headed
```

### 推奨テストパターン

#### バックエンド API テスト
```python
import pytest
from fastapi.testclient import TestClient

def test_create_entity(client: TestClient):
    response = client.post("/entities/", json={
        "name": "Test Entity",
        "type": "person",
        "description": "Test"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Test Entity"

def test_export_data(client: TestClient):
    response = client.get("/export")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert "entities" in data
```

#### フロントエンド コンポーネント テスト
```typescript
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const header = screen.getByText(/relation-map/i);
  expect(header).toBeInTheDocument();
});
```

---

## デプロイ

### Docker での本番環境構築

```bash
# イメージをビルド
docker compose build

# 本番環境で起動（バックグラウンド）
docker compose up -d

# ヘルスチェック
curl http://localhost:8000/docs

# ログ確認
docker compose logs -f
```

### リバースプロキシ（Nginx）の設定例

```nginx
server {
  listen 80;
  server_name example.com;

  # React フロントエンド
  location / {
    proxy_pass http://localhost:3000;
  }

  # FastAPI バックエンド
  location /api/ {
    proxy_pass http://localhost:8000/;
  }
}
```

### 環境変数設定

```bash
# .env ファイルまたは docker-compose.yml で設定
POSTGRES_USER=prod_user
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=relationmap_prod
POSTGRES_HOST=db
```

---

## トラブルシューティング

### バックエンド

**エラー: `Port 8000 already in use`**
```bash
# ポート確認
lsof -i :8000

# 別のポートで起動
uvicorn main:app --port 8001 --reload
```

**エラー: `Failed to connect to database`**
```bash
# PostgreSQL が起動しているか確認
docker ps | grep postgres

# DB起動
docker compose up -d db

# 接続確認
psql -h localhost -U user -d relationmap
```

**エラー: `Module not found`**
```bash
# 依存関係の再インストール
pip install --upgrade pip
pip install -r requirements.txt
```

### フロントエンド

**エラー: `Cannot find module 'react'`**
```bash
# node_modules 削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

**エラー: `API call failed: 404`**
```bash
# バックエンド が起動しているか確認
curl http://localhost:8000/docs

# CORS エラーの場合は main.py の CORS設定を確認
```

**UI が更新されない**
```bash
# React DevTools で状態確認
# キャッシュクリア: Ctrl+Shift+R
# webpack HMR が有効か確認：ブラウザコンソール
```

### Docker Compose

**エラー: `Service 'XXX' failed to start`**
```bash
# ログ詳細表示
docker compose logs <service_name>

# 再ビルド
docker compose build --no-cache
docker compose up
```

**エラー: `Permission denied`**
```bash
# Docker デーモンが起動しているか確認
systemctl status docker

# ユーザーが docker グループに属しているか確認
groups $USER
```

---

## まとめ

- **開発環境**: Docker Compose で統一
- **コード品質**: TypeScript、Pydantic v2、useMemo による最適化
- **テスト**: pytest (Backend)、Jest (Frontend)、Playwright (E2E)
- **デプロイ**: Docker イメージ、環境変数による設定分離

詳細は各ファイルの README.md または API_REFERENCE.md を参照してください。
