// in src/components/Interactor.js (最終・完成版)

export default class Interactor {
    constructor(scene, owner, params = {}) {
        this.scene = owner.scene;
        this.gameObject = owner;
        
        // --- パラメータ ---
        this.interactKeyName = params.key || 'UP'; // ★ キーの名前を保持
        this.interactKey = scene.input.keyboard.addKey(this.interactKeyName);
        this.interactionRadius = params.radius || 50; // ★ 対話可能な半径
        this.targetGroup = params.targetGroup || 'interactable'; // ★ 対話対象のグループ
        
        // --- 内部状態 ---
        this.closestInteractable = null; // 最も近い対話可能なオブジェクト

        // --- イベントリスナー ---
        this.interactKey.on('down', this.onInteract, this);
        // ★ スマホ対応のために、UIボタンからのイベントもリッスンする
        this.scene.events.on('interact_button_pressed', this.onInteract, this);
    }

    /**
     * updateループで、対話可能なオブジェクトを常に探し続ける
     */
    update(time, delta) {
        // BaseGameSceneのヘルパーを使い、指定されたグループの全オブジェクトを取得
        const candidates = this.scene.getObjectsByGroup(this.targetGroup);
        if (!candidates || candidates.length === 0) {
            this.closestInteractable = null;
            return;
        }

        let closest = null;
        let minDistance = this.interactionRadius; // ★ 半径内のオブジェクトのみを対象

        for (const candidate of candidates) {
            const distance = Phaser.Math.Distance.BetweenPoints(this.gameObject, candidate);
            if (distance < minDistance) {
                minDistance = distance;
                closest = candidate;
            }
        }
        
        // ★ 最も近いオブジェクトが変わったか？
        if (this.closestInteractable !== closest) {
            // TODO: オブジェクトの上に「！」アイコンを表示/非表示するなどのUIフィードバックをここで行う
            this.closestInteractable = closest;
        }
    }

    /**
     * インタラクトキー、またはUIボタンが押されたときに呼ばれる
     */
    onInteract() {
        // 対話可能なオブジェクトが範囲内にいなければ、何もしない
        if (!this.closestInteractable) return;

        console.log(`[Interactor] Interact command fired for '${this.closestInteractable.name}'`);

        // ★ 最も近いオブジェクトの 'onInteract' イベントを発火させる
        const events = this.closestInteractable.getData('events') || [];
        for (const eventData of events) {
            if (eventData.trigger === 'onInteract') {
                this.scene.actionInterpreter.run(this.closestInteractable, eventData, this.gameObject);
            }
        }
    }

    destroy() {
        this.interactKey.off('down', this.onInteract, this);
        this.scene.events.off('interact_button_pressed', this.onInteract, this);
    }
}

/**
 * ★★★ 自己定義(define)を追加 ★★★
 */
Interactor.define = {
    params: [
        { key: 'key', type: 'text', label: 'インタラクトキー', defaultValue: 'UP' },
        { key: 'radius', type: 'range', label: '対話半径', min: 10, max: 200, step: 5, defaultValue: 50 },
        { key: 'targetGroup', type: 'text', label: '対話対象のGroup', defaultValue: 'interactable' }
    ]
};