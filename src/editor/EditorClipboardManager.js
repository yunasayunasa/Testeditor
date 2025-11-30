import { CreateObjectCommand } from './commands/CreateObjectCommand.js';
import { DeleteObjectCommand } from './commands/DeleteObjectCommand.js';

/**
 * EditorClipboardManager - Copy/Paste/Duplicate機能を管理
 * 複数オブジェクト対応 & Undo/Redo統合版
 */
export default class EditorClipboardManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.clipboard = null; // Array of object layouts
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
        const objectsToCopy = this._getTargetObjects();
        if (objectsToCopy.length === 0) {
            console.log('[ClipboardManager] No object selected to copy');
            return;
        }

        const scene = objectsToCopy[0].scene;
        if (!scene || typeof scene.extractLayoutFromObject !== 'function') {
            console.warn('[ClipboardManager] Cannot export object: scene method missing');
            return;
        }

        // オブジェクトのレイアウトデータをJSON化してクリップボードに保存
        this.clipboard = objectsToCopy.map(obj => scene.extractLayoutFromObject(obj));
        console.log(`[ClipboardManager] Copied ${this.clipboard.length} objects.`);
    }

    /**
     * クリップボードからオブジェクトをペースト
     */
    pasteObject() {
        if (!this.clipboard || this.clipboard.length === 0) {
            console.log('[ClipboardManager] Clipboard is empty');
            return;
        }

        const scene = this.plugin.getActiveGameScene();
        if (!scene || typeof scene.createObjectFromLayout !== 'function') {
            console.warn('[ClipboardManager] Cannot paste: scene method missing');
            return;
        }

        const newObjects = [];

        this.clipboard.forEach(layout => {
            const newLayout = JSON.parse(JSON.stringify(layout));
            newLayout.x += 20;
            newLayout.y += 20;
            newLayout.name = this._generateUniqueName(scene, newLayout.name + '_copy');

            const command = new CreateObjectCommand(this.plugin, scene.scene.key, newLayout);
            this.plugin.commandManager.execute(command);

            // コマンド実行後に作成されたオブジェクトを取得
            const newObj = scene.children.list.find(o => o.name === newLayout.name);
            if (newObj) {
                newObjects.push(newObj);
            }
        });

        if (newObjects.length > 0) {
            this.plugin.selectMultipleObjects(newObjects);
            console.log(`[ClipboardManager] Pasted ${newObjects.length} objects.`);
        }
    }

    /**
     * 選択中のオブジェクトを複製 (Ctrl+D)
     */
    duplicateSelectedObject() {
        const objectsToDuplicate = this._getTargetObjects();
        if (objectsToDuplicate.length === 0) return;

        const scene = objectsToDuplicate[0].scene;
        const newObjects = [];

        objectsToDuplicate.forEach(obj => {
            const layout = scene.extractLayoutFromObject(obj);
            const newLayout = JSON.parse(JSON.stringify(layout));
            newLayout.x += 20;
            newLayout.y += 20;
            newLayout.name = this._generateUniqueName(scene, newLayout.name + '_duplicate');

            const command = new CreateObjectCommand(this.plugin, scene.scene.key, newLayout);
            this.plugin.commandManager.execute(command);

            const newObj = scene.children.list.find(o => o.name === newLayout.name);
            if (newObj) {
                newObjects.push(newObj);
            }
        });

        if (newObjects.length > 0) {
            this.plugin.selectMultipleObjects(newObjects);
            console.log(`[ClipboardManager] Duplicated ${newObjects.length} objects.`);
        }
    }

    /**
     * 選択中のオブジェクトを削除 (Delete)
     */
    deleteSelectedObject() {
        const objectsToDelete = this._getTargetObjects();
        if (objectsToDelete.length === 0) return;

        const scene = objectsToDelete[0].scene;

        // 選択解除
        this.plugin.deselectAll();

        objectsToDelete.forEach(obj => {
            const command = new DeleteObjectCommand(this.plugin, obj);
            this.plugin.commandManager.execute(command);
        });

        console.log(`[ClipboardManager] Deleted ${objectsToDelete.length} objects.`);
    }

    /**
     * ヘルパー: ターゲットとなるオブジェクト配列を取得
     */
    _getTargetObjects() {
        if (this.plugin.selectedObjects && this.plugin.selectedObjects.length > 0) {
            return [...this.plugin.selectedObjects];
        } else if (this.plugin.selectedObject) {
            return [this.plugin.selectedObject];
        }
        return [];
    }

    /**
     * ヘルパー: ユニークな名前を生成
     */
    _generateUniqueName(scene, baseName) {
        let name = baseName;
        let counter = 1;
        while (scene.children.list.some(o => o.name === name)) {
            name = `${baseName}_${counter++}`;
        }
        return name;
    }
}
