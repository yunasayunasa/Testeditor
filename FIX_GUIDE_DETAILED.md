# バグ修正手順書

## 問題1: アセットリストが表示されない

### 原因
1. CSS `.asset-tabs` スタイルが不完全
2. HTML `#project-view` がデフォルトで非表示

### 解決策

#### A. HTMLの修正 (index.html)
145行目の `<div id="project-view" class="tab-content">` を以下に変更:
```html
<div id="project-view" class="tab-content" style="display: block;">
```
→ デフォルトでProjectタブを表示状態にする

#### B. CSSの追加 (style.css)
388行目 `.bottom-tabs .tab.active` の直後に以下を追加:

```css
/* --- Asset Type Tabs --- */
.asset-tabs {
  display: flex;
  gap: 4px;
  padding: 8px;
  background-color: var(--bg-panel);
  border-bottom: 1px solid var(--border-color);
}

.asset-tab {
  padding: 6px 12px;
  background-color: var(--bg-header);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.2s;
}

.asset-tab:hover {
  background-color: var(--bg-hover);
}

.asset-tab.active {
  background-color: var(--bg-selected);
  color: white;
}
```

---

## 問題2: オブジェクト選択時のレイアウト崩れ

### 原因
`#editor-props` が高さ制限なしで展開し、インスペクタパネルが拡大している可能性

### 解決策
style.css の `#editor-props` （329行目付近）に `max-height` を追加:

```css
#editor-props {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  max-height: calc(100vh - 200px); /* 追加 */
  overflow-y: auto;                 /* 追加 */
}
```

---

## 修正後に確認すること

1. ✅ アセットタイプタブ（Image, UI など）が表示される
2. ✅ アセット一覧が表示される
3. ✅ オブジェクト選択時にレイアウトが崩れない
4. ✅ インスペクタパネルがスクロール可能
5. ✅ プロジェクトパネルが消失しない
