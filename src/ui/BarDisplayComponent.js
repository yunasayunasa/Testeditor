// src/components/ui/BarDisplayComponent.js

export default class BarDisplayComponent {
    /**
     * @param {Phaser.Scene} scene
     * @param {Phaser.GameObjects.GameObject} gameObject - アタッチ先のUIオブジェクト (ImageやGraphicsなど)
     * @param {object} params
     * @param {string} params.maxValueVariable - 最大値を表すゲーム変数 (例: "f.player_max_hp")
     */
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.maxValueVariable = params.maxValueVariable;

        this.stateManager = this.scene.registry.get('stateManager');

        // ★★★ 神経からの信号を待つ ★★★
        this.gameObject.on('onValueChanged', this.updateBar, this);
    }

    /**
     * WatchVariableComponentから'onValueChanged'イベントが発行されたときに呼ばれる
     * @param {number} currentValue - 現在の値 (例: 80)
     */
    updateBar(currentValue) {
        if (!this.stateManager) return;
        
        // 最大値を取得
        const maxValue = this.stateManager.getValue(this.maxValueVariable) || 100;
        
        // 割合を計算 (0から1の範囲にクランプ)
        const percentage = Phaser.Math.Clamp(currentValue / maxValue, 0, 1);
           console.log(`%c[LOG BOMB 3 | BarDisplay] '${this.gameObject.name}'が'onValueChanged'を受信しました。
        - 受け取った現在値: ${currentValue}
        - 最大値の変数'${this.maxValueVariable}'から取得した値: ${maxValue}
        - 計算された割合: ${percentage}
        - scaleXを ${percentage} に設定します。`, 'color: lime; font-size: 1.2em;');
        // ★★★ アタッチされたオブジェクトのスケールを変更 ★★★
        this.gameObject.scaleX = percentage;
    }

    destroy() {
        // 登録したリスナーを解除
        this.gameObject.off('onValueChanged', this.updateBar, this);
    }
}

BarDisplayComponent.define = {
    params: [
        { 
            key: 'maxValueVariable',
            type: 'text',
            label: '最大値の変数',
            defaultValue: ''
        }
    ]
};