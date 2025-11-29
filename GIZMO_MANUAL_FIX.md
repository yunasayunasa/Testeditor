# GizmoManager.js 修正ガイド

## ✅ 完了済み
- RotateObjectCommand.js作成
- ScaleObjectCommand.js作成

## 📝 必要な修正：src/plugins/GizmoManager.js

### 1. インポートの追加 (1行目の直後)

**現在**:
```javascript
import { MoveObjectCommand } from '../editor/commands/MoveObjectCommand.js';
```

**変更後**:
```javascript
import { MoveObjectCommand } from '../editor/commands/MoveObjectCommand.js';
import { RotateObjectCommand } from '../editor/commands/RotateObjectCommand.js';
import { ScaleObjectCommand } from '../editor/commands/ScaleObjectCommand.js';
```

---

### 2. 初期値の記録 (178行目)

**現在**:
```javascript
handle.setData('initialRotation', this.target.rotation);
```

**変更後**:
```javascript
handle.setData('initialTargetAngle', this.target.angle);
```

**現在**:
```javascript
handle.setData('initialScaleX', this.target.scaleX);
handle.setData('initialScaleY', this.target.scaleY);
```

**変更後**:
```javascript
handle.setData('initialTargetScaleX', this.target.scaleX);
handle.setData('initialTargetScaleY', this.target.scaleY);
```

---

### 3. TODO部分の実装 (211行目)

**現在**:
```javascript
                }
                // TODO: Implement Rotate and Scale commands
            }
```

**TODOコメントを削除して、以下を追加**:
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
            }
```

---

## 完了後の確認

1. 構文エラーがないことを確認
2. ブラウザでテスト：
   - オブジェクトを回転 → Ctrl+Z → Ctrl+Y
   - オブジェクトをスケール → Ctrl+Z → Ctrl+Y
