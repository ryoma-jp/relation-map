# トラブルシューティング ガイド

relation-map を使用・開発する际の一般的な問題と解決策をまとめています。

---

## 目次

1. [セットアップの問題](#セットアップの問題)
2. [バックエンド（FastAPI）の問題](#バックエンドの問題)
3. [フロントエンド（React）の問題](#フロントエンドの問題)
4. [Docker の問題](#dockerの問題)
5. [データベースの問題](#データベースの問題)
6. [パフォーマンス・その他の問題](#パフォーマンスその他の問題)

---

## セットアップの問題

### Git クローン失敗

**症状**: `fatal: unable to access repository`

**原因と解決策**
```bash
# SSH キー が設定されていない場合は HTTPS で試す
git clone https://github.com/yourname/relation-map.git

# または SSH キーの確認
ssh -T git@github.com

# SSH キー生成（初回のみ）
ssh-keygen -t ed25519 -C "your-email@example.com"
ssh-add ~/.ssh/id_ed25519
```

### Python バージョン不一致

**症状**: `SyntaxError: invalid syntax` または `ModuleNotFoundError: No module named 'asyncio'`

**原因**: Python 3.9 以下を使用している

**解決策**
```bash
# Python バージョン確認
python --version

# Python 3.11+ が必要
# Ubuntu/Debian
sudo apt install python3.11 python3.11-venv

# macOS
brew install python@3.11

# 仮想環境作成
python3.11 -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate  # Windows
```

### Node.js バージョン不一致

**症状**: `npm ERR! node_modules/.bin/tsc: line 2: /home/user/.npm: Permission denied`

**原因**: Node.js 16 以下、または npm のパーミッション問題

**解決策**
```bash
# Node.js バージョン確認
node --version
npm --version

# Node.js 18+ が推奨
# nvm を使用
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# npm キャッシュクリア
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## バックエンドの問題

### 起動エラー: `ModuleNotFoundError: No module named 'fastapi'`

**症状**: バックエンドコンテナが起動しない、または `uvicorn main:app` 実行失敗

**原因と解決策**
```bash
cd backend

# 依存関係をインストール
pip install -r requirements.txt

# requirements.txt が古い可能性
pip install --upgrade -r requirements.txt

# 特定版を指定
pip install fastapi==0.109.0 uvicorn==0.27.0 sqlalchemy==2.0.25 pydantic==2.5.3
```

### エラー: `Port 8000 already in use`

**症状**: バックエンド起動時に `Address already in use`

**原因**: ポート 8000 が他のプロセスで使用中

**解決策**
```bash
# ポートを使用しているプロセス確認
lsof -i :8000

# プロセスを終了（その前に docker compose down を実行）
docker compose down

# または別のポート で起動
cd backend
uvicorn main:app --port 8001 --reload
# フロントエンド の .env で API URL を http://localhost:8001 に変更
```

### エラー: `SQLALCHEMY_DATABASE_URL connection failed`

**症状**: `error "connection refused"`、または API が 500 応答

**原因と解決策**
```bash
# PostgreSQL が起動しているか確認
docker ps | grep postgres

# PostgreSQL を起動
docker compose up -d db

# または ローカル環境変数を確認
echo $POSTGRES_HOST
echo $POSTGRES_PORT
echo $POSTGRES_USER

# PostgreSQL に直接接続してテスト
psql -h localhost -U user -d relationmap -c "SELECT 1;"
# パスワードプロンプトで password を入力

# ファイアウォール確認（Linux）
sudo iptables -L -n | grep 5432
```

### エラー: `No such table: entity`（テーブル作在錯誤）

**症状**: `/entities` エンドポイントが 500 エラーで `No such table`

**原因**: DB マイグレーション未実行、または DB がリセットされた

**解決策**
```bash
# backend/main.py で DB テーブル自動作成されるはず
# ログ確認
docker compose logs backend | tail -20

# 手動で DB リセット（開発用）
docker compose down -v  # -v でボリュームも削除
docker compose up -d    # 再起動で自動作成

# または手動で作成
cd backend
python -c "from main import engine; from models import Base; Base.metadata.create_all(bind=engine)"
```

### エラー: `pydantic.error_wrappers.ValidationError`

**症状**: API 呼び出しで 422 Unprocessable Entity

**原因**: リクエストボディのスキーマ不一致

**解決策**
```bash
# エラーメッセージ確認
curl -X POST http://localhost:8000/entities/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Test"}'

# 必須フィールド確認（OpenAPI ドキュメント）
http://localhost:8000/docs

# または backend/schemas.py で必須フィールド確認
```

### タイプ管理 API が 404

**症状**: `GET /entities/types` が 404、または `/entities/{id}` にマッチ

**原因**: FastAPI ルーティング順序の問題

**解決策**
```python
# backend/api.py の ルーティング順序確認
# ✅ 正しい順序
@router.get("/entities/types")  # ← より詳細なルートを先に定義
def list_entity_types(): ...

@router.get("/entities/{entity_id}")  # ← より一般的なルートを後に定義
def read_entity(entity_id: int): ...

# 修正後は uvicorn 再起動
# Docker: docker compose restart backend
# ローカル: Ctrl+C -> uvicorn main:app --reload
```

---

## フロントエンドの問題

### エラー: `Cannot find module 'react'`

**症状**: npm start 時に `ERR! code ERESOLVE`

**原因と解決策**
```bash
cd frontend

# node_modules をクリア
rm -rf node_modules package-lock.json

# 再インストール
npm install

# または npm legacy peer deps フラグ
npm install --legacy-peer-deps

# キャッシュもクリア
npm cache clean --force
npm install
```

### エラー: `Module not found: Can't resolve 'lodash' `

**症状**: npm run build 時にエラー

**原因**: lodash がインストールされていない

**解決策**
```bash
cd frontend

# 個別にインストール
npm install lodash lodash-es

# または package.json で確認して再インストール
npm install
```

### ビルド失敗: `TSError: ⨯ Unable to compile TypeScript`

**症状**: TypeScript コンパイルエラー

**原因と解決策**
```bash
cd frontend

# TypeScript バージョン確認
npx tsc --version

# 型チェック実行
npx tsc --noEmit

# キャッシュクリア
rm -rf build .next
npm run build
```

### UI が表示されない

**症状**: 白い画面、または console で React エラー

**原因と解決策**
```bash
# ブラウザの コンソール を確認（F12）
# 1. エラーがあればログから特定
# 2. API 呼び出しが成功しているか Network タブで確認
# 3. react-scripts バージョン確認

npm list react-scripts

# React StrictMode でエラー検出（開発環境）
# index.tsx を確認：
# <React.StrictMode>
#   <App />
# </React.StrictMode>
```

### データが読み込めない（API エラー）

**症状**: "Cannot load entities" エラー、または CORS エラー

**原因と解決策**
```bash
# 1. バックエンド が起動しているか確認
curl http://localhost:8000/entities

# 2. CORS エラーの場合
# backend/main.py を確認
# CORSMiddleware の設定確認：
# allow_origins=["*"]  # 開発環境用

# 3. API URL を確認
# frontend/.env ファイル確認
# REACT_APP_API_URL=http://localhost:8000

# 4. Network タブで詳細確認
# ブラウザ F12 -> Network タブ -> API 呼び出し見つける -> Response 確認
```

### ホットリロード（HMR）が動作しない

**症状**: ファイル保存後サーバーがリロードされない

**原因と解決策**
```bash
# ファイルシステム監視容量不足の可能性（Linux）
cat /proc/sys/fs/inotify/max_user_watches

# 増やす
sudo sysctl -w fs.inotify.max_user_watches=524288

# 永続化
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf

# npm start 再起動
npm start
```

---

## Docker の問題

### エラー: `Cannot connect to Docker daemon`

**症状**: `docker compose up` 実行時に接続エラー

**原因と解決策**
```bash
# Docker daemon が起動しているか確認
sudo systemctl status docker

# 起動
sudo systemctl start docker

# ユーザーが docker グループに属しているか確認
groups $USER

# グループに追加（ログイン後有効）
sudo usermod -aG docker $USER
newgrp docker
```

### エラー: `docker compose: command not found`

**症状**: 古い `docker-compose` コマンドを使用している

**原因と解決策**
```bash
# docker compose v2 をインストール
# Ubuntu/Debian
sudo apt install docker-compose-plugin

# macOS
brew install docker-compose

# 確認
docker compose version  # ✅ v2 が出力
docker-compose -v      # ❌ 古い方法

# または docker compose の エイリアス
# ~/.bashrc に追加
alias docker-compose='docker compose'
source ~/.bashrc
```

### コンテナが起動しない

**症状**: `docker compose up` 後すぐに終了

**原因と解決策**
```bash
# ログを詳細確認
docker compose logs --follow backend
docker compose logs --follow frontend

# Dockerfile の確認
cat backend/Dockerfile

# エラーが中断されている場合は build キャッシュをクリア
docker compose build --no-cache

# 再起動
docker compose up
```

### ポート競合

**症状**: `bind: address already in use` または `Bind for 0.0.0.0:3000`

**原因と解決策**
```bash
# ポート確認
lsof -i :3000
lsof -i :8000

# プロセス終了
kill -9 <PID>

# または docker-compose.yml で ポート変更
# ports:
#   - "3001:3000"  # 外部 3001 にマッピング
```

### DNS 解決失敗

**症状**: `getaddrinfo EAI_AGAIN: Temporary failure, service resolution`

**原因**: コンテナ内の DNS 解決失敗

**解決策**
```bash
# docker-compose.yml で DNS 指定
services:
  backend:
    dns:
      - 8.8.8.8
      - 8.8.4.4
  frontend:
    dns:
      - 8.8.8.8

# または Docker daemon 設定
# Linux の場合は /etc/docker/daemon.json
{
  "dns": ["8.8.8.8", "8.8.4.4"]
}

sudo systemctl restart docker
docker compose up
```

---

## データベースの問題

### PostgreSQL ポート 5432 競合

**症状**: `Bind for 0.0.0.0:5432 failed`

**原因**: ローカル PostgreSQL が起動している

**解決策**
```bash
# ローカル PostgreSQL 停止
sudo systemctl stop postgresql

# または docker-compose.yml で ポート変更
# ports:
#   - "5433:5432"  # 外部 5433 にマッピング

# 環境変数を合わせて変更
export POSTGRES_PORT=5433

# Docker 再起動
docker compose down
docker compose up -d
```

### DB マイグレーション失敗

**症状**: テーブルが存在しない、またはスキーマ不一致

**原因と解決策**
```bash
# Alembic を使用している場合
cd backend

# マイグレーションフォルダ確認
ls alembic/versions/

# 最新マイグレーション適用
alembic upgrade head

# または models.py で自動作成されるはず
python -c "from main import engine; from models import Base; Base.metadata.create_all(bind=engine)"

# 確認
psql -h localhost -U user -d relationmap -c "\dt"
```

### データベース クエリが遅い

**症状**: API レスポンス時間が遅い

**原因と解決策**
```bash
# インデックス確認
psql -h localhost -U user -d relationmap -c "\d+ entity"

# インデックス追加（必要に応じて）
psql -h localhost -U user -d relationmap -c "CREATE INDEX idx_entity_type ON entity(type);"

# Query 実行計画確認
psql -h localhost -U user -d relationmap -c "EXPLAIN SELECT * FROM entity WHERE name LIKE 'test%';"

# 遅いクエリ確認（PostgreSQL ログ）
docker compose logs db | grep "duration:"
```

---

## パフォーマンス・その他の問題

### グラフの描画が遅い

**症状**: 大量のノード（1000+）で UI がフリーズ

**原因**: D3.js の再렌더링が多い

**解決策**
```typescript
// frontend/Graph.tsx で最適化確認
// ✅ useMemo で memo化
const nodes = useMemo(() => 
  entities.map(e => ({ id: e.id, label: e.name }))
, [entities]);

// ✅ 仮想化を検討（react-virtualized）
// または SVG サイズを制限
```

### ブラウザメモリ用量が増加

**症状**: Time が経つにつれメモリ usage が加算

**原因**: メモリリーク（イベントリスナー未削除など）

**解決策**
```typescript
// useEffect のクリーンアップ確認
useEffect(() => {
  const handleResize = () => { ... };
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);  // ✅ 必須
  };
}, []);

// React DevTools で検出
// コンポーネントがアンマウント時に Profiler で確認
```

### Export/Import 遅い

**症状**: 大きなファイル（>10MB）Import に数秒かかる

**原因**: メイン thread での JSON パース

**解決策**
```typescript
// Web Worker で処理（オプション）
// または backend でストリーミング処理

// 現在の解決策
const handleImport = async (file: File) => {
  const text = await file.text();
  // JSON.parse がメイン thread をブロック
  const data = JSON.parse(text);  // 大きなファイルで遅延
  
  // 改善: Web Worker
  // const worker = new Worker('parser.worker.ts');
  // worker.postMessage(text);
};
```

### デバッグ時に役立つコマンド

**バックエンド API テスト**
```bash
# curl で GET リクエスト
curl -X GET http://localhost:8000/entities/ \
  -H "Content-Type: application/json"

# curl で POST リクエスト
curl -X POST http://localhost:8000/entities/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John",
    "type": "person",
    "description": "Test entity"
  }'

# curl で DELETE
curl -X DELETE http://localhost:8000/entities/1

# curl で ファイル
curl -X POST http://localhost:8000/import \
  -H "Content-Type: multipart/form-data" \
  -F "file=@data.json"
```

**フロントエンド デバッグ**
```javascript
// コンソール実行
// 全状態を見る
console.log({entities, relations, filters});

// API デバッグ
fetch('http://localhost:8000/entities/').then(r => r.json()).then(console.log)

// Local Storage 確認
localStorage.getItem('relation_map_data')

// エラーを catch
window.addEventListener('error', (e) => console.error('Global error:', e));
```

---

## その他・不明な場合

### GitHub Issue を作成

上記に該当しない場合は、以下の情報を含めて GitHub Issue を作成してください：

1. **エラーメッセージ全文**
   ```
   Paste full error message here
   ```

2. **環境情報**
   ```
   OS: Linux 5.10 / Windows 11 / macOS 14
   Docker: 25.0
   Browser: Chrome 120 / Safari 17
   Python: 3.11
   Node.js: 20.10
   ```

3. **再現手順**
   - Step 1: ...
   - Step 2: ...
   - Step 3: ...

4. **期待される動作と実際の動作**

5. **デバッグ情報**
   ```bash
   docker compose logs backend | tail -50
   docker compose logs frontend | tail -50
   ```

---

## まとめ

- **セットアップ**: Python 3.11+、Node.js 20+ が必須
- **Docker**: `docker compose` v2 を使用
- **ポート**: 3000 (Frontend)、8000 (Backend)、5432 (DB)
- **ログ**: `docker compose logs <service>` で詳細確認
- **Issue**: 不明な場合は GitHub Issue で相談

詳細は [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) や [API_REFERENCE.md](API_REFERENCE.md) を参照してください。
