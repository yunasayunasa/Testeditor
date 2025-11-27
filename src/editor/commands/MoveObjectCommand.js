import { EditorCommand } from './EditorCommand.js';

/**
 * オブジェクト移動操作を表すコマンド
 * Gizmoでのドラッグ操作などで使用される
 */
export class MoveObjectCommand extends EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     * @param {Phaser.GameObjects.GameObject} gameObject - 移動するオブジェクト
     * @param {number} oldX - 移動前のX座標
     * @param {number} oldY - 移動前のY座標
     * @param {number} newX - 移動後のX座標
     * @param {number} newY - 移動後のY座標
     */
    constructor(editor, gameObject, oldX, oldY, newX, newY) {
        super(editor);
        this.objectName = gameObject.name;
        this.sceneKey = gameObject.scene.scene.key;
        this.oldX = Math.round(oldX);
        this.oldY = Math.round(oldY);
        this.newX = Math.round(newX);
        this.newY = Math.round(newY);
    }

    execute() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[MoveObjectCommand] Execute: Moving ${this.objectName} to (${this.newX}, ${this.newY})`);
            obj.setPosition(this.newX, this.newY);
        } else {
            console.warn(`[MoveObjectCommand] Execute failed: Object ${this.objectName} not found`);
        }
    }

    undo() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[MoveObjectCommand] Undo: Moving ${this.objectName} back to (${this.oldX}, ${this.oldY})`);
            obj.setPosition(this.oldX, this.oldY);
        } else {
            console.warn(`[MoveObjectCommand] Undo failed: Object ${this.objectName} not found`);
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
        return `Move ${this.objectName}`;
    }

    isValid() {
        return this.getObject() !== null;
    }
}
