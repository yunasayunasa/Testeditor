// src/core/EngineAPI.js (あるいは src/EngineAPI.js)

/**
 * Odyssey Engineの全てのグローバル機能への公式アクセスポイント。
 * 各シーンはこのAPIを通じてエンジン中枢と通信する。
 * これにより、SystemSceneの内部実装と各シーンを疎結合に保つ。
 */
class EngineAPI {
    constructor() {
        /** @type {import('../scenes/SystemScene.js').default | null} */
        this.systemScene = null;
    }

    /**
     * SystemSceneによって呼び出され、APIを初期化する。
     * @param {import('../scenes/SystemScene.js').default} systemSceneInstance 
     */
    init(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
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
        if (!this.isReady()) return;
        this.systemScene.events.emit('request-simple-transition', { from: fromSceneKey, to: toSceneKey, params });
    }
    
    /**
     * ゲームシーンからノベルシーンへ復帰するようリクエストする。
     * @param {string} fromSceneKey 呼び出し元のシーンキー
     */
    requestReturnToNovel(fromSceneKey) {
        if (!this.isReady()) return;
        this.systemScene.events.emit('return-to-novel', { from: fromSceneKey });
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

    /**
 * [jump]タグからのシーン遷移リクエストを処理する。
 * @param {string} fromSceneKey 
 * @param {string} toSceneKey 
 * @param {object} [params={}] 
 */
requestJump(fromSceneKey, toSceneKey, params = {}) {
    console.log(`%c[EngineAPI] Request received: jump (from: ${fromSceneKey}, to: ${toSceneKey})`, 'color: #2196F3; font-weight: bold;');
    if (!this.isReady()) return;
    this.systemScene.events.emit('request-simple-transition', {
        from: fromSceneKey,
        to: toSceneKey,
        params: params,
    });
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
}

// シングルトンインスタンスを作成してエクスポート
const engineAPI = new EngineAPI();
export default engineAPI;