/**
 * VisibilityComponent (スタンドアロン版)
 * 指定されたゲーム変数を直接監視し、条件に基づいてGameObjectの表示/非表示を切り替える。
 */
export default class VisibilityComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject;
        
        // --- パラメータ ---
        this.variableToWatch = params.variable;
        try {
            this.visibleWhen = JSON.parse(String(params.condition).toLowerCase());
        } catch (e) {
            this.visibleWhen = true;
        }

        // --- StateManagerの取得とイベントリスナーの設定 ---
        this.stateManager = this.scene.registry.get('stateManager');
        if (this.stateManager && this.variableToWatch) {
            // --- StateManagerの変更イベントを直接購読 ---
            this.listener = (key, value) => this.onVariableChanged(key, value);
            this.stateManager.on('f-variable-changed', this.listener);

            // --- 初期値で一度チェック ---
            // 次のフレームで実行し、他のすべての初期化が終わるのを待つ
            this.scene.time.delayedCall(0, () => this.checkInitialValue());
        }
    }

    // EditorPluginがUIを生成するための定義
    static define = {
        params: [
            { 
                key: 'variable',
                type: 'text',
                label: '監視する変数',
                defaultValue: ''
            },
            {
                key: 'condition',
                type: 'select',
                label: '表示条件 (変数がこの値の時)',
                options: ['true', 'false'],
                defaultValue: 'true'
            }
        ]
    };

    /**
     * StateManagerから変数の変更通知を受け取ったときの処理
     */
    onVariableChanged(key, value) {
        const watchKey = this.variableToWatch.replace('f.', '').trim();
        if (key.trim() === watchKey) {
            const conditionMet = (value === this.visibleWhen);
            this.gameObject.setVisible(conditionMet);
        }
    }

    /**
     * コンポーネント生成時に、一度だけ現在の変数の値を確認し、UIに反映させる
     */
    checkInitialValue() {
        if (!this.stateManager || !this.variableToWatch) return;

        const initialValue = this.stateManager.getValue(this.variableToWatch);
        if (initialValue !== undefined) {
            const conditionMet = (initialValue === this.visibleWhen);
            this.gameObject.setVisible(conditionMet);
        }
    }

    // コンポーネント破棄時の後片付け
    destroy() {
        if (this.stateManager && this.listener) {
            this.stateManager.off('f-variable-changed', this.listener);
        }
    }
}