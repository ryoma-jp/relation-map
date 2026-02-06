# Feature 7.3 データ管理の高度化 - 設計書

## 1. 概要

Feature 7.3は、relation-mapアプリケーションのデータ管理機能を大幅に強化します。以下の2つの主要機能を実装します：

1. **バージョン管理（履歴の保存）** - 過去のデータ状態を保存し、変更履歴を管理、復元可能にする
2. **ユーザー認証・複数プロジェクト対応** - ユーザー認証を実装し、複数のプロジェクトを独立して管理可能にする

---

## 2. Phase 1: バージョン管理（履歴の保存）

### 2.1 機能要件

#### 2.1.1 基本要件
- グラフの各状態（Entity/Relationの追加・編集・削除）を履歴として記録
- ユーザーが任意の過去のバージョンに復元可能
- 各バージョンには作成日時、変更内容の説明、変更者情報を含める
- バージョン一覧表示UI
- バージョン間の差分表示機能（オプション）

#### 2.1.2 スコープ別の実装段階

**Phase 1a: 基本的な履歴保存**
- Versionテーブルの追加
- Entity/Relation変更時に自動的にバージョンを作成
- バージョン一覧取得API
- Undo/Redo機能の実装

**Phase 1b: 詳細な履歴管理（将来拡張）**
- 変更内容の詳細情報記録
- バージョン間の差分表示
- 選択的なバージョン削除

### 2.2 データモデル設計

#### 2.2.1 新規テーブル: `versions`

```sql
CREATE TABLE versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,  -- 後述のProject対応時に追加
    version_number INTEGER NOT NULL,  -- バージョン番号（単調増加）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,  -- 変更の説明（ユーザーが入力、またはシステム自動生成）
    snapshot JSON NOT NULL,  -- その時点でのEntity/Relationの完全なスナップショット
    changes JSON,  -- 変更内容の詳細（削除/追加/編集の情報）
    created_by TEXT DEFAULT 'system',  -- 変更を行ったユーザーID（認証実装後）
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, version_number)
);
```

#### 2.2.2 スナップショット形式

```json
{
  "entities": [
    {
      "id": "ent1",
      "label": "person1",
      "properties": {}
    }
  ],
  "relations": [
    {
      "id": "rel1",
      "from": "ent1",
      "to": "ent2",
      "type": "friend"
    }
  ],
  "relationTypes": [
    {
      "id": "1",
      "name": "friend",
      "color": "#FF0000"
    }
  ]
}
```

#### 2.2.3 変更内容の詳細形式（オプション）

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "action": "add_entity",  // add_entity, edit_entity, delete_entity, add_relation, edit_relation, delete_relation
  "target": {
    "type": "entity",
    "id": "ent1"
  },
  "data": {
    // 変更前後のデータ
  }
}
```

### 2.3 API設計

#### 2.3.1 履歴関連エンドポイント

```
GET /api/versions
  説明: 現在のプロジェクトの全バージョン一覧取得
  レスポンス:
    {
      "versions": [
        {
          "id": 1,
          "version_number": 1,
          "created_at": "2024-01-15T10:00:00Z",
          "description": "Initial state",
          "created_by": "user123"
        }
      ]
    }

GET /api/versions/:version_id
  説明: 特定バージョンのスナップショット取得
  レスポンス:
    {
      "id": 1,
      "version_number": 1,
      "created_at": "2024-01-15T10:00:00Z",
      "snapshot": { ... },
      "changes": [ ... ]
    }

POST /api/versions/:version_id/restore
  説明: 指定バージョンに復元
  リクエスト:
    {
      "create_backup": true  // 現在の状態をバックアップとして保留するか
    }
  レスポンス:
    {
      "message": "Restored to version X",
      "new_version_id": 10
    }

POST /api/versions/create-checkpoint
  説明: 現在の状態をチェックポイントとして保存
  リクエスト:
    {
      "description": "Before major refactoring"
    }
  レスポンス:
    {
      "id": 5,
      "version_number": 5,
      "created_at": "2024-01-15T10:30:00Z"
    }
```

#### 2.3.2 Undo/Redo機能

```
POST /api/undo
  説明: 最後の操作を取り消す
  レスポンス: 復元後の状態（エンティティ/リレーションリスト）

POST /api/redo
  説明: 最後の取り消しを再適用
  レスポンス: 再適用後の状態
