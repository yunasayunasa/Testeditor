import { EditorCommand } from './EditorCommand.js';

/**
 * オブジェクト作成操作を表すコマンド
 * 新しいオブジェクトの作成とUndo時の削除を管理
 */
export class CreateObjectCommand extends EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     * @param {string} sceneKey - シーンキー
     * @param {Object} objectData - オブジェクトのレイアウトデータ
     */
    constructor(editor, sceneKey, objectData) {
        super(editor);
        this.sceneKey = sceneKey;
        this.objectData = objectData;
        this.createdObjectName = objectData.name;
    }

    execute() {
        const scene = this.getScene();
        if (!scene || !scene.createObjectFromLayout) return;
        
        try {
            const obj = scene.createObjectFromLayout(this.objectData);
            if (obj) {
                scene.applyProperties(obj, this.objectData);
                scene.initComponentsAndEvents(obj);
                
                if (this.editor.isEnabled) {
                    this.editor.makeEditable(obj, scene);
                }
                
                // ヒエラルキーパネルを更新
                if (this.editor.editorUI) {
                    this.editor.editorUI.buildHierarchyPanel();
                }
            }
        } catch (error) {
            console.error('[CreateObjectCommand] Failed to create object:', error);
        }
    }

    undo() {
        const scene = this.getScene();
        if (!scene) return;
        
        const obj = scene.children.list.find(o => o.name === this.createdObjectName);
        if (obj) {
            obj.destroy();
            
            // ヒエラルキーパネルを更新
            if (this.editor.editorUI) {
                this.editor.editorUI.buildHierarchyPanel();
            }
        }
    }

    /**
     * シーンを取得
     * @returns {Phaser.Scene|null}
     */
    getScene() {
        return this.editor.pluginManager.game.scene.getScene(this.sceneKey);
    }

    getDescription() {
        return `Create ${this.createdObjectName}`;
    }

    isValid() {
        return this.getScene() !== null;
    }
}
