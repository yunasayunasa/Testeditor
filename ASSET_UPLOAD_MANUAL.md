# アセットアップロード機能 - 手動実装ガイド

## 必要な変更（2箇所のみ）

### 1. icon-size-sliderの削除 (index.html)

**場所**: 176-184行目

**削除するコード**:
```html
<div class="project-footer">
  <input
    type="range"
    id="icon-size-slider"
    min="1"
    max="3"
    value="2"
  />
</div>
```

→ この`<div class="project-footer">...</div>`全体を削除

---

### 2. +ボタンとfile inputの追加 (index.html)

**場所**: 156-158行目の`<div class="panel-tools">`

**現在**:
```html
<div class="panel-tools">
  <button id="clear-console-btn" style="display: none">Clear</button>
</div>
```

**変更後**:
```html
<div class="panel-tools">
  <button id="add-asset-button" title="Add Asset">+</button>
  <button id="clear-console-btn" style="display: none">Clear</button>
</div>
```

→ `<button id="add-asset-button"...`の1行を追加

---

### 3. Hidden File Inputの追加 (index.html)

**場所**: 185行目（project-viewの閉じタグの直後、Console Viewの前）

**追加するコード**:
```html
<input type="file" id="asset-file-input" accept="image/*,audio/*" multiple style="display: none;" />
```

→ Console View (`<div id="console-view"...`)の直前に追加

---

## 変更後の構造イメージ

```html
<div class="panel-tools">
  <button id="add-asset-button" title="Add Asset">+</button>  ← 追加
  <button id="clear-console-btn" style="display: none">Clear</button>
</div>
...
</div>  <!-- project-view終了 -->

<input type="file" id="asset-file-input" ... />  ← 追加

<!-- Console View -->
<div id="console-view" class="tab-content" style="display: none">
```

---

## 完了後の確認

1. ✅ プロジェクトパネルにスライダーが表示されなくなる
2. ✅ プロジェクトパネルのヘッダーに+ボタンが表示される
3. ✅ +ボタンをクリックするとファイル選択ダイアログが開く（EditorUI.jsで既に実装済み）

---

## 注意事項

- **HTMLファイルは壊れやすい**: 慎重に編集してください
- 変更は3箇所のみ: 削除1箇所、追加2箇所
- EditorUI.jsの変更は不要: 既にイベントリスナーが実装されています
