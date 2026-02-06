# Feature 7.3 Phase 2a: ユーザー認証 - 実装進捗レポート

**作成日**: 2026-02-03  
**対象フェーズ**: Phase 2a - 基本的なユーザー認証  
**進捗状況**: 75% (バックエンド実装完了、テスト・フロントエンド実装待機)

---

## 1. 実装完了項目

### 1.1 バックエンド認証基盤

#### ✅ auth.py 実装
- パスワードハッシュ化関数（bcrypt）
- JWT トークン生成・検証
- 認証依存関数（get_current_user, get_current_user_optional）
- HTTPBearer セキュリティスキーム

**主要関数**:
- `hash_password(password: str) -> str`
- `verify_password(plain_password: str, hashed_password: str) -> bool`
- `create_access_token(data: dict) -> str`
- `decode_access_token(token: str) -> dict`
- `get_current_user(credentials) -> User`

#### ✅ auth_api.py 実装
- **POST /api/auth/register**: ユーザー登録（JWT トークン返却）
- **POST /api/auth/login**: ログイン（JWT トークン返却）
- **GET /api/auth/me**: 現在のユーザー情報取得
- **POST /api/auth/logout**: ログアウト（クライアント側トークン削除）

#### ✅ models.py 修正
- **User モデル新規追加**: username, email, password_hash, created_at, updated_at, is_active
- **既存モデルに user_id 追加**:
  - Entity: user_id + ForeignKey(User)
  - Relation: user_id + ForeignKey(User)
  - RelationType: user_id + ForeignKey(User)
  - Version: user_id + ForeignKey(User)
- **リレーションシップの設定**: User ← entities, relations, relation_types, versions

#### ✅ schemas.py 認証スキーマ
- `UserCreate`: ユーザー登録リクエスト（validation: username 3-50文字、英数字あらびて_-、email, password 8-100文字）
- `UserLogin`: ログインリクエスト
- `UserResponse`: ユーザーレスポンス（パスワード除外）
- `Token`: トークンレスポンス
- `TokenPayload`: JWT ペイロード

#### ✅ api.py 全エンドポイント認証対応
- すべての CRUD エンドポイントに `current_user` パラメータ追加
- すべてのフィルタリングに `user_id` 条件追加
- すべてのデータ作成・更新時に `user_id` を自動設定

**修正対象エンドポイント**（全21個）:
- Entity CRUD（5個）: create, read_all, read_one, update, delete
- Relation CRUD（5個）: create, read_all, read_one, update, delete
- Data Management（3個）: reset, export, import
- Version Management（4個）: list, get_one, create_checkpoint, restore
- Type Management（4個）: list_relations, create_relations, list_entities 削除は後で対応予定

#### ✅ version_service.py 修正
- `get_current_snapshot(db, user_id)`: ユーザーのスナップショット取得
- `create_version(db, description, created_by, current_user)`: ユーザー固有バージョン作成
- `get_all_versions(db, user_id)`: ユーザーのバージョン一覧取得
- `get_version(db, version_id, user_id)`: ユーザー固有バージョン取得
- `restore_version(db, version_id, create_backup, user_id)`: ユーザー固有復元

#### ✅ main.py 認証ルーター登録
- `auth_router` を `/api` プレフィックスで登録

#### ✅ requirements.txt パッケージ追加
```
fastapi>=0.104.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
pydantic[email]>=2.0.0
```

#### ✅ Dockerfile Python バージョン修正
- Python 3.14 → Python 3.11-slim

#### ✅ docker-compose.yml 修正
- フロントエンドを一時的にコメントアウト（テスト用）

---

## 2. 未実装項目

### 2.1 テスト
- [ ] バックエンド認証 API テスト（pytest）
- [ ] データ分離テスト
- [ ] フロントエンド認証テスト（Jest）

### 2.2 フロントエンド
- [ ] AuthContext 実装（Context API）
- [ ] LoginPage コンポーネント
- [ ] ProtectedRoute コンポーネント
- [ ] Navbar ログアウトボタン
- [ ] localStorage トークン管理

### 2.3 既存 API クライアント修正
- [ ] frontend/src/api/client.ts へのAuthorizationヘッダー追加
- [ ] すべての fetch 呼び出しにトークン付与

### 2.4 データマイグレーション
- [ ] マイグレーションスクリプト（migrate_auth.py）
- [ ] デフォルトユーザー作成
- [ ] 既存データの user_id 設定

---

## 3. 既知の問題・制限事項

### 3.1 Docker ビルド状況
- バックエンド Docker イメージはビルド完了、コンテナ起動確認中
- フロントエンドは一時的にコメントアウト（fnm 権限エラーの回避）

### 3.2 セキュリティ考慮事項
- SECRET_KEY は環境変数から読み込み（現在: デフォルト値）
- CORS 設定が localhost:3000 のみ許可（本番環境要修正）
- パスワードリセット、メール認証は未実装

