/**
 * EditorClipboardManager - Copy/Paste/Duplicate機能を管理
 */
export default class EditorClipboardManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.clipboard = null;
        this.setupKeyboardShortcuts();
    }

    /**
     * キーボードショートカット設定
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // input/textareaにフォーカスがある場合は無視
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return;
            }

            // Ctrl+C: Copy
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.copySelectedObject();
            }
            // Ctrl+V: Paste
            else if (e.ctrlKey && e.key === 'v') {
                e.preventDefault();
                this.pasteObject();
            }
            // Ctrl+D: Duplicate
            else if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.duplicateSelectedObject();
            }
            // Delete: Delete selected object
            else if (e.key === 'Delete') {
                e.preventDefault();
                this.deleteSelectedObject();
            }
        });
    }

    /**
     * 選択中のオブジェクトをコピー
     */
    copySelectedObject() {
        const selectedObject = this.plugin.selectedObject;
        if (!selectedObject) {
            console.log('[ClipboardManager] No object selected to copy');
            return;
        }

        const scene = selectedObject.scene;
        if (!scene || typeof scene.exportGameObject !== 'function') {
            console.warn('[ClipboardManager] Cannot export object: scene method missing');
            return;
        }

        // オブジェクトのレイアウトデータをJSON化してクリップボードに保存
        this.clipboard = scene.exportGameObject(selectedObject);
        console.log('[ClipboardManager] Object copied:', selectedObject.name);
    }

    /**
     * クリップボードからオブジェクトをペースト
     */
    pasteObject() {
        if (!this.clipboard) {
            console.log('[ClipboardManager] Clipboard is empty');
            return;
        }

        const scene = this.plugin.getActiveGameScene();
        if (!scene || typeof scene.createObjectFromLayout !== 'function') {
            console.warn('[ClipboardManager] Cannot paste: scene method missing');
            return;
        }

        // 少しオフセットした位置に配置
        const layout = JSON.parse(JSON.stringify(this.clipboard));
        layout.x += 20;
        layout.y += 20;
        layout.name = layout.name + '_copy';

        const newObject = scene.createObjectFromLayout(layout);
        scene.applyProperties(newObject, layout);

        console.log('[ClipboardManager] Object pasted:', newObject.name);
        
        // 新しいオブジェクトを選択
        this.plugin.selectSingleObject(newObject);
    }

    /**
     * 選択中のオブジェクトを複製 (Ctrl+D)
     */
    duplicateSelectedObject() {
        const selectedObject = this.plugin.selectedObject;
        if (!selectedObject) {
            console.log('[ClipboardManager] No object selected to duplicate');
            return;
        }

        // Copy → Paste の組み合わせで実装
        this.copySelectedObject();
        this.pasteObject();
    }

    /**
     * 選択中のオブジェクトを削除
     */
    deleteSelectedObject() {
        const selectedObject = this.plugin.selectedObject;
        if (!selectedObject) {
            return;
        }

        const objectName = selectedObject.name;
        selectedObject.destroy();
        this.plugin.selectedObject = null;
        this.plugin.updatePropertyPanel();
        console.log('[ClipboardManager] Object deleted:', objectName);
    }
}
