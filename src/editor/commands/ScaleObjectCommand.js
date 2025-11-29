import { EditorCommand } from './EditorCommand.js';

/**
 * オブジェクトスケール操作を表すコマンド
 * Gizmoでのスケール操作などで使用される
 */
export class ScaleObjectCommand extends EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     * @param {Phaser.GameObjects.GameObject} gameObject - スケールするオブジェクト
     * @param {number} oldScaleX - 変更前のX軸スケール
     * @param {number} oldScaleY - 変更前のY軸スケール
     * @param {number} newScaleX - 変更後のX軸スケール
     * @param {number} newScaleY - 変更後のY軸スケール
     */
    constructor(editor, gameObject, oldScaleX, oldScaleY, newScaleX, newScaleY) {
        super(editor);
        this.objectName = gameObject.name;
        this.sceneKey = gameObject.scene.scene.key;
        this.oldScaleX = Math.round(oldScaleX * 100) / 100; // 小数点第2位まで
        this.oldScaleY = Math.round(oldScaleY * 100) / 100;
        this.newScaleX = Math.round(newScaleX * 100) / 100;
        this.newScaleY = Math.round(newScaleY * 100) / 100;
    }

    execute() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[ScaleObjectCommand] Execute: Scaling ${this.objectName} to (${this.newScaleX}, ${this.newScaleY})`);
            obj.setScale(this.newScaleX, this.newScaleY);
        } else {
            console.warn(`[ScaleObjectCommand] Execute failed: Object ${this.objectName} not found`);
        }
    }

    undo() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[ScaleObjectCommand] Undo: Scaling ${this.objectName} back to (${this.oldScaleX}, ${this.oldScaleY})`);
            obj.setScale(this.oldScaleX, this.oldScaleY);
        } else {
            console.warn(`[ScaleObjectCommand] Undo failed: Object ${this.objectName} not found`);
        }
    }

    /**
     * シーンからオブジェクトを取得
     * @returns {Phaser.GameObjects.GameObject|null}
     */
    getObject() {
        const scene = this.editor.pluginManager.game.scene.getScene(this.sceneKey);
        if (!scene) return null;
        return scene.children.list.find(o => o.name === this.objectName);
    }

    getDescription() {
        return `Scale ${this.objectName}`;
    }

    isValid() {
        return this.getObject() !== null;
    }
}
