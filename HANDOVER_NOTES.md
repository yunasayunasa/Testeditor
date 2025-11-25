# Project Handover Notes - Odyssey Engine

**最終更新**: 2025-11-26
**目的**: 別PC環境での開発継続のための現状整理とタスクリスト

## 📂 プロジェクト構成
- **ルート**: `c:\Users\guestuser\Desktop\コウセイ\Testeditor`
- **主要ソース**: `src/`
  - `editor/`: エディタ機能（UI, コマンド, ギズモ）
  - `plugins/`: Phaserプラグイン（EditorPlugin, GizmoManager）
  - `scenes/`: ゲームシーン（BaseGameScene）
  - `components/`: ゲームコンポーネント

## 🚧 現在の実装状況

### 1. Undo/Redoシステム
- **ステータス**: 実装済みだが動作しないと報告あり
- **構成**: `EditorCommandManager`, `Move/Delete/CreateObjectCommand`
- **問題点**: UIボタンが機能していない可能性、またはコマンドが正しく記録されていない。

### 2. UI/UX (EditorUI.js, index.html, style.css)
- **ステータス**: レイアウト崩れ、機能不全多数
- **既知の問題**:
  - **プロジェクトパネル**: アセットアイコンが巨大で重なっている。
  - **インスペクタ**: オブジェクトを選択しても空のまま。
  - **ツールバー**: ツール切り替え（Move, Rotate等）が機能しない。
  - **ボタン**: 小さすぎて押しづらい（iPad想定）。
  - **セーブ**: 「エクスポートに失敗しました」というエラー。
  - **タブ**: アニメーションタブなどが反応しない。

### 3. GizmoManager
- **ステータス**: 実装済みだが連携不全
- **問題点**: ツールバーからの切り替えが反映されていない可能性。

## 📝 直近のタスクリスト (優先順位順)

### 🚨 緊急修正 (Emergency Fixes)
1.  **アセット一覧のスタイル修正**:
    - `style.css` で `.asset-item` のサイズとグリッドレイアウトを修正。
    - 重なりを解消し、適切なサイズで表示。

2.  **インスペクタの表示復旧**:
    - `EditorUI.js` の `selectSingleObject` メソッドをデバッグ。
    - オブジェクト選択時に `buildInspector` が正しく呼ばれ、DOMが生成されているか確認。

3.  **ツールバー機能の修正**:
    - ツールボタン（Move, Rotate, Scale）のイベントリスナーを確認。
    - `GizmoManager.setActiveTool` が正しく呼び出されているか確認。

4.  **セーブ機能の修正**:
    - `onSaveSceneClicked` メソッドのエラー原因（「エクスポートに失敗」）を特定。
    - JSONシリアライズ時の循環参照などを疑う。

5.  **Undo/Redoボタンの改善**:
    - ボタンサイズを大きくする。
    - イベント発火を確認。

### 📅 次のステップ
- **アセット追加フローの確立**: プロジェクトパネルへのドラッグ＆ドロップ実装。
- **ヒエラルキーとプロジェクトの連携**: プロジェクトからシーンへのドラッグ＆ドロップ実装。
- **UI説明の追加**: ツールチップやヘルプの実装。

## 🛠️ 開発メモ
- **デバッグモード**: `EditorUI.js` で強制的にデバッグモードを有効化済み（URLパラメータ不要）。
- **CSS**: `style.css` でレイアウト制御。iPadのセーフエリア対応済み。

## 📂 重要なファイル
- `src/editor/EditorUI.js`: UIロジックの中核
- `src/plugins/EditorPlugin.js`: エディタ機能の統括
- `src/plugins/GizmoManager.js`: ギズモ操作
- `index.html`: UI構造
- `style.css`: スタイル定義

---
**Note**: このファイルをルートに置いておくことで、どの環境でも現状を把握して作業を再開できます。