```

### 2.4 フロントエンド実装

#### 2.4.1 UI コンポーネント

- **HistoryPanel**: サイドパネルで履歴一覧を表示
- **VersionTimeline**: バージョン番号と作成日時の視覚的タイムライン表示
- **VersionPreview**: 選択されたバージョンの内容をプレビュー表示
- **RestoreDialog**: 復元前の確認ダイアログ

#### 2.4.2 フロントエンド状態管理

- Undo/Redoスタック（クライアント側）
- 現在のバージョン番号を状態で追跡
- 履歴パネルの展開/折りたたみ状態

### 2.5 実装上の考慮事項

#### 2.5.1 パフォーマンス
- スナップショット保存による容量増加への対応
  - 差分ベースの保存への段階的移行を考慮
  - 古いバージョンのアーカイブ・圧縮の検討
- バージョン復元時のデータベースアップデートの最適化

#### 2.5.2 データ整合性
- トランザクション内でバージョンとデータの同時更新
- 並行操作時のバージョン番号競合対策

#### 2.5.3 ストレージ管理
- バージョン保持の上限設定（初期: 100バージョン）
- 古いバージョンの自動削除ポリシー

---

## 3. Phase 2: ユーザー認証・複数プロジェクト対応

### 3.1 機能要件

#### 3.1.1 基本要件
- ユーザー登録・ログイン機能
- セッション/トークン管理（JWT）
- 複数のプロジェクトを独立して管理
- プロジェクト間の切り替え
- プロジェクトの共有機能（将来拡張）

#### 3.1.2 スコープ別の実装段階

**Phase 2a: 基本的なユーザー認証**
- ユーザー登録・ログイン API
- JWT トークン生成・検証
- セッション管理
- 認証ミドルウェア実装

**Phase 2b: プロジェクト管理**
- Project テーブルの追加
- Entity/Relation外部キーの更新
- プロジェクト選択・切り替えUI
- プロジェクト作成・削除API

**Phase 2c: 共有機能（将来拡張）**
- プロジェクトアクセス権限管理
- ユーザーアクセス権レベル（Owner, Editor, Viewer）

### 3.2 データモデル設計

#### 3.2.1 新規テーブル: `users`

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,  -- bcrypt でハッシュ化
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

#### 3.2.2 新規テーブル: `projects`

```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);
```

#### 3.2.3 既存テーブルの変更: `entities`, `relations`

```sql
-- entities テーブルに project_id を追加
ALTER TABLE entities ADD COLUMN project_id INTEGER;
ALTER TABLE entities ADD FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- relations テーブルに project_id を追加
ALTER TABLE relations ADD COLUMN project_id INTEGER;
ALTER TABLE relations ADD FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- versions テーブルに project_id を追加（上述で定義済み）
```

#### 3.2.4 新規テーブル: `sessions` （オプション、Redisを使い始めない場合）

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 3.3 認証・認可設計

#### 3.3.1 JWT トークン

```json
{
  "sub": "user123",
  "username": "john_doe",
  "exp": 1705363200,
  "iat": 1705276800
}
```

#### 3.3.2 認証フロー

1. **登録**: POST /api/auth/register
   - リクエスト: `{ "username", "email", "password" }`
   - レスポンス: `{ "id", "username", "access_token" }`

2. **ログイン**: POST /api/auth/login
   - リクエスト: `{ "username", "password" }`
   - レスポンス: `{ "access_token", "user_id", "username" }`

3. **リクエスト**: Authorization: Bearer {token}

### 3.4 API設計

#### 3.4.1 認証エンドポイント

```
POST /api/auth/register
  リクエスト:
    {
      "username": "john_doe",
      "email": "john@example.com",
      "password": "securepassword"
    }
  レスポンス:
    {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "access_token": "eyJ0eXAiOiJKV1QiLC..."
    }

POST /api/auth/login
  リクエスト:
    {
      "username": "john_doe",
      "password": "securepassword"
    }
  レスポンス:
    {
      "access_token": "eyJ0eXAiOiJKV1QiLC...",
      "user_id": 1,
      "username": "john_doe"
    }

POST /api/auth/logout
  説明: (オプション) トークン無効化
  レスポンス:
    {
      "message": "Logged out successfully"
    }
```

#### 3.4.2 プロジェクト管理エンドポイント

```
POST /api/projects
  説明: 新規プロジェクト作成
  リクエスト:
    {
      "name": "My First Project",
      "description": "A project to manage relationships"
    }
  レスポンス:
    {
      "id": 1,
      "user_id": 1,
      "name": "My First Project",
      "created_at": "2024-01-15T10:00:00Z"
    }

GET /api/projects
  説明: ユーザーのプロジェクト一覧取得
  レスポンス:
    {
      "projects": [
        {
          "id": 1,
          "name": "My First Project",
          "description": "...",
          "created_at": "2024-01-15T10:00:00Z",
          "is_archived": false
        }
      ]
    }

GET /api/projects/:project_id
  説明: プロジェクト詳細取得

PUT /api/projects/:project_id
  説明: プロジェクト情報更新

DELETE /api/projects/:project_id
  説明: プロジェクト削除

POST /api/projects/:project_id/switch
  説明: 現在のプロジェクトを切り替え
  レスポンス:
    {
      "current_project_id": 1
    }
