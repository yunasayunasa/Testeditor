# 🎮 Odyssey Engine

**iPad対応のブラウザベース2Dゲームエンジン**  
Unity風のエディタUIと強力なビジュアルスクリプティングを搭載

---

## ✨ 特徴

### 🎨 **Unity風エディタUI**
- Hierarchy / Inspector / Scene / Project パネル
- ドラッグ&ドロップによる直感的な操作
- Move / Rotate / Scale ギズモ
- Undo / Redo / Copy / Paste / Duplicate
- Multi-Select モード
- Inspector Lock機能

### 🎯 **ビジュアルスクリプティング (VSL)**
- ノードベースのイベントシステム
- ステートマシンエディタ
- **Unity Pro不要でビジュアルスクリプティングが標準装備**

### 📦 **強力なゲームシステム**
- **グリッド吸着システム** - パズル/カードゲーム向け
- **証言システム** - 逆転裁判ライクなゲーム対応
- **インベントリシステム** - RPG/サバイバルゲーム向け
- 物理エンジン (Matter.js統合)
- アニメーションシステム
- レイヤー管理

### 📱 **iPad最適化**
- タッチ操作完全対応
- レスポンシブUI
- ブラウザ上で即プレイ可能

---

## 🚀 クイックスタート

### **1. セットアップ**
```bash
# Webサーバーで起動（例: Live Server）
# index.htmlを開く

# デバッグモード（エディタ表示）
?debug=true
```

### **2. エディタの基本操作**

#### **オブジェクトの追加**
1. **Asset Browser** でアセットを選択
2. Scene Viewにドラッグ&ドロップ

#### **オブジェクトの編集**
1. **Hierarchy** または **Scene View** でクリック
2. **Inspector** でプロパティ編集
3. **Gizmo** で移動/回転/スケール

#### **複数選択**
1. **Multi-Select Mode (✨ボタン)** をON
2. オブジェクトを順番にクリック
3. まとめて移動・編集

#### **グループ化**
1. 複数オブジェクトを選択
2. Inspector の **Group** 欄に同じID入力
3. ダブルタップで全選択可能

---

## 🎮 モード切替

### **Edit Mode (デフォルト)**
- オブジェクトの配置・編集
- プロパティ変更
- レイアウト設計

### **Play Mode**
- 上部のトグルスイッチをON
- ゲームのプレイテスト
- 物理演算・インタラクション確認

---

## 📁 プロジェクト構造

```
Testeditor/
├── index.html              # メインHTML
├── style.css               # エディタUI CSS
├── src/
│   ├── main.js            # エントリーポイント
│   ├── scenes/            # ゲームシーン
│   │   ├── BaseGameScene.js
│   │   ├── TestimonyScene.js  # 逆転裁判風
│   │   └── BattleScene.js     # グリッド吸着デモ
│   ├── editor/            # エディタ機能
│   │   ├── EditorUI.js
│   │   ├── EditorPlugin.js
│   │   └── commands/      # Undo/Redo
│   ├── plugins/
│   │   └── GizmoManager.js
│   ├── components/        # ゲームコンポーネント
│   ├── core/              # エンジンコア
│   └── handlers/          # イベントハンドラー
└── assets/
    ├── images/            # 画像アセット
    ├── audio/             # 音声アセット
    ├── data/              # JSONデータ
    │   ├── scenes/
    │   ├── evidences.json
    │   └── testimonies/
    └── scenarios/         # シナリオスクリプト
```

---

## 🛠️ 高度な機能

### **グリッド吸着システム**
パズルゲーム、カードゲーム、タワーディフェンス向け

```javascript
// BattleScene.js 参照
this.backpackGridSize = 6;
this.cellSize = 60;
```

詳細: [Container Guide](./container_guide.md)

### **証言システム**
逆転裁判ライクなゲーム向け

```json
// assets/data/testimonies/testimony_01.json
{
  "witness": "証人A",
  "statements": [...]
}
```

### **ビジュアルスクリプティング (VSL)**
1. オブジェクトを選択
2. Inspector → **Events** セクション
3. ノードを追加・接続

---

## 🎯 サンプルゲーム

### **1. 逆転裁判風ゲーム**
- シーン: `TestimonyScene`
- 証言データ: `assets/data/testimonies/`
- 証拠品: `assets/data/evidences.json`

### **2. インベントリバトル**
- シーン: `BattleScene`
- グリッド: 6x6
- アイテム配置・戦闘システム

---

## 📚 ドキュメント

- [コンテナ・グリッド吸着ガイド](./container_guide.md)
- [VSL リファレンス](./vsl_reference.md) *(作成予定)*
- [API ドキュメント](./api_docs.md) *(作成予定)*

---

## ⚙️ 技術スタック

- **ゲームエンジン**: Phaser 3.60
- **物理エンジン**: Matter.js
- **言語**: Pure JavaScript (ES6+)
- **UI**: カスタムCSS (Unity風デザイン)

---

## 🤝 貢献

このプロジェクトは個人開発用です。  
フィードバックや改善提案は歓迎します！

---

## 📝 ライセンス

個人利用・学習目的で自由に使用可能

---

## 🎉 最新アップデート

### v1.0.0 (2025-11-30)
- ✅ Inspector Lock機能追加
- ✅ Play/Edit Modeトグル実装
- ✅ Copy/Paste/Duplicate/Delete完全対応
- ✅ Multi-Select Mode実装
- ✅ Undo/Redo (Move/Rotate/Scale)
- ✅ Grid Snapping (BattleScene)
- ✅ Testimony System (逆転裁判風)

---

**Made with ❤️ for game creators**
