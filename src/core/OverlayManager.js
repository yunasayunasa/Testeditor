export default class OverlayManager {
    /** @type {import('../scenes/SystemScene.js').default} */
    systemScene;

    constructor(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
    }

    /**
     * 汎用的なメニュー/UIオーバーレイを開く。
     * @param {object} data - { from, layoutKey, params }
     */
    openMenuOverlay(data) {
        console.log(`%c[OverlayManager] Launching Menu Overlay (Layout: ${data.layoutKey})`, "color: #00BCD4; font-weight: bold;");
        this.systemScene.scene.launch('OverlayScene', { layoutKey: data.layoutKey, ...data.params });
    }

    /**
     * ノベルパートのオーバーレイを開く。
     * @param {object} data - { from, scenario, block_input }
     */
    openNovelOverlay(data) {
        console.log(`%c[OverlayManager] Opening Novel Overlay (Scenario: ${data.scenario})`, "color: #00BCD4; font-weight: bold;");
        const { from, scenario, block_input } = data;
        const sceneToLaunch = 'NovelOverlayScene';
        
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
     * 全てのオーバーレイに共通の「閉じる」処理。
     * このメソッドはオーバーレイシーンを停止させることだけに責任を持つ。
     * 元のシーンのresumeはGameFlowManagerの責任。
     * @param {object} data - { from, returnTo(NovelOverlay用), inputWasBlocked(NovelOverlay用) }
     */
    closeOverlay(data) {
        console.group(`%c[OverlayManager] Group: closeOverlay (Simplified)`, "color: #00BCD4;");
        console.log(`Request data:`, data);

        const closingSceneKey = data.from;

        if (this.systemScene.scene.isActive(closingSceneKey)) {
            this.systemScene.scene.stop(closingSceneKey);
            console.log(`Scene '${closingSceneKey}' stopped.`);
        }

        const sceneToResumeKey = this.systemScene.sceneStack.length > 0
            ? this.systemScene.sceneStack[this.systemScene.sceneStack.length - 1]
            : null;

        if (sceneToResumeKey) {
            const uiScene = this.systemScene.scene.get('UIScene');
            if (uiScene) {
                console.log(`[OverlayManager] Updating UI for scene: ${sceneToResumeKey}`);
                uiScene.onSceneTransition(sceneToResumeKey);
            }
        }
        
        if (data.inputWasBlocked) {
            const returnScene = this.systemScene.scene.get(data.returnTo);
            if (returnScene?.scene.isPaused()) {
                returnScene.input.enabled = true;
                console.log(`Input for scene '${data.returnTo}' was re-enabled.`);
            }
        }

        this.systemScene.events.emit('overlay-closed', { from: closingSceneKey, to: sceneToResumeKey });
        console.log(`Event 'overlay-closed' emitted.`);
        console.groupEnd();
    }
}