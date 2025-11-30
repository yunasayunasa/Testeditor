# GEMINI.md - Odyssey Engine 開発者向けマニュアル

このドキュメントは、Gemini等のAIアシスタントがOdyssey Engineの開発をサポートする際の参考情報です。

---

## 📋 プロジェクト概要

**プロジェクト名**: Odyssey Engine  
**種類**: ブラウザベース2Dゲームエンジン  
**ターゲット**: iPad対応のゲーム開発  
**特徴**: Unity風エディタUI + ビジュアルスクリプティング  

---

## 🏗️ アーキテクチャ

### **コアシステム**
```
SystemScene (不可視)
  ├─ UIScene (エディタUI)
  ├─ ゲームシーン (BaseGameScene継承)
  │   ├─ TestimonyScene (逆転裁判風)
  │   ├─ BattleScene (グリッドシステム)
  │   └─ その他カスタムシーン
  └─ BacklogScene (テキスト履歴)
```

### **主要クラス**
- `EditorPlugin.js` - エディタ中核ロジック
- `EditorUI.js` - UIコントロール
- `GizmoManager.js` - Move/Rotate/Scaleギズモ
- `EditorCommandManager.js` - Undo/Redo
- `EditorClipboardManager.js` - Copy/Paste

---

## 🔧 開発ガイドライン

### **コーディングルール**

#### **1. シーン作成**
```javascript
// scenes/MyScene.js
import BaseGameScene from './BaseGameScene.js';

export default class MyScene extends BaseGameScene {
    constructor() {
        super({ key: 'MyScene' });
    }
    
    create() {
        super.create();
        this.initSceneWithData();
    }
}
```

#### **2. コンポーネント作成**
```javascript
// components/MyComponent.js
export default class MyComponent {
    constructor(gameObject) {
        this.gameObject = gameObject;
    }
    
    update(time, delta) {
        // 毎フレーム呼ばれる
    }
}
```

#### **3. イベントハンドラー作成**
```javascript
// handlers/events/my_action.js
export default function my_action(interpreter, params) {
    const { target, value } = params;
    // 処理実装
}
```

### **ファイル配置規則**
- シーン: `src/scenes/`
- コンポーネント: `src/components/`
- エディタ機能: `src/editor/`
- イベント: `src/handlers/events/`
- データ: `assets/data/`

---

## 🎮 重要な実装パターン

### **1. エディタでオブジェクト編集可能にする**
```javascript
// makeEditableを呼ぶ
this.plugin.makeEditable(gameObject, this);
```

### **2. Undo/Redo対応コマンド**
```javascript
import { EditorCommand } from './EditorCommand.js';

export class MyCommand extends EditorCommand {
    execute() { /* 実行処理 */ }
    undo() { /* 取り消し処理 */ }
}
```

### **3. レイヤー管理**
```javascript
// オブジェクトにレイヤー設定
gameObject.setData('layer', 'Foreground');

// レイヤーでフィルタ
const layer = this.plugin.layerStates.find(l => l.name === 'Foreground');
```

### **4. グループ化**
```javascript
// グループID設定
gameObject.setData('group', 'enemies_01');

// グループ取得
const groupObjects = scene.getObjectsByGroup('enemies_01');
```

---

## 🚨 よくある問題と解決策

### **問題1: プレイモードで編集できてしまう**
**原因**: `makeEditable`でモードチェックが不足  
**解決**: 
```javascript
const currentMode = this.game.registry.get('editor_mode');
if (currentMode === 'play') return;
```

### **問題2: Undo/Redoが動かない**
**原因**: コマンドを`commandManager.execute()`で実行していない  
**解決**:
```javascript
const command = new MoveObjectCommand(...);
this.commandManager.execute(command); // ✅
// gameObject.setPosition(...); // ❌
```

### **問題3: シーン遷移するとエラー**
**原因**: `shutdown()`でクリーンアップ不足  
**解決**:
```javascript
shutdown() {
    this.events.off(); // リスナークリア
    super.shutdown();
}
```

### **問題4: Inspector更新されない**
**原因**: `updatePropertyPanel()`を呼んでいない  
**解決**:
```javascript
this.plugin.updatePropertyPanel();
```

---

## 📦 データ構造

