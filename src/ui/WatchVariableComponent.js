// src/components/ui/WatchVariableComponent.js

export default class WatchVariableComponent {
    /**
     * @param {Phaser.Scene} scene - このコンポーネントが属するシーン
     * @param {Phaser.GameObjects.GameObject} gameObject - アタッチ先のUIオブジェクト
     * @param {object} params - エディタから設定されるパラメータ
     * @param {string} params.variable - 監視するゲーム変数 (例: "f.player_hp")
     */
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.variableToWatch = params.variable;

        // --- 必須サービスの取得 ---
        this.stateManager = this.scene.registry.get('stateManager');
        if (!this.stateManager) {
            console.error("[WatchVariableComponent] StateManager not found!");
            return;
        }

        // --- 最後の値と、リスナー関数を保存 ---
        this.lastValue = null;
        this.listener = (key, value) => this.onVariableChanged(key, value);

        // --- StateManagerの変更イベントを購読開始 ---
        // 'f-changed' は、f変数が変更されたときに発行されるイベントだと仮定
        this.stateManager.on('f-variable-changed', this.listener);

        // --- 初期値を取得して、一度イベントを発行する ---
        this.checkInitialValue();
    }

    /**
     * StateManagerから変数の変更通知を受け取ったときの処理
     * @param {string} key - 変更された変数のキー
     * @param {*} value - 新しい値
     */
   onVariableChanged(key, value) {
        // ★ 安全のためのガード節を追加
        if (!this.variableToWatch || typeof this.variableToWatch.replace !== 'function') {
            // variableToWatchが設定されていないか、文字列でない場合は何もしない
            return; 
        }

        const watchKey = this.variableToWatch.replace('f.', '');
        
        if (key === watchKey) {
            this.gameObject.emit('onValueChanged', value, this.lastValue);
            this.lastValue = value;
        }
    }

    /**
     * コンポーネント生成時に、一度だけ現在の変数の値を確認する
     */
    checkInitialValue() {
        const initialValue = this.stateManager.getValue(this.variableToWatch);
        if (initialValue !== undefined) {
            this.gameObject.emit('onValueChanged', initialValue, null); // 最初の前回値はnull
            this.lastValue = initialValue;
        }
    }

    /**
     * このコンポーネントが破棄されるときに呼ばれるクリーンアップ処理
     */
     destroy() {
        if (this.stateManager) {
            // ★★★ 購読した 'f-variable-changed' を解除する ★★★
            this.stateManager.off('f-variable-changed', this.listener);
        }
        console.log(`[WatchVariableComponent] for ${this.gameObject.name} destroyed.`);
    }
}