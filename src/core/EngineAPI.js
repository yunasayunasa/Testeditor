/**
 * Odyssey Engineの全てのグローバル機能への公式アクセスポイント。
 */
class EngineAPI {
    constructor() {
        this.systemScene = null;
        this.transitionManager = null;
        this.overlayManager = null;
        this.timeManager = null;
        this.gameFlowManager = null;
        this.pendingJumpRequest = null;
    }

    /**
     * SystemSceneによって呼び出され、全てのマネージャーを引き継ぐ。
     * @param {import('../scenes/SystemScene.js').default} systemSceneInstance
     */
    init(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
        this.transitionManager = systemSceneInstance.transitionManager;
        this.overlayManager = systemSceneInstance.overlayManager;
        this.timeManager = systemSceneInstance.timeManager;
        // gameFlowManagerはSystemSceneが直接セットする
    }

    /**
     * 現在アクティブな最前面のゲームプレイシーンのキーを取得するゲッター。
     * @returns {string | null}
     */
    get activeGameSceneKey() {
        if (!this.systemScene || this.systemScene.sceneStack.length === 0) {
            return null;
        }
        return this.systemScene.sceneStack[this.systemScene.sceneStack.length - 1];
    }

    /**
     * 時間が停止しているかどうかを問い合わせるゲッター。
     * @returns {boolean}
     */
    get isTimeStopped() {
        if (!this.timeManager) return false;
        return this.timeManager.isTimeStopped;
    }
    
    /**
     * APIが利用可能かどうかを確認する。
     * @returns {boolean}
     */
    isReady() {
        return this.systemScene !== null;
    }

    // --- Game Flow ---
    fireGameFlowEvent(eventName) {
        console.log(`%c[EngineAPI] Game Flow Event Fired: ${eventName}. Relaying to GameFlowManager.`, 'color: #2196F3; font-weight: bold;');
        if (!this.gameFlowManager) return;
        this.gameFlowManager.handleEvent(eventName);
    }

    // --- Scene Transitions ---
    requestSimpleTransition(fromSceneKey, toSceneKey, params = {}) {
        if (!this.transitionManager) return;
        this.transitionManager.handleSimpleTransition({ from: fromSceneKey, to: toSceneKey, params });
    }

    requestReturnToNovel(fromSceneKey, params = {}) {
        if (!this.transitionManager) return;
        this.transitionManager.handleReturnToNovel({ from: fromSceneKey, params });
    }

    requestJump(fromSceneKey, toSceneKey, params = {}) {
        console.log(`%c[EngineAPI] JUMP request received and PENDING. Waiting for ${fromSceneKey} to shut down.`, 'color: #FFC107; font-weight: bold;');
        this.pendingJumpRequest = { to: toSceneKey, params: params };
    }

    // --- Overlays ---
    requestPauseMenu(fromSceneKey, layoutKey, params = {}) {
        if (!this.overlayManager) return;
        this.overlayManager.openMenuOverlay({ from: fromSceneKey, layoutKey, params });
    }

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

    requestCloseOverlay(fromSceneKey, overlayData = {}) {
        if (!this.overlayManager) return;
        this.overlayManager.closeOverlay({ from: fromSceneKey, ...overlayData });
    }

    // --- Time Management ---
    stopTime() {
        if (!this.timeManager) return;
        this.timeManager.stopTime();
    }

    resumeTime() {
        if (!this.timeManager) return;
        this.timeManager.resumeTime();
    }

    // --- Misc ---
    fireEvent(eventName, data = null) {
        if (!this.systemScene) return;
        this.systemScene.events.emit(eventName, data);
    }
    
} // ★★★ ここがクラスの正しい閉じ括弧 ★★★

const engineAPI = new EngineAPI();
export default engineAPI;