### **シーンJSONフォーマット**
```json
{
  "name": "MyScene",
  "type": "Scene",
  "objects": [
    {
      "name": "player",
      "type": "Sprite",
      "texture": "player_idle",
      "x": 400,
      "y": 300,
      "layer": "Gameplay",
      "group": null,
      "components": {
        "PlayerController": { "speed": 200 }
      }
    }
  ]
}
```

### **証言データフォーマット**
```json
{
  "witness": "証人名",
  "statements": [
    {
      "text": "証言内容",
      "press_action": {
        "type": "scenario",
        "target": "シナリオファイル名"
      },
      "correct_evidence": "証拠品ID or null"
    }
  ]
}
```

### **証拠品データフォーマット**
```json
{
  "evidence_id": {
    "name": "証拠品名",
    "description": "説明文",
    "icon": "アイコン画像キー"
  }
}
```

---

## 🎯 機能実装状況

### **✅ 実装済み**
- エディタUI (Hierarchy/Inspector/Scene/Project)
- Gizmo (Move/Rotate/Scale)
- Undo/Redo
- Copy/Paste/Duplicate/Delete
- Multi-Select Mode
- Inspector Lock
- Play/Edit Mode Toggle
- Layer Management
- Group Management
- Grid Snapping (BattleScene)
- Testimony System
- Visual Scripting (VSL)
- State Machine
- Animation System
- Physics (Matter.js)

### **🟡 部分実装**
- Container/Parent-Child (グループ機能で代替)
- Tilemap Editor (基本機能のみ)
- Prefab System (基本的な書き出しのみ)

### **❌ 未実装**
- UIからのContainer作成
- ネストされたPrefab
- Timeline/Animator
- Particle System Editor
- Profiler/Debugger

---

## 🔍 デバッグガイド

### **エディタログ**
```javascript
console.log('[EditorPlugin] メッセージ');
console.warn('[EditorUI] 警告');
console.error('[GizmoManager] エラー');
```

### **重要なレジストリ値**
```javascript
this.game.registry.get('editor_mode')      // 'select' | 'play'
this.game.registry.get('stateManager')     // ゲーム状態管理
this.game.registry.get('soundManager')     // サウンド管理
this.game.registry.get('asset_list')       // アセット一覧
```

### **デバッグモード起動**
```
http://localhost:port/index.html?debug=true
```

---

## 🚀 パフォーマンス最適化

### **推奨事項**
1. **オブジェクト数**: シーンあたり500個まで推奨
2. **画像サイズ**: 2048x2048以下
3. **物理ボディ**: 必要最小限に
4. **アニメーション**: 60fps維持

### **避けるべきパターン**
```javascript
// ❌ 毎フレーム検索
update() {
    const player = this.children.getByName('player');
}

// ✅ 一度だけ検索
create() {
    this.player = this.children.getByName('player');
}
```

---

## 🎨 UIカスタマイズ

### **CSS変数**
```css
:root {
    --panel-bg: #2b2b2b;
    --panel-border: #3a3a3a;
    --text-primary: #cccccc;
    --accent-color: #007acc;
}
```

### **ダークモード対応済み**
すべてのエディタUIがダークテーマで統一されています。

---

## 📚 参考情報

### **外部ライブラリ**
- Phaser 3.60 - ゲームエンジン
- Matter.js - 物理エンジン
- Lodash 4.17 - ユーティリティ

### **参考ドキュメント**
- [Phaser 3 API](https://photonstorm.github.io/phaser3-docs/)
- [Matter.js Docs](https://brm.io/matter-js/docs/)

---

## 🤖 AI開発サポートのヒント

### **コード修正時**
1. 既存の実装パターンを踏襲
2. コメントは日本語でOK
3. エラーハンドリングを必ず含める
4. Undo/Redo対応を考慮

### **新機能追加時**
1. 既存ファイル構造を確認
2. 同様の機能の実装を参考に
3. EditorPlugin/EditorUIの両方を更新
4. index.htmlにUI要素追加

### **バグ修正時**
1. console.logで状態確認
2. レジストリ値をチェック
3. イベントリスナーの重複確認
4. shutdownでクリーンアップ

---

## 📝 更新履歴

### 2025-11-30
- Inspector Lock機能追加
- Play/Edit Mode Toggle実装
- README.md / GEMINI.md作成
- Container Guide作成

### 2025-11-29
- Copy/Paste/Duplicate/Delete実装
- Multi-Select Mode実装
- Undo/Redo (Move/Rotate/Scale)実装

---

**このドキュメントは開発の進行に合わせて随時更新されます**
