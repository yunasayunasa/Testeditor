
// src/components/ui/TextDisplayComponent.js

export default class TextDisplayComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {Phaser.GameObjects.Text} gameObject - ★アタッチ先はTextオブジェクトを想定
     * @param {object} params
     * @param {string} params.template - 表示テンプレート (例: "SCORE: {value}")
     */
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.template = params.template || "{value}"; // デフォルトは値そのものを表示

        // --- ガード節: アタッチ先がTextオブジェクトでなければ警告を出す ---
        if (!(this.gameObject instanceof Phaser.GameObjects.Text)) {
            console.warn(`[TextDisplayComponent] This component should be attached to a Text object, but was attached to a ${gameObject.constructor.name}.`);
            return;
        }

        // --- 神経からの信号を待つ ---
        this.gameObject.on('onValueChanged', this.updateText, this);
    }

    /**
     * WatchVariableComponentから'onValueChanged'イベントが発行されたときに呼ばれる
     * @param {*} currentValue - 現在の値 (数値でも文字列でもOK)
     */
    updateText(currentValue) {
        // テンプレート内の'{value}'という文字列を、受け取った実際の値に置き換える
        const newText = this.template.replace('{value}', currentValue);
        
        this.gameObject.setText(newText);
    }

    destroy() {
        this.gameObject.off('onValueChanged', this.updateText, this);
    }
}