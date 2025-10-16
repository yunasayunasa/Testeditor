/**
 * VisibilityComponent
 * 指定されたゲーム変数を監視し、条件に基づいてGameObjectの表示/非表示を切り替える。
 */
export default class VisibilityComponent {
    constructor(scene, gameObject, params) {
        this.gameObject = gameObject;
        
        // --- 監視対象のWatchVariableComponentを探す ---
        // params.variableで指定された変数を監視しているWatchVariableComponentを見つける
        this.watchComponent = this.findWatcher(params.variable);
        
        // --- 表示条件 ---
        // JSON.parseを使って、'true'/'false'の文字列をbooleanに変換する
        try {
            this.visibleWhen = JSON.parse(String(params.condition).toLowerCase());
        } catch (e) {
            this.visibleWhen = true; // パース失敗時はデフォルトでtrue
        }

        if (this.watchComponent) {
            this.onValueChange = (newValue) => {
                const conditionMet = (newValue === this.visibleWhen);
                this.gameObject.setVisible(conditionMet);
            };
            
            // WatchVariableComponentが発するイベントをリッスン開始
            this.watchComponent.gameObject.on('onValueChanged', this.onValueChange);
            
            // 初期値で一度チェック
            this.watchComponent.checkInitialValue();
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
     * 同じGameObjectにアタッチされているWatchVariableComponentの中から、
     * 指定された変数を監視しているインスタンスを探して返す。
     */
    findWatcher(variableName) {
        if (!this.gameObject.components || !variableName) return null;
        
        for (const key in this.gameObject.components) {
            const component = this.gameObject.components[key];
            if (component.constructor.name === 'WatchVariableComponent' && component.variableToWatch === variableName) {
                return component;
            }
        }
        return null;
    }

    // コンポーネント破棄時の後片付け
    destroy() {
        if (this.watchComponent && this.onValueChange) {
            this.watchComponent.gameObject.off('onValueChanged', this.onValueChange);
        }
    }
}