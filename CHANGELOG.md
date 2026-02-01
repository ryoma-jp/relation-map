# チェンジログ

relation-map のリリース履歴と変更内容を記録します。

---

## [2.0.0] - 計画中

### 計画中の機能
- **ユーザー認証**: ログイン、アカウント管理、アクセス制御
- **複数プロジェクト**: ユーザーごとに複数の関係図を作成・管理
- **WebSocket リアルタイム同期**: 複数ユーザーでのリアルタイム編集
- **テンプレート**: 事前定義されたエンティティ・リレーション構造
- **履歴管理**: undo/redo、変更履歴の確認
- **より高度なスタイリング**: ノード形状、色、サイズのカスタマイズ

---

## [1.1.0] - 2024-03-XX

### 追加機能

#### ドキュメント整備
- `README.md`: ユーザーマニュアルに大規模更新
  - Core Features (8 カテゴリ)
  - UI/UX Features (4 サブセクション)
  - Usage Guide (6 ワークフロー)
  - API Reference 概要表 (20+ エンドポイント)
  - Architecture 図解
  - FAQ セクション (6 項目)
  - Changelog
  
- `docs/API_REFERENCE.md`: 開発者向け詳細 API ドキュメント (新規作成)
  - 全エンドポイント仕様 (method, parameters, request/response, status codes)
  - 4 カテゴリ分類 (Entities, Relationships, Data Management, Type Management)
  - Error Handling ガイド
  - Best Practices (ページネーション、型管理、バックアップ)
  - Interactive API Docs リンク (Swagger UI, ReDoc)

- `docs/DEVELOPER_GUIDE.md`: 開発環境セットアップガイド (新規作成)
  - 環境セットアップ (Docker, ローカル)
  - プロジェクト構成説明
  - バックエンド開発ガイド (Pydantic v2, Routing)
  - フロントエンド開発ガイド (TypeScript, React, Optimization)
  - テスト方法 (pytest, Jest, Playwright)
  - デプロイガイド
  - トラブルシューティング

- `CONTRIBUTING.md`: コントリビューション ガイド (新規作成)
  - バグレポート・機能リクエストテンプレート
  - PR 作成フロー
  - コード規約 (Python, TypeScript)
  - コミットメッセージ規約 (Conventional Commits)
  - コードレビュー ポイント

- `docs/TROUBLESHOOTING.md`: トラブルシューティング ガイド (新規作成)
  - セットアップエラー (versions, paths)
  - バックエンド問題 (modules, ports, DB, API routing)
  - フロントエンド問題 (modules, types, API calls, HMR)
  - Docker 問題 (daemon, daemon version, ports)
  - DB 問題 (ports, migrations, performance)
  - パフォーマンス問題 (Graph rendering, memory leaks)

- `dev/feature7_1_details/feature7_1_implementation_summary.md`: 実装サマリー更新
  - Phase 5 完了マーク
  - 全フェーズ実装記録
  - 0件タイプ永続化セクション
  - 既知の問題・制限事項 更新
  - 今後の改善案 (5 項目、優先度付き)
  - まとめセクション 書き換え

- `dev/design.md`: 開発ロードマップ更新
  - Feature 7.1 を「完全完了」マーク
  - すべてのサブフェーズ完了チェック

### 改善

#### ルーティング最適化
- **バックエンド**: `/entities/types` エンドポイントを `/entities/{id}` より先に配置
  - FastAPI ルーティング順序の重要性を文書化
  - 422 Unprocessable Entity エラーを解決

#### ドキュメント構成
- 多言語対応を想定した README の構造化
- 図解・テーブル・コード例の充実
- エラーハンドリング・Best Practices ガイド
- Conventional Commits に基づくコミットメッセージ規約

---

## [1.0.0] - 2024-02-XX (Latest Release)

### 主要機能

#### Core Features
- **ノード作成・編集**: 最大 10,000 ノード対応
- **リレーション管理**: ノード間の関係を可視化
- **タイプ管理**: ノード・リレーションのカテゴリ分類
  - 0 件タイプの永続化（DB 保存）
  - タイプの追加・編集・削除
  - 削除時の確認ダイアログ

#### 検索・フィルタ機能
- **Search**: ノード名での全文検索
- **Filter by Type**: エンティティ・リレーションタイプでフィルタ
- **Debounce Search**: 300ms デバウンスでパフォーマンス最適化
- **Interactive Node Details**: ノード クリック時に詳細表示

#### データ管理
- **Export**: 全データを JSON 形式でダウンロード
  - Entity/Relation/EntityType/RelationType を含む
  - Version, exported_at タイムスタンプ付き
- **Import**: 
  - JSON ファイルのアップロード
  - Merge/Replace モード選択可能
  - ID 自動マッピング
- **Reset**: 全データをリセット

#### UI/UX 機能
- **D3.js グラフ**: インタラクティブ ビジュアライゼーション
  - ドラッグでノード移動可能
  - ズーム・パン機能
  - Force-directed レイアウト
- **Modal ダイアログ**: 作成・編集フォーム
- **Responsive Design**: PC・タブレット・モバイル対応
- **リアルタイム**: 入力値の即座反映

#### テクノロジースタック
- **Backend**: FastAPI 0.109+、SQLAlchemy 2.0+、Pydantic v2
- **Frontend**: React 18、TypeScript 5、D3.js 7
- **Database**: PostgreSQL 15
- **Infra**: Docker Compose

#### パフォーマンス最適化
- **useMemo**: 計算結果のメモ化
- **Debounce**: 300ms 検索デバウンス
- **Lazy Loading（計画中）**: 大規模データセット向け

#### セキュリティ
- **CORS**: クロスオリジンリクエスト許可（開発環境設定）
- **SQL Injection**: SQLAlchemy ORM で防止
- **Type Safety**: TypeScript + Pydantic で型安全

### バグ修正

#### Phase 1: Export/Import 基本機能
- ✅ Export JSON 形式定義
- ✅ Import ダイアログ実装
- ✅ Merge/Replace モード選択
- ✅ ID 自動マッピング

#### Phase 2: 検索・フィルタ・詳細表示
- ✅ 全文検索実装
- ✅ タイプフィルタ
- ✅ Debounce 最適化 (300ms)
- ✅ ノードクリック詳細表示

#### Phase 2.5: タイプ管理機能拡張
- ✅ タイプ追加・編集・削除
- ✅ タイプ名リネーム
- ✅ 使用数表示
- ✅ 確認ダイアログ

#### Phase 3: スタイリング
- ✅ Tailwind CSS 統合
- ✅ Responsive デザイン
- ✅ ダーク/ライトモード（計画中）

#### Phase 4: パフォーマンス最適化
- ✅ useMemo: フィルタリング結果メモ化
- ✅ Debounce: 検索入力 300ms
- ✅ 仮想化（計画中）: 大規模リスト対応

#### Phase 5: ドキュメント整備
- ✅ README.md 完全更新
- ✅ API_REFERENCE.md 作成
- ✅ DEVELOPER_GUIDE.md 作成
- ✅ CONTRIBUTING.md 作成
- ✅ TROUBLESHOOTING.md 作成

#### 0件タイプの永続化
- ✅ EntityType/RelationType DB テーブル追加
- ✅ バックエンド API 実装 (GET/POST/DELETE)
- ✅ フロント API クライアント実装
- ✅ Export/Import に タイプ情報含む
- ✅ リロード後も タイプが永続化

#### ルーティング競合修正
- ✅ `/entities/types` を `/entities/{id}` より先に定義
- ✅ FastAPI ルーティング順序の最適化
- ✅ 422 Unprocessable Entity エラー解決

### 既知の制限事項

- **仮想化未実装**: 10,000+ ノードでのパフォーマンス低下
- **リアルタイム同期未実装**: 複数ユーザーでの同時編集非対応
- **テスト未実装**: ユニット・E2E テスト（計画中）

### 依存関係

| 名前 | 種類 | バージョン | 用途 |
|-----|------|-----------|------|
| FastAPI | PyPI | 0.109+ | Web Framework |
| SQLAlchemy | PyPI | 2.0+ | ORM |
| Pydantic | PyPI | 2.5+ | Validation |
| PostgreSQL | Database | 15+ | Data Store |
| React | npm | 18+ | UI Framework |
| TypeScript | npm | 5+ | Type Safety |
| D3.js | npm | 7+ | Visualization |

---

## バージョニング

relation-map は [Semantic Versioning](https://semver.org/lang/ja/) に準拠します：

- **MAJOR**: 互換性を破壊する変更（例: API 仕様変更）
- **MINOR**: 後方互換性を保つ機能追加（例: 新エンドポイント）
- **PATCH**: バグ修正（例: UI 修正、パフォーマンス改善）

例：
- `1.0.0` → `1.1.0`: 新機能追加 (MINOR)
- `1.0.0` → `1.0.1`: バグ修正 (PATCH)
- `1.0.0` → `2.0.0`: 大規模リファクタリング (MAJOR)

---

## リリース プロセス

1. **開発**: feature ブランチで実装
2. **PR**: Pull Request 作成、レビュー
3. **テスト**: 自動テスト + 手動テスト
4. **リリース**: git tag で version タグ作成
   ```bash
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin v1.1.0
   ```
5. **ドキュメント更新**: チェンジログ記録

---

## 今後のロードマップ

### Phase 6: テスト実装
- [ ] ユニット テスト (Backend: pytest)
- [ ] ユニット テスト (Frontend: Jest)
- [ ] E2E テスト (Playwright)
- [ ] CI/CD パイプライン (GitHub Actions)

### Phase 7: ユーザー認証・複数プロジェクト
- [ ] ログイン機能
- [ ] アカウント管理
- [ ] 複数プロジェクト対応
- [ ] アクセス制御

### Phase 8: リアルタイム機能
- [ ] WebSocket 統合
- [ ] リアルタイム 同期
- [ ] コラボレーション機能
- [ ] 変更通知

### Phase 9: 高度な機能
- [ ] テンプレート機能
- [ ] 履歴管理 (undo/redo)
- [ ] スタイルカスタマイズ
- [ ] プラグイン API

---

## サポート

- **バグレポート**: GitHub Issues で報告
- **機能リクエスト**: GitHub Discussions で提案
- **質問・相談**: GitHub Discussions
- **セキュリティ**: security@example.com へ報告（公開しないでください）

---

## ライセンス

relation-map は LICENSE で定義されたライセンスで公開されています。

---

## 謝辞

このプロジェクトは以下のオープンソースプロジェクトを使用しています：

- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [D3.js](https://d3js.org/)
- [SQLAlchemy](https://www.sqlalchemy.org/)
- [Pydantic](https://docs.pydantic.dev/)
- [PostgreSQL](https://www.postgresql.org/)
- [TypeScript](https://www.typescriptlang.org/)

すべてのコントリビューターに感謝します！
