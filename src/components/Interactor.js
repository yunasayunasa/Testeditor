// src/components/Interactor.js

export default class Interactor {
    constructor(scene, target, params = {}) {
        this.scene = scene;
        this.target = target; // プレイヤー
        this.interactKey = scene.input.keyboard.addKey(params.key || 'UP'); // デフォルトは上キー
        
        this.interactableObjects = new Set(); // 現在インタラクト可能なオブジェクトのリスト

        this.interactKey.on('down', this.onInteract, this);
    }

    // [interact_add]タグから呼ばれる
    add(object) {
        this.interactableObjects.add(object);
        console.log(`[Interactor] Added to list:`, object.name);
    }

    // [interact_remove]タグから呼ばれる
    remove(object) {
        this.interactableObjects.delete(object);
        console.log(`[Interactor] Removed from list:`, object.name);
    }

    onInteract() {
        if (this.interactableObjects.size === 0) return;

        // 最も近くにあるオブジェクト or リストの最初のオブジェクトを対象にする
        const targetObject = this.interactableObjects.values().next().value;
        
        console.log(`[Interactor] Interact key pressed! Firing 'onInteract' for`, targetObject.name);

        // 対象オブジェクトの 'onInteract' イベントを強制的に実行させる
        const events = targetObject.getData('events') || [];
        for (const eventData of events) {
            if (eventData.trigger === 'onInteract') {
                this.scene.actionInterpreter.run(targetObject, eventData.actions, this.target);
            }
        }
    }

    destroy() {
        this.interactKey.off('down', this.onInteract, this);
    }
}