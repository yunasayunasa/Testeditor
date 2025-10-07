// src/core/OverlayManager.js (改訂版)

export default class OverlayManager {
    /** @type {import('../scenes/SystemScene.js').default} */
    systemScene;

    constructor(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
    }

    /**
     * ★ 汎用的なメニュー/UIオーバーレイを開く ★
     * 主にポーズメニューなどで使用。
     * @param {object} data - { from, layoutKey, params }
     */
   // src/core/OverlayManager.js
openMenuOverlay(data) {
    // pauseScene や sceneStack の管理は GameFlowManager が行う
    console.log(`%c[OverlayManager] Launching Menu Overlay (Layout: ${data.layoutKey})`, "color: #00BCD4; font-weight: bold;");
    this.systemScene.scene.launch('OverlayScene', { layoutKey: data.layoutKey, ...data.params });
}

    /**
     * ★ ノベルパートのオーバーレイを開く ★
     * 主に [run_scenario] で使用。
     * @param {object} data - { from, scenario, block_input }
     */
    openNovelOverlay(data) {
       

        this.systemScene.scene.launch(sceneToLaunch, { 
            scenario,
            charaDefs: this.systemScene.globalCharaDefs,
            returnTo: from,
            inputWasBlocked: shouldBlockInput 
        });
    }

    /**
     * ★ 全てのオーバーレイに共通の「閉じる」処理 ★
     * @param {object} data - { from, returnTo(NovelOverlay用), inputWasBlocked(NovelOverlay用) }
     */
  // src/core/OverlayManager.js の中に、このメソッドを貼り付け（または上書き）してください

    /**
     * ★ 全てのオーバーレイに共通の「閉じる」処理 (デバッグログ強化版) ★
     * @param {object} data - { from, returnTo(NovelOverlay用), inputWasBlocked(NovelOverlay用) }
     */
   closeOverlay(data) {
    // pop や resume は GameFlowManager の仕事
    this.systemScene.scene.stop(data.from);
        // --- 外部に終了を通知 ---
        this.systemScene.events.emit('overlay-closed', { from: closingSceneKey, to: sceneToResumeKey });
        console.log(`Event 'overlay-closed' emitted.`);

    }
}