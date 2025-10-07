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
        this.overlayManager = null;
    }

    /**
     * SystemSceneによって呼び出され、APIを初期化する。
     * @param {import('../scenes/SystemScene.js').default} systemSceneInstance 
     */
        init(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
        // ★ SystemSceneが設立した専門部署を、司令塔も把握する
        this.transitionManager = systemSceneInstance.transitionManager;
            this.overlayManager = systemSceneInstance.overlayManager;
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

    
// 'open_menu' タグから呼ばれる
requestPauseMenu(fromSceneKey, layoutKey, params = {}) {
    if (!this.overlayManager) return;
    this.overlayManager.openMenuOverlay({ from: fromSceneKey, layoutKey, params });
}

// 'run_scenario' タグから呼ばれる
runScenarioAsOverlay(fromSceneKey, scenarioFile, blockInput) {
    if (!this.overlayManager) return Promise.resolve();
    return new Promise(resolve => {
        this.overlayManager.openNovelOverlay({
            from: fromSceneKey,
            scenario: scenarioFile,
            block_input: blockInput
        });
        this.systemScene.events.once('overlay-closed', () => resolve());
    });
}

// 'close_menu' や 'overlay_end' タグから呼ばれる
requestCloseOverlay(fromSceneKey, overlayData = {}) {
    if (!this.overlayManager) return;
    // dataをマージして、必要な情報を全て渡す
    this.overlayManager.closeOverlay({ from: fromSceneKey, ...overlayData });
}
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


}

// シングルトンインスタンスを作成してエクスポート
const engineAPI = new EngineAPI();
export default engineAPI;
