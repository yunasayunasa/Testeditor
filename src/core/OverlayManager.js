// src/core/OverlayManager.js

/**
 * オーバーレイシーンやメニューの表示・ライフサイクルを管理する専門クラス。
 */
export default class OverlayManager {
    /** @type {import('../scenes/SystemScene.js').default} */
    systemScene;

    constructor(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
    }

    /**
     * ポーズメニューを開く (SystemSceneから移植)
     * @param {object} data - { from, layoutKey, params }
     */
    handleOpenPauseMenu(data) {
        console.log(`%c[OverlayManager] Handling open pause menu request.`, "color: #00BCD4; font-weight: bold;");
        const fromScene = data.from;
        const menuLayoutKey = data.layoutKey;
        const sceneToLaunch = 'OverlayScene';

        if (this.systemScene.scene.isActive(fromScene)) {
            this.systemScene.scene.pause(fromScene);
            this.systemScene.sceneStack.push(fromScene);
            this.systemScene.gameState = 'MENU';
            this.systemScene.scene.launch(sceneToLaunch, { layoutKey: menuLayoutKey, ...data.params });
        }
    }

    /**
     * ポーズメニューを閉じる (SystemSceneから移植)
     * @param {object} data - { from }
     */
    handleClosePauseMenu(data) {
        console.log(`%c[OverlayManager] Handling close pause menu request.`, "color: #00BCD4; font-weight: bold;");
        const closingMenu = data.from;
        
        if (this.systemScene.sceneStack.length === 0) return;

        const sceneToResume = this.systemScene.sceneStack.pop();

        if (sceneToResume) {
            this.systemScene.scene.stop(closingMenu);
            if (this.systemScene.scene.isPaused(sceneToResume)) {
                this.systemScene.scene.resume(sceneToResume);
            } else {
                this.systemScene.scene.run(sceneToResume);
                this.systemScene.scene.bringToTop(sceneToResume);
                this.systemScene.scene.bringToTop('UIScene');
            }
            this.systemScene.gameState = (sceneToResume === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';
        }
    }

    /**
     * オーバーレイ(シナリオ)表示のリクエストを処理 (SystemSceneから移植)
     * @param {object} data - { from, scenario, block_input }
     */
    handleRequestOverlay(data) {
        console.log(`%c[OverlayManager] Handling request overlay.`, "color: #00BCD4; font-weight: bold;");
        const shouldBlockInput = (data.block_input !== false);

        if (shouldBlockInput) {
            const fromScene = this.systemScene.scene.get(data.from);
            if (fromScene && fromScene.scene.isActive()) {
                fromScene.input.enabled = false;
            }
        }
        // NovelOverlaySceneという名前はハードコードされていますが、一旦そのままでOK
        this.systemScene.scene.launch('NovelOverlayScene', { 
            scenario: data.scenario,
            charaDefs: this.systemScene.globalCharaDefs,
            returnTo: data.from,
            inputWasBlocked: shouldBlockInput 
        });
    }

    /**
     * オーバーレイ(シナリオ)終了のリクエストを処理 (SystemSceneから移植)
     * @param {object} data - { from, returnTo, inputWasBlocked }
     */
    handleEndOverlay(data) {
        console.log(`%c[OverlayManager] Handling end overlay.`, "color: #00BCD4; font-weight: bold;");
        if (this.systemScene.scene.isActive(data.from)) {
            this.systemScene.scene.stop(data.from); 
        }
        const uiScene = this.systemScene.scene.get('UIScene');
        if (uiScene) {
            uiScene.onSceneTransition(data.returnTo);
        }
        if (data.inputWasBlocked) {
            const returnScene = this.systemScene.scene.get(data.returnTo);
            if (returnScene && returnScene.scene.isActive()) { 
                returnScene.input.enabled = true; 
            }
        }
    }
}
