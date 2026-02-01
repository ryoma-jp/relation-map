# 開発ステップ: relation-map

人物相関図Webアプリの開発ステップを以下にまとめます。
Docker Composeによる起動を前提とし、Webフレームワークは現代的な構成（例：React + FastAPI）を想定しています。

---

## システム全体構成（ブロック図）

```mermaid
flowchart LR
  subgraph Frontend
	FE["React UI (D3.js/vis-network)"]
  end
  subgraph Backend
	BE["FastAPI (Python)"]
	DB[("DB (SQLite/PostgreSQL)")]
	BE -- SQLAlchemy/ORM --> DB
  end
  FE -- REST API/JSON --> BE
```

---

## 1. 要件整理・設計
- [ ] 1.1 機能要件の洗い出し
	- UIでのノード/エッジ追加・編集・削除
	- 関係タイプ（友人・親子・上司部下など）の指定
	- データ保存・読込（永続化）
	- グラフのインタラクション（ドラッグ、ズーム、フィルタ等）
- [ ] 1.2 データモデル設計
	- Entity（人物・組織等）モデル定義
	- Relation（関係）モデル定義
	- API仕様設計（エンドポイント、リクエスト/レスポンス形式）

## 2. プロジェクト初期化
- [x] 2.1 リポジトリ構成決定・初期ディレクトリ作成
- [x] 2.2 backendセットアップ
	- FastAPIプロジェクト初期化
	- 必要パッケージ（FastAPI, Uvicorn, SQLAlchemy等）インストール
- [x] 2.3 frontendセットアップ
	- React + TypeScript プロジェクト初期化
	- グラフ描画ライブラリ導入（D3.jsまたはvis-network）
- [x] 2.4 docker-compose.yml作成
	- backend, frontend, DBサービスの定義

## 3. 最小構成の実装
- [x] 3.1 APIサーバー
	- [x] 3.1.1 Entity/RelationのCRUDエンドポイント実装
	- [x] 3.1.2 CORS設定
- [x] 3.2 フロントエンド
	- [x] 3.2.1 サンプルデータでグラフ描画
	- [x] 3.2.2 APIからデータ取得・表示

## 4. UI機能拡張
- [x] 4.1 ノード/エッジの追加・編集・削除UI
- [x] 4.2 関係タイプの選択・表示
- [x] 4.3 キャンバスのドラッグ・ズーム
- [x] 4.4 入力バリデーション・エラーハンドリング

## 5. データ保存・読込
**[詳細設計書](feature5_design.md) | [実装完了サマリー](feature5_implementation_summary.md) を参照**
- [x] 5.1 サーバー側でデータ永続化（SQLite/PostgreSQL）
- [x] 5.2 フロントエンドからAPI経由でデータ保存・取得
- [x] 5.3 データ初期化・リセット機能（/reset エンドポイント追加）
- [x] 5.4 サンプルデータからの移行改善（ユーザー追加時に自動的にAPI保存）

## 6. Docker Compose統合
- [x] 6.1 backend, frontend, DBのサービスをdocker-composeで一括起動
- [x] 6.2 READMEに起動手順を記載

## 7. 追加機能・改善
- [x] 7.1 基本機能の完成度向上 ✅ **完全完了**
	**[詳細設計書](feature7_1_details/feature7_1_design.md) | [実装計画書](feature7_1_details/feature7_1_implementation_plan.md) | [実装サマリー](feature7_1_details/feature7_1_implementation_summary.md) を参照**
	- [x] Phase 1: データのエクスポート/インポート（JSON等） ✅ 完了
	- [x] Phase 2: UI/UX改善（フィルタ、検索、詳細表示） ✅ 完了
	- [x] Phase 2.5: タイプ管理（追加・編集・削除） ✅ 完了
	- [x] Phase 3: スタイリング改善 ✅ 完了
	- [x] Phase 4: パフォーマンス最適化 ✅ 完了
	- [x] Phase 5: ドキュメント整備 ✅ 完了
		- [x] `README.md` の大幅更新（ユーザーマニュアル化、450+ 行）
		- [x] `docs/API_REFERENCE.md` 新規作成（開発者向け詳細仕様）
		- [x] `docs/DEVELOPER_GUIDE.md` 新規作成（開発環境・コード規約）
		- [x] `CONTRIBUTING.md` 新規作成（コントリビューション ガイド）
		- [x] `docs/TROUBLESHOOTING.md` 新規作成（トラブルシューティング）
		- [x] `CHANGELOG.md` 新規作成（リリース履歴）
	- [x] 0件タイプの永続化・Export/Import対応 ✅ 完了
- [ ] 7.2 品質・保守性向上
	- [ ] ユニットテスト（Backend: pytest、Frontend: Jest）
	- [ ] E2E テスト（Playwright/Cypress）
	- [ ] CI/CD パイプライン（GitHub Actions）
- [ ] 7.3 データ管理の高度化
	- [ ] バージョン管理（履歴の保存）
	- [ ] ユーザー認証・複数プロジェクト対応
- [ ] 7.4 アーキテクチャ拡張
	- [ ] リアルタイム同期（WebSocket）
	- [ ] ユーザー認証・認可
	- [ ] 検索インデックス最適化
- [ ] 7.5 言語拡張
	- [ ] 日本語モードと英語モードの切り替え

---

## ドキュメント一覧

### ユーザー向けドキュメント
- **[README.md](../README.md)** - プロジェクト概要、機能説明、使用方法
- **[docs/API_REFERENCE.md](../docs/API_REFERENCE.md)** - REST API 詳細仕様（開発者向け）
- **[CHANGELOG.md](../CHANGELOG.md)** - リリース履歴、バージョン情報

### 開発者向けドキュメント
- **[docs/DEVELOPER_GUIDE.md](../docs/DEVELOPER_GUIDE.md)** - 開発環境セットアップ、コード構成、開発ガイド
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - コントリビューション ガイド、PR プロセス、コード規約
- **[docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md)** - トラブルシューティング、よくある質問と解決策

### 設計・実装ドキュメント
- **[feature7_1_details/feature7_1_design.md](feature7_1_details/feature7_1_design.md)** - Feature 7.1 設計書
- **[feature7_1_details/feature7_1_implementation_summary.md](feature7_1_details/feature7_1_implementation_summary.md)** - Feature 7.1 実装サマリー

