// src/core/EngineAPI.js (あるいは src/EngineAPI.js)

/**
 * Odyssey Engineの全てのグローバル機能への公式アクセスポイント。
 * 各シーンはこのAPIを通じてエンジン中枢と通信する。
 * これにより、SystemSceneの内部実装と各シーンを疎結合に保つ。
 */
class EngineAPI {
    constructor() {
             this.systemScene = null;
        /** @type {import('./SceneTransitionManager.js').default | null} */
        this.transitionManager = null; // ★ プロパティ追加
this.pendingJumpRequest = null; // ★ 予約票を保管するプロパティを追加
    }

    /**
     * SystemSceneによって呼び出され、APIを初期化する。
     * @param {import('../scenes/SystemScene.js').default} systemSceneInstance 
     */
        init(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
        // ★ SystemSceneが設立した専門部署を、司令塔も把握する
        this.transitionManager = systemSceneInstance.transitionManager;
    }

    /**
     * APIが利用可能かどうかを確認する。
     * @returns {boolean}
     */
    isReady() {
        return this.systemScene !== null;
    }

    // --- ここから下に、SystemSceneの機能を翻訳したメソッドを追加していく ---

    /**
     * シンプルなシーン遷移をリクエストする。
     * @param {string} fromSceneKey 遷移元のシーンキー
     * @param {string} toSceneKey 遷移先のシーンキー
     * @param {object} [params={}] 遷移先のシーンに渡すデータ
     */
    requestSimpleTransition(fromSceneKey, toSceneKey, params = {}) {
        if (!this.transitionManager) return;
        // ★ 伝達先を events.emit から transitionManager のメソッド呼び出しに変更
        this.transitionManager.handleSimpleTransition({ from: fromSceneKey, to: toSceneKey, params });
    }
    
    requestReturnToNovel(fromSceneKey, params = {}) {
        if (!this.transitionManager) return;
        // ★ 伝達先を events.emit から transitionManager のメソッド呼び出しに変更
        this.transitionManager.handleReturnToNovel({ from: fromSceneKey, params });
    }

    /**
     * ポーズメニューのようなオーバーレイメニューの表示をリクエストする。
     * @param {string} fromSceneKey 呼び出し元のシーンキー
     * @param {string} layoutKey 表示するメニューのレイアウトキー
     * @param {object} [params={}] メニューシーンに渡す追加データ
     */
    requestPauseMenu(fromSceneKey, layoutKey, params = {}) {
        if (!this.isReady()) return;
        this.systemScene.events.emit('request-pause-menu', { from: fromSceneKey, layoutKey, params });
    }
    
    /**
     * 表示中のメニューを閉じるようリクエストする。
     * @param {string} fromSceneKey 呼び出し元（メニューシーン自身）のキー
     */
    requestCloseMenu(fromSceneKey) {
        console.log(`%c[EngineAPI] Request received: closeMenu (from: ${fromSceneKey})`, 'color: #2196F3; font-weight: bold;');
        if (!this.isReady()) return;
        this.systemScene.events.emit('request-close-menu', { from: fromSceneKey });
    }

   

runScenarioAsOverlay(fromSceneKey, scenarioFile, blockInput) {
    console.log(`%c[EngineAPI] Request received: runScenarioAsOverlay (from: ${fromSceneKey}, file: ${scenarioFile})`, 'color: #2196F3; font-weight: bold;');
    if (!this.isReady()) return Promise.resolve(); // APIが準備できてなければ即座に終了

    return new Promise(resolve => {
        this.systemScene.events.emit('request-overlay', {
            from: fromSceneKey,
            scenario: scenarioFile,
            block_input: blockInput
        });

        this.systemScene.events.once('end-overlay', () => {
            resolve();
        });
    });
}

// src/core/EngineAPI.js

/**
 * システム全体にカスタムイベントを発行する。
 * @param {string} eventName 発行するイベントの名前
 * @param {any} [data=null] イベントに渡すデータ
 */
fireEvent(eventName, data = null) {
    console.log(`%c[EngineAPI] Request received: fireEvent (name: ${eventName})`, 'color: #2196F3; font-weight: bold;');
    if (!this.isReady()) return;
    this.systemScene.events.emit(eventName, data);
}

// src/core/EngineAPI.js
/**
 * @param {string} fromSceneKey
 * @param {object} [params={}] ノベルシーンに渡すデータ
 */
requestReturnToNovel(fromSceneKey, params = {}) { // ★ params引数を追加
    console.log(`%c[EngineAPI] Request received: returnToNovel (from: ${fromSceneKey})`, 'color: #2196F3; font-weight: bold;');
    if (!this.isReady()) return;
    this.systemScene.events.emit('return-to-novel', { from: fromSceneKey, params }); // ★ paramsを渡す
}
// src/core/EngineAPI.js

/**
 * [jump]タグからの特別なシーン遷移リクエストを処理する。
 * @param {string} fromSceneKey 
 * @param {string} toSceneKey 
 * @param {object} [params={}] 
 */
requestJump(fromSceneKey, toSceneKey, params = {}) {
        console.log(`%c[EngineAPI] JUMP request received and PENDING. Waiting for ${fromSceneKey} to shut down.`, 'color: #FFC107; font-weight: bold;');
        
        // ★ すぐに実行せず、予約票として保管する
        this.pendingJumpRequest = { to: toSceneKey, params: params };
    }


/**
 * 現在のオーバーレイシーンを終了するようリクエストする。
 * @param {string} fromSceneKey オーバーレイシーン自身のキー
 */
requestEndOverlay(fromSceneKey) {
    console.log(`%c[EngineAPI] Request received: endOverlay (from: ${fromSceneKey})`, 'color: #2196F3; font-weight: bold;');
    if (!this.isReady()) return;
    // ★ SystemSceneの 'end-overlay' イベントを呼び出す
    this.systemScene.events.emit('end-overlay', { from: fromSceneKey });
}
}

// シングルトンインスタンスを作成してエクスポート
const engineAPI = new EngineAPI();
export default engineAPI;