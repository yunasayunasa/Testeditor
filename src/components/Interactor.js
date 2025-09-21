// src/components/Interactor.js

export default class Interactor {
    constructor(scene, target, params = {}) { // ← 引数名は'target'のままでOK
        this.scene = scene;
        this.gameObject = target; // ★★★ this.target を this.gameObject に変更 ★★★
        this.interactKey = scene.input.keyboard.addKey(params.key || 'UP');
        
        this.interactableObjects = new Set();

        this.interactKey.on('down', this.onInteract, this);
    }

    add(object) {
        this.interactableObjects.add(object);
        console.log(`[Interactor] Added to list:`, object.name);
    }

    remove(object) {
        this.interactableObjects.delete(object);
        console.log(`[Interactor] Removed from list:`, object.name);
    }

    onInteract() {
        if (this.interactableObjects.size === 0) return;

        const targetObject = this.interactableObjects.values().next().value;
        
        console.log(`[Interactor] Interact key pressed! Firing 'onInteract' for`, targetObject.name);

        const events = targetObject.getData('events') || [];
        for (const eventData of events) {
            if (eventData.trigger === 'onInteract') {
                // ★★★ 第3引数に渡すのは、インタラクターを持つオブジェクト自身 (プレイヤーなど) ★★★
                this.scene.actionInterpreter.run(targetObject, eventData.actions, this.gameObject);
            }
        }
    }

    destroy() {
        this.interactKey.off('down', this.onInteract, this);
    }
}