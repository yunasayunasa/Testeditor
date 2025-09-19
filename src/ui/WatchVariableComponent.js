// src/components/ui/WatchVariableComponent.js

export default class WatchVariableComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
        this.variableToWatch = params.variable;

        this.stateManager = this.scene.registry.get('stateManager');
        if (!this.stateManager) return;

        this.lastValue = null;
        this.listener = (key, value) => this.onVariableChanged(key, value);
        
        // --- StateManagerの変更イベントを購読開始 ---
        this.stateManager.on('f-variable-changed', this.listener);

        // ▼▼▼【ここが、今回の修正の核心です】▼▼▼
        // --------------------------------------------------------------------
        // ★★★ コンポーネントが生成された「後」、次のフレームで初期値を確認する ★★★
        // これにより、他のすべてのオブジェクトの初期化が終わるのを待つことができる。
        this.scene.time.delayedCall(0, () => this.checkInitialValue());
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
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
     * ★★★ 強化版 ★★★
     * コンポーネント生成時に、一度だけ現在の変数の値を確認し、UIに反映させる
     */
    checkInitialValue() {
        if (!this.variableToWatch) return; // 監視対象がなければ何もしない

        // ★ stateManagerから、現在の最新の値を取得
        const initialValue = this.stateManager.getValue(this.variableToWatch);
        
        console.log(`%c[WatchVariableComponent] Initial check for '${this.variableToWatch}'. Current value is: ${initialValue}`, "color: yellow;");

        // ★ 値が存在する場合のみ、イベントを発行
        if (initialValue !== undefined) {
            // ★★★ 2回イベントが発行されるのを防ぐため、lastValueと比較する ★★★
            if (this.lastValue !== initialValue) {
                this.gameObject.emit('onValueChanged', initialValue, this.lastValue);
                this.lastValue = initialValue;
            }
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