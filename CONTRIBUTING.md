# コントリビューション ガイド

relation-map プロジェクトへのコントリビューション（貢献）方法をまとめたガイドです。

---

## 目次

1. [開発に参加する前に](#開発に参加する前に)
2. [バグレポート](#バグレポート)
3. [機能リクエスト](#機能リクエスト)
4. [プルリクエスト](#プルリクエスト)
5. [コード規約](#コード規約)
6. [コミットメッセージ](#コミットメッセージ)

---

## 開発に参加する前に

### プロジェクトの理解

1. [README.md](../README.md) を読み、プロジェクトの目的を理解する
2. [API_REFERENCE.md](API_REFERENCE.md) でアーキテクチャを確認
3. [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) で開発環境をセットアップ
4. [design.md](../dev/design.md) で実装済み機能と計画を確認

### 開発環境のセットアップ

```bash
# リポジトリをフォークしてクローン
git clone https://github.com/YOUR_USERNAME/relation-map.git
cd relation-map

# 上流リポジトリを追加
git remote add upstream https://github.com/ORIGINAL_OWNER/relation-map.git

# ブランチ作成
git checkout -b feature/your-feature-name
```

---

## バグレポート

### バグを見つけた場合

**Issue を作成する前に**
- 既存の Issue で同様のバグが報告されていないか確認
- 最新のマスターブランチで問題が再現するか確認
- 環境情報（OS、ブラウザ、Docker バージョン等）を準備

**Issue テンプレート**

```markdown
## 説明
バグの簡潔な説明

## 発生環境
- OS: [例: Linux 5.10]
- ブラウザ: [例: Chrome 120, Safari 17]
- バージョン: [例: v1.0.0]
- Docker: [あれば記入]

## 再現手順
1. ...
2. ...
3. ...

## 期待される動作
...

## 実際の動作
...

## スクリーンショット
[あれば添付]

## ログ情報
```bash
docker compose logs backend | grep ERROR
```

## 可能な解決策（あれば）
```

---

## 機能リクエスト

### 新機能を提案する場合

**Issue を作成する前に**
- 類似の機能リクエストが既に存在していないか確認
- プロジェクトの方向性に合致しているか考量
- 実装に必要なリソース（時間・技術）を見積もり

**機能リクエスト テンプレート**

```markdown
## タイトル
簡潔な機能説明

## 説明
詳細な説明。なぜこの機能が必要か？

## 使用例
```
例: ユーザーが新規作成ダイアログで「テンプレート」を選択でき、
事前定義されたエンティティセットが自動生成される
```

## メリット
- パフォーマンス向上
- ユーザー体験の改善
- など

## 実装の複雑度
[ ] 低（1-2日）
[ ] 中（3-5日）
[ ] 高（1週間以上）

## 技術的検討事項
[あれば記入]
```

---

## プルリクエスト

### プルリクエストの作成

#### ステップ

1. **フォーク & クローン**
   ```bash
   git clone https://github.com/YOUR_USERNAME/relation-map.git
   cd relation-map
   ```

2. **モダンなブランチを作成**
   ```bash
   git checkout -b fix/entity-modal-validation
   # または
   git checkout -b feature/type-templates
   ```

3. **変更を実装**
   - コード規約に従う（下記参照）
   - テストを追加
   - ドキュメント更新

4. **ローカルでテスト**
   ```bash
   cd backend && pytest
   cd ../frontend && npm test
   ```

5. **コミット & プッシュ**
   ```bash
   git add .
   git commit -m "fix: ..."  # コミットメッセージ規約に従う
   git push origin fix/entity-modal-validation
   ```

6. **GitHub で PR を作成**
   - テンプレートに従う
   - 関連 Issue を参照（`Fixes #123`）
   - CI パス確認

#### PR テンプレート

```markdown
## 説明
実装内容の簡潔な説明

## 関連 Issue
Fixes #（Issue番号）

## 実装内容
- [ ] バックエンド: ...
- [ ] フロントエンド: ...
- [ ] ドキュメント: ...

## テスト方法
1. Docker で起動：`docker compose up -d`
2. ブラウザで http://localhost:3000 を開く
3. 以下の操作で確認：
   - ...

## チェックリスト
- [ ] コード規約を確認した
- [ ] テストを追加/更新した
- [ ] ドキュメントを更新した
- [ ] コミット メッセージが規約に従っている
- [ ] ローカルで全テストが PASS している

## スクリーンショット（あれば）
```

---

## コード規約

### 一般ルール

#### ファイル命名
- ファイル名は kebab-case（Python）または camelCase（TypeScript） を使用
  - `UserModal.tsx` ✅
  - `user_utils.py` ✅
  - `user-modal.tsx` ❌（フロント）
  - `UserModal.tsx` ❌（バック）

#### インデント
- Python: 4 スペース
- TypeScript/JavaScript: 2 スペース

### Python (バックエンド)

#### スタイルガイド
```python
# ✅ 型ヒントを使用
def create_entity(session: Session, name: str, entity_type: str) -> Entity:
    ...

# ❌ 型なし
def create_entity(session, name, entity_type):
    ...

# ✅ 関数・変数名は snake_case
def ensure_entity_type(session, type_name):
    ...

# ❌ camelCase
def ensureEntityType(session, typeName):
    ...

# ✅ クラス名は PascalCase
class EntityType(Base):
    ...

# ❌ snake_case
class entity_type(Base):
    ...

# ✅ 定数は UPPER_SNAKE_CASE
MAX_ENTITY_COUNT = 10000
DEFAULT_PAGE_SIZE = 20

# ❌ camelCase
maxEntityCount = 10000
```

#### Pydantic v2 対応
```python
from pydantic import BaseModel, ConfigDict

class EntitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    name: str
    
# ✅ model_dump() を使用
data = entity.model_dump()

# ❌ dict() を使用
data = entity.dict()
```

#### FastAPI のベストプラクティス
```python
# ✅ ルーティング順 (詳細 → 一般)
@router.get("/entities/types")
def list_types(): ...

@router.get("/entities/{entity_id}")
def get_entity(entity_id: int): ...

# ✅ 例外処理
try:
    service.create_entity(...)
except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
except Exception as e:
    raise HTTPException(status_code=500, detail="Internal server error")

# ❌ 例外処理なし
result = service.create_entity(...)
```

### TypeScript/React (フロントエンド)

#### スタイルガイド
```typescript
// ✅ 型定義を明示的に
const handleClick = (e: React.MouseEvent<HTMLButtonElement>): void => {
    ...
};

interface Props {
    entities: Entity[];
    onSave: (data: Entity) => Promise<void>;
}

// ❌ any を使用
const handleClick = (e: any) => { ... };

// ✅ useMemo で最適化
const filtered = useMemo(() => 
    entities.filter(e => e.name.includes(query))
, [entities, query]);

// ❌ 毎回再計算
const filtered = entities.filter(e => e.name.includes(query));

// ✅ useState のデフォルト値
const [count, setCount] = useState<number>(0);

// ❌ 型を指定しない
const [count, setCount] = useState(0);
```

#### コンポーネント構造
```typescript
// ✅ 標準的なコンポーネント構造
import React, { useState, useMemo } from 'react';

interface Props {
    title: string;
    onClose: () => void;
}

const MyComponent: React.FC<Props> = ({ title, onClose }) => {
    const [state, setState] = useState('');
    
    const computed = useMemo(() => { ... }, []);
    
    const handleAction = () => { ... };
    
    return (
        <div>
            {/* JSX */}
        </div>
    );
};

export default MyComponent;
```

---

## コミットメッセージ

[Conventional Commits](https://www.conventionalcommits.org/) に従います。

### 形式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### タイプ

| タイプ | 説明 | 例 |
|--------|------|-----|
| feat | 新機能 | feat(types): add type template feature |
| fix | バグ修正 | fix(api): correct routing order for /entities/types |
| docs | ドキュメント | docs: update API reference |
| style | コード整形（ロジック変更なし） | style(modal): fix indentation |
| refactor | リファクタリング | refactor(hooks): extract useDebouncedValue |
| perf | パフォーマンス向上 | perf(graph): memoize node rendering |
| test | テスト追加・変更 | test(api): add entity creation tests |
| chore | ビルド、依存関係 | chore: update dependencies |

### 例

**正しい例**
```
feat(type-management): add delete-only endpoint for zero-count types

- Add DELETE /entities/types/{type_name}/only endpoint
- Prevent deletion of types with associated entities
- Update frontend to use new endpoint for type deletion

Fixes #42
```

**悪い例**
```
fixed bug  ❌ (小文字で開始、タイプなし)
Feat: add new functionality  ❌ (タイプが大文字)
feat: add new functionality that users requested and does many things  ❌ (説明が長い)
```

### 書方のコツ

- **subject** は 50 文字以内、命令形で
- **body** は 72 文字で折り返す
- 関連 Issue がある場合は `Fixes #123` の形式で記述
- 複数の Issue の場合は `Fixes #123, #456` のように記述

---

## コードレビュー

### レビューのポイント

- **機能の正確性**: 期待通りに動作しているか
- **コード品質**: 可読性、保守性、テストカバレッジ
- **規約の遵守**: コード規約に従っているか
- **ドキュメント**: 必要な変更が文書化されているか
- **パフォーマンス**: 不要な再実行や API 呼び出しはないか

### レビューコメント例

**Good**
```
Consider using `useMemo()` here since the data doesn't change frequently.
也可以参考 Graph.tsx 中的用法 (line 42)
```

**Not Good**
```
This is wrong.  ❌
```

---

## 質問・ディスカッション

- GitHub Discussion で機能提案や設計について議論
- 大きな変更は PR 前に Issue で相談することを推奨

---

## ライセンス

このプロジェクトに貢献することで、あなたの成果物が LICENSE で定義されたライセンス下で公開されることに同意するものとみなします。

---

## まとめ

1. **事前に Issue で確認** - 重複作業を避ける
2. **小さく始める** - 1 つの機能 = 1 つの PR
3. **テストを含める** - テストなし PR は例外
4. **ドキュメント更新** - API/UIの変更時は必須
5. **コード規約に従う** - 自動チェックツールを活用

質問がある場合は GitHub Issue または Discussion でお気軽にお聞きください！
