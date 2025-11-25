import { EditorCommand } from './EditorCommand.js';

/**
 * オブジェクト削除操作を表すコマンド
 * オブジェクトの完全な状態を保存し、Undo時に復元できるようにする
 */
export class DeleteObjectCommand extends EditorCommand {
    /**
     * @param {Object} editor - EditorPluginのインスタンス
     * @param {Phaser.GameObjects.GameObject} gameObject - 削除するオブジェクト
     */
    constructor(editor, gameObject) {
        super(editor);
        this.sceneKey = gameObject.scene.scene.key;
        
        // オブジェクトの完全な状態をシリアライズして保存
        this.objectData = this.serializeObject(gameObject);
    }

    execute() {
        const scene = this.getScene();
        if (!scene) return;
        
        const obj = scene.children.list.find(o => o.name === this.objectData.name);
        if (obj) {
            obj.destroy();
        }
    }

    undo() {
        const scene = this.getScene();
        if (!scene || !scene.createObjectFromLayout) return;
        
        try {
            // オブジェクトを再生成
            const restored = scene.createObjectFromLayout(this.objectData);
            if (restored) {
                scene.applyProperties(restored, this.objectData);
                scene.initComponentsAndEvents(restored);
                
                // エディタに登録
                if (this.editor.isEnabled) {
                    this.editor.makeEditable(restored, scene);
                }
            }
        } catch (error) {
            console.error('[DeleteObjectCommand] Failed to restore object:', error);
        }
    }

    /**
     * オブジェクトをシリアライズ
     * @param {Phaser.GameObjects.GameObject} gameObject
     * @returns {Object}
     */
    serializeObject(gameObject) {
        const scene = gameObject.scene;
        
        // BaseGameSceneのextractLayoutFromObjectメソッドを使用
        if (scene && typeof scene.extractLayoutFromObject === 'function') {
            return scene.extractLayoutFromObject(gameObject);
        }
        
        // フォールバック: 基本的なプロパティのみ保存
        return {
            name: gameObject.name,
            type: gameObject.constructor.name,
            x: gameObject.x,
            y: gameObject.y,
            scaleX: gameObject.scaleX,
            scaleY: gameObject.scaleY,
            angle: gameObject.angle,
            alpha: gameObject.alpha,
            depth: gameObject.depth,
            texture: gameObject.texture?.key,
            frame: gameObject.frame?.name,
            group: gameObject.getData('group'),
            layer: gameObject.getData('layer'),
            components: gameObject.getData('components'),
            events: gameObject.getData('events')
        };
    }

    /**
     * シーンを取得
     * @returns {Phaser.Scene|null}
     */
    getScene() {
        return this.editor.pluginManager.game.scene.getScene(this.sceneKey);
    }

    getDescription() {
        return `Delete ${this.objectData.name}`;
    }

    isValid() {
        return this.getScene() !== null;
    }
}