```

#### 3.4.3 既存APIの修正

すべてのEntity/Relation APIエンドポイントに以下の変更を加える：

```
- 認証ヘッダーの必須化 (Authorization: Bearer token)
- project_id パラメータの追加
- 現在のプロジェクトコンテキストでのデータ操作

例: GET /api/entities?project_id=1
```

### 3.5 フロントエンド実装

#### 3.5.1 認証UI

- **LoginPage**: ユーザー登録・ログインフォーム
- **AuthContext**: 全体的な認証状態管理
- **ProtectedRoute**: 認証済みユーザーのみアクセス可能なルート

#### 3.5.2 プロジェクト管理UI

- **ProjectSelector**: プロジェクト選択ドロップダウン
- **ProjectList**: プロジェクト一覧表示
- **ProjectForm**: プロジェクト作成・編集フォーム

#### 3.5.3 レイアウト変更

- ナビゲーションバーの拡張：ユーザー情報、ログアウトボタン、プロジェクト切り替え

### 3.6 実装上の考慮事項

#### 3.6.1 セキュリティ
- パスワードハッシュ化（bcrypt）
- CORS設定の確認
- CSRF対策
- XSS対策（フロントエンド入力検証）

#### 3.6.2 データマイグレーション
- 既存の単一プロジェクト をデフォルトプロジェクトとして所属させるマイグレーション戦略

#### 3.6.3 バックワードコンパティビリティ
- 認証なしでアクセス可能なモード（開発用）の検討

---

## 4. 実装計画の全体像

### 4.1 推奨実装順序

```
Phase 1a (バージョン管理 - 基本)
  → Phase 2a (ユーザー認証)
  → Phase 2b (プロジェクト管理)
  → Phase 1b (詳細な履歴管理 - オプション)
  → Phase 2c (プロジェクト共有 - 将来拡張)
```

### 4.2 各フェーズの工数・期間

| フェーズ | 主要タスク | 推定工数（開発+テスト） |
|---------|----------|----------------------|
| 1a | Version テーブル、履歴記録API、Undo/Redo | 3-4 日 |
| 2a | ユーザー登録・ログイン、JWT実装 | 2 日 |
| 2b | Project テーブル、既存データの関連付け、API修正 | 2-3 日 |
| 1b | 差分・プレビュー | 2 日 |
| 2c | 権限管理 | 3-4 日 |

### 4.3 テスト計画

#### 4.3.1 ユニットテスト
- バージョン管理ロジック（テスト追加: 10+ テスト）
- ユーザー認証（テスト追加: 15+ テスト）
- プロジェクト管理（テスト追加: 10+ テスト）

#### 4.3.2 統合テスト
- 認証 + エンティティ操作の統合
- プロジェクト切り替え時のデータ整合性

#### 4.3.3 E2E テスト
- ログイン → プロジェクト作成 → エンティティ追加 → 履歴復元

---

## 5. ドキュメント更新計画

| ドキュメント | 変更内容 |
|-----------|--------|
| README.md | バージョン管理・プロジェクト管理の機能説明追加 |
| API_REFERENCE.md | 新規エンドポイント、認証の説明追加 |
| DEVELOPER_GUIDE.md | データベーススキーマ変更、認証実装ガイド追加 |
| CHANGELOG.md | v1.2 リリース情報を記載予定 |

---

## 6. リスク・制約事項

### 6.1 既知のリスク
- 既存データベーススキーマの大幅な変更により、既存インストールからのアップグレード複雑性
- 認証導入による初回セットアップの複雑化
- バージョン履歴のディスク容量増加

### 6.2 制約事項
- 単一SQLiteデータベースの場合、大規模ユーザー・プロジェクト数でのスケーラビリティ限界
- 将来的にPostgres移行を検討する必要あり

---

## 7. 参考資料・技術スタック

### 7.1 バックエンド認証
- JWT: PyJWT
- パスワードハッシュ: bcrypt
- 依存パッケージ追加: `python-jose`, `passlib[bcrypt]`

### 7.2 フロントエンド認証
- Context API で認証状態管理
- localStorage または Cookie でトークン保存

### 7.3 データベース
- SQLAlchemy マイグレーション: Alembicの導入を検討

---

## 附録: マイグレーション戦略

### A.1 既存ユーザーへの対応

```
Step 1: 新しいスキーマをデータベースに適用
Step 2: デフォルトユーザー（admin）を作成
Step 3: 既存のエンティティ/リレーションを admin ユーザーのプロジェクトに移行
Step 4: フロントエンド側で自動ログイン処理（オプション）
```

### A.2 ローカル開発用シード データ

```python
# 開発用シードドキュメント（auth_seed.py）
# デフォルトユーザー: admin / admin123
# デフォルトプロジェクト: "Demo Project"
```
