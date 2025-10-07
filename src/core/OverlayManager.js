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
    openMenuOverlay(data) {
        console.log(`%c[OverlayManager] Opening Menu Overlay (Layout: ${data.layoutKey})`, "color: #00BCD4; font-weight: bold;");
        const { from, layoutKey, params } = data;
        const sceneToLaunch = 'OverlayScene'; // ★ 対象シーンは 'OverlayScene'

        if (this.systemScene.scene.isActive(from)) {
            this.systemScene.scene.pause(from);
            this.systemScene.sceneStack.push(from);
            this.systemScene.gameState = 'MENU';
            this.systemScene.scene.launch(sceneToLaunch, { layoutKey, ...params });
        }
    }

    /**
     * ★ ノベルパートのオーバーレイを開く ★
     * 主に [run_scenario] で使用。
     * @param {object} data - { from, scenario, block_input }
     */
    openNovelOverlay(data) {
        console.log(`%c[OverlayManager] Opening Novel Overlay (Scenario: ${data.scenario})`, "color: #00BCD4; font-weight: bold;");
        const { from, scenario, block_input } = data;
        const sceneToLaunch = 'NovelOverlayScene'; // ★ 対象シーンは 'NovelOverlayScene'
        
        const shouldBlockInput = (block_input !== false);
        if (shouldBlockInput) {
            const fromScene = this.systemScene.scene.get(from);
            if (fromScene?.scene.isActive()) {
                fromScene.input.enabled = false;
            }
        }

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
    closeOverlay(data) {
        console.log(`%c[OverlayManager] Closing Overlay: ${data.from}`, "color: #00BCD4; font-weight: bold;");
        const closingSceneKey = data.from;
        
        // --- 復帰先のシーンを決定する ---
        // NovelOverlaySceneはreturnToプロパティを持つが、OverlaySceneは持たない。
        // スタックから取り出すのが、より汎用的で安全。
        if (this.systemScene.sceneStack.length === 0) return;
        const sceneToResumeKey = this.systemScene.sceneStack.pop();

        // --- オーバーレイシーンを停止 ---
        if (this.systemScene.scene.isActive(closingSceneKey)) {
            this.systemScene.scene.stop(closingSceneKey); 
        }

        // --- 復帰先シーンの後処理 ---
        const sceneToResume = this.systemScene.scene.get(sceneToResumeKey);
        if (sceneToResume) {
            // 1. シーンを再開
            if (sceneToResume.scene.isPaused()) {
                sceneToResume.scene.resume();
            } else { // ポーズされていなかった場合も考慮
                sceneToResume.scene.run();
                sceneToResume.scene.bringToTop();
                this.systemScene.scene.bringToTop('UIScene');
            }

            // 2. UISceneを更新
            const uiScene = this.systemScene.scene.get('UIScene');
            if (uiScene) uiScene.onSceneTransition(sceneToResumeKey);
            
            // 3. 入力ブロックを解除 (NovelOverlayからの情報があれば)
            if (data.inputWasBlocked) {
                sceneToResume.input.enabled = true;
            }
        }
        
        // --- ゲーム状態を更新 ---
        this.systemScene.gameState = (sceneToResumeKey === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';

        // --- 外部に終了を通知 ---
        // run_scenario が待っているPromiseを解決するために必要
        this.systemScene.events.emit('overlay-closed', { from: closingSceneKey, to: sceneToResumeKey });
    }
}