### 3.3 Type Management エンドポイント
- Entity Types 管理エンドポイントはまだ認証対応未完？（要確認）
- Relation Types 管理は一部認証対応

---

## 4. バックエンド認証ワークフロー

### 4.1 登録フロー
```
client → POST /api/auth/register
         { username, email, password }
       ↓
backend → パスワードハッシュ化 (bcrypt)
        → User モデル作成・DB 保存
        → JWT トークン生成
        ← { access_token, token_type, user: { id, username, email, ... } }
```

### 4.2 ログイン フロー
```
client → POST /api/auth/login
         { username, password }
       ↓
backend → ユーザー存在確認
        → パスワード検証
        → JWT トークン生成
        ← { access_token, token_type, user: {...} }
```

### 4.3 認証済みリクエスト
```
client → GET /api/entities
         Bearer {token} ヘッダー
       ↓
backend → トークン検証 (JWT decode)
        → ユーザー ID 取得
        → ユーザー固有データ取得 (WHERE user_id = ?)
        ← { entities: [ {...} ] }
```

---

## 5. データベーススキーマ（実装済み）

### 5.1 Users テーブル
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### 5.2 既存テーブルカラム追加
```sql
ALTER TABLE entities ADD COLUMN user_id INTEGER NOT NULL;
ALTER TABLE relations ADD COLUMN user_id INTEGER NOT NULL;
ALTER TABLE relation_types ADD COLUMN user_id INTEGER NOT NULL;
ALTER TABLE versions ADD COLUMN user_id INTEGER NOT NULL;
```

---

## 6. 次のステップ

### 6.1 優先度高
1. Docker バックエンド確認テスト
2. API 動作テスト（curl または Postman）
3. データベース初期化・マイグレーション
4. フロントエンド AuthContext 実装
5. LoginPage コンポーネント実装

### 6.2 優先度中
1. フロントエンド既存 API クライアント修正
2. ProtectedRoute 実装
3. ユニットテスト（backend）
4. E2Eテスト（Playwright）

### 6.3 優先度低
1. パスワードリセット（メール）
2. OAuth/ソーシャルログイン
3. ユーザープロフィール管理

---

## 7. ファイル構成（新規・修正）

### 7.1 新規ファイル
- `backend/auth.py` - 認証ユーティリティ
- `backend/auth_api.py` - 認証 API エンドポイント

### 7.2 修正ファイル
- `backend/models.py` - User モデル + 既存モデル修正
- `backend/schemas.py` - 認証スキーマ追加
- `backend/api.py` - 全エンドポイント認証対応（450行以上修正）
- `backend/version_service.py` - user_id パラメータ追加
- `backend/main.py` - auth_router 登録
- `backend/requirements.txt` - パッケージ追加
- `backend/Dockerfile` - Python バージョン修正
- `docker-compose.yml` - フロントエンド一時停止

---

## 8. 推定工数

| タスク | 完了 | 推定 | 進捗 |
|-------|------|------|------|
| 認証基盤（auth.py, auth_api.py） | 8h | 8h | 100% |
| モデル・スキーマ修正 | 6h | 6h | 100% |
| API エンドポイント修正 | 8h | 12h | 70% |
| ドキュメント | 2h | 2h | 50% |
| テスト | - | 4h | 0% |
| フロントエンド実装 | - | 4h | 0% |
| **合計** | **24h** | **36h** | **67%** |

---

## 9. トラブルシューティング

### 9.1 Docker ビルドエラー
- **エラー**: `error: Can't create the symlink for multishells at "/run/user/1000/fnm_multishells/..."`
- **原因**: fnm (FastNode Manager) の権限問題
- **対応**: フロントエンド構築時に発生するため、テスト時はフロントエンド停止

### 9.2 パッケージバージョン互換性
- **エラー**: `ImportError: cannot import name 'Schema' from 'pydantic'`
- **原因**: FastAPI と Pydantic v2 のバージョン非互換
- **対応**: `fastapi>=0.104.0`, `pydantic>=2.0.0` に修正

### 9.3 models.py エラー
- **エラー**: `NameError: name '__table_args__' is not defined`
- **原因**: RelationType と Version クラスで `__table_args__ or ()` という不正な構文
- **対応**: `__table_args__ = ()` に修正

---

## 10. テスト用デフォルト認証情報

### サーバー起動後（マイグレーション前）
テストユーザー定義なし。`/api/auth/register` で新規登録。

### 推奨テスト流れ
```bash
# 1. ユーザー登録
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123456"
  }'

# 2. トークン取得（レスポンスから access_token を抽出）

# 3. ユーザー情報確認
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer {token}"

# 4. エンティティ作成（認証済み）
curl -X POST http://localhost:8000/api/entities \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestEntity",
    "type": "person",
    "description": "Test entity"
  }'
```

---

**最終更新**: 2026-02-03 23:XX  
**担当者**: 実装エンジニア  
**ステータス**: 実装継続中 (Docker テスト待機)
