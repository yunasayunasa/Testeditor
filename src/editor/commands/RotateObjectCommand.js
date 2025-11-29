import { EditorCommand } from './EditorCommand.js';

/**
 * オブジェクト回転操作を表すコマンド
 * Gizmoでの回転操作などで使用される
 */
export class RotateObjectCommand extends EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     * @param {Phaser.GameObjects.GameObject} gameObject - 回転するオブジェクト
     * @param {number} oldAngle - 回転前の角度
     * @param {number} newAngle - 回転後の角度
     */
    constructor(editor, gameObject, oldAngle, newAngle) {
        super(editor);
        this.objectName = gameObject.name;
        this.sceneKey = gameObject.scene.scene.key;
        this.oldAngle = Math.round(oldAngle * 10) / 10; // 小数点第1位まで
        this.newAngle = Math.round(newAngle * 10) / 10;
    }

    execute() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[RotateObjectCommand] Execute: Rotating ${this.objectName} to ${this.newAngle}°`);
            obj.setAngle(this.newAngle);
        } else {
            console.warn(`[RotateObjectCommand] Execute failed: Object ${this.objectName} not found`);
        }
    }

    undo() {
        const obj = this.getObject();
        if (obj) {
            console.log(`[RotateObjectCommand] Undo: Rotating ${this.objectName} back to ${this.oldAngle}°`);
            obj.setAngle(this.oldAngle);
        } else {
            console.warn(`[RotateObjectCommand] Undo failed: Object ${this.objectName} not found`);
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
        return `Rotate ${this.objectName}`;
    }

    isValid() {
        return this.getObject() !== null;
    }
}
