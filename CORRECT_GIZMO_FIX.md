# 重要なお知らせ

## ❌ 問題の原因

修正時に`initialTargetX`と`initialTargetY`を誤って削除したことが原因でした。

これらはMove操作に**必須**です！

---

## ✅ 完全な正しいコード

以下をコピー&ペーストしてください：

### 1. dragstart イベント (171-178行目を置き換え)

```javascript
            // Store initial values for undo/redo
            handle.setData('startX', pointer.x);
            handle.setData('startY', pointer.y);
            handle.setData('initialTargetX', this.target.x);
            handle.setData('initialTargetY', this.target.y);
            handle.setData('initialTargetAngle', this.target.angle);
            handle.setData('initialTargetScaleX', this.target.scaleX);
            handle.setData('initialTargetScaleY', this.target.scaleY);
```

**重要**: 
- `initialTargetX`, `initialTargetY` は**絶対に削除しないでください**
- `initialTargetAngle`, `initialTargetScaleX/Y` を**追加**してください

---

### 2. TODO部分 (211行目のTODOコメントを削除して以下に置き換え)

```javascript
                } else if (type === 'rotate') {
                    const oldAngle = handle.getData('initialTargetAngle');
                    const newAngle = this.target.angle;

                    if (Math.abs(oldAngle - newAngle) > 0.1) {
                        const command = new RotateObjectCommand(
                            this.editorPlugin,
                            this.target,
                            oldAngle,
                            newAngle
                        );
                        this.editorPlugin.commandManager.execute(command);
                    }
                } else if (type === 'scale') {
                    const oldScaleX = handle.getData('initialTargetScaleX');
                    const oldScaleY = handle.getData('initialTargetScaleY');
                    const newScaleX = this.target.scaleX;
                    const newScaleY = this.target.scaleY;

                    if (Math.abs(oldScaleX - newScaleX) > 0.01 || Math.abs(oldScaleY - newScaleY) > 0.01) {
                        const command = new ScaleObjectCommand(
                            this.editorPlugin,
                            this.target,
                            oldScaleX, oldScaleY,
                            newScaleX, newScaleY
                        );
                        this.editorPlugin.commandManager.execute(command);
                    }
                }
```

---

## 📋 チェックリスト

修正後、以下を確認：
- [ ] `initialTargetX` が存在する
- [ ] `initialTargetY` が存在する
- [ ] `initialTargetAngle` を追加した
- [ ] `initialTargetScaleX` を追加した
- [ ] `initialTargetScaleY` を追加した
- [ ] 構文エラーがない
- [ ] Moveツールでオブジェクトが消えない
