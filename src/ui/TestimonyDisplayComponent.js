export default class TestimonyDisplayComponent {
    constructor(scene, gameObject, params) {
        this.scene = scene;
        this.gameObject = gameObject; // このコンポー-ネントがアタッチされたTextオブジェクト
        
        // --- エディタから設定されるパラメータ ---
        this.testimonyIdVariable = params.testimonyIdVariable || 'f.current_testimony_id';
        
        // --- 内部状態 ---
        this.testimonyData = null;
        this.currentStatementIndex = -1;

        // --- StateManagerの取得 ---
        this.stateManager = this.scene.registry.get('stateManager');

        // --- 同じオブジェクトにいるはずのWatchVariableComponentからのイベントを待つ ---
        this.gameObject.on('onValueChanged', this.handleIndexChange, this);
    }

    // ★静的プロパティ: EditorPluginがこの定義を読み取ってUIを自動生成する
    static define = {
        params: [
            { 
                key: 'testimonyIdVariable',
                type: 'text',
                label: '証言データIDの変数',
                defaultValue: 'f.current_testimony_id'
            }
        ]
    };

    /**
     * WatchVariableComponentからインデックス変更の通知を受け取った時の処理
     * @param {number} newIndex - 新しい証言のインデックス
     */
    handleIndexChange(newIndex) {
        if (newIndex === undefined || newIndex === null || newIndex < 0) {
            this.gameObject.setText(''); // インデックスが無効ならテキストを空にする
            return;
        }

        const testimonyIdKey = this.testimonyIdVariable.replace('f.', '');
        const testimonyId = this.stateManager.getValue(`f.${testimonyIdKey}`);

        if (!testimonyId) return; // 証言IDがセットされていなければ何もしない

        // キャッシュから証言データを取得
        this.testimonyData = this.scene.cache.json.get(testimonyId);

        if (!this.testimonyData || !this.testimonyData.statements) {
            console.warn(`[TestimonyDisplayComponent] 証言データ '${testimonyId}' が見つかりません。`);
            this.gameObject.setText('');
            return;
        }

        this.currentStatementIndex = newIndex;
        
        const statement = this.testimonyData.statements[this.currentStatementIndex];
        
        if (statement) {
           const formattedText = statement.text.replace(/\\n/g, '\n');
this.gameObject.setText(formattedText);
        } else {
            this.gameObject.setText(''); // 該当する証言がなければ空にする
        }
    }

    /**
     * このコンポーネントが破棄されるときに呼ばれるクリーンアップ処理
     */
    destroy() {
        // 'onValueChanged' の購読を解除する
        if (this.gameObject) {
            this.gameObject.off('onValueChanged', this.handleIndexChange, this);
        }
        console.log('[TestimonyDisplayComponent] destroyed.');
    }
}