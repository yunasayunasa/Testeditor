# 簡易修正手順書（最終版）

## 状況
私の編集ツールでは複雑なファイルを正確に編集できません。
以下の手動修正をお願いします。

---

## 修正1: EditorUI.js の649行目

### 変更箇所
`src/editor/EditorUI.js`の649行目

### 現在:
```javascript
if (!assetList || !this.assetListContainer || !this.assetTabContainer) {
```

### 修正後:
```javascript
if (!assetList || !this.assetListContainer) {
```

→ `|| !this.assetTabContainer` を削除

---

## 修正2: style.css の117-121行目

### 変更箇所
`style.css`の117-121行目

### 現在:
```css
#inspector-panel {
  width: var(--sidebar-width);
  border-left: 1px solid var(--border-color);
  flex-shrink: 0;
}
```

### 修正後:
```css
#inspector-panel {
  width: var(--sidebar-width);
  border-left: 1px solid var(--border-color);
  flex-shrink: 0;
  max-height: 100vh;
  overflow: hidden;
}
```

→ 末尾に2行追加

---

## 修正3 (オプション): inspector-content にスクロール追加

style.cssの`.panel-content`（146行目付近）の後に追加:

```css
#inspector-panel .panel-content {
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
```

---

## 期待される結果

1. ✅ アセット一覧が表示される（UI要素等が表示）
2. ✅ インスペクタパネルがスクロール可能になる
3. ✅ プロジェクトパネルが画面外に押し出されない

---

## **重要**:  HTMLは修正済み

`index.html`は先ほど修正していただいたので、そのままでOKです！

**必要な修正は2箇所だけ**です：
- EditorUI.js の1行削除
- style.css の2行追加
