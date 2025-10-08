import NovelOverlayScene from '../scenes/NovelOverlayScene.js';

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
     * 毎回新しいシーンインスタンスを生成することを保証する。
     * @param {object} data - { from, scenario, block_input }
     */
    openNovelOverlay(data) {
        console.log(`%c[OverlayManager] Opening Novel Overlay (Scenario: ${data.scenario})`, "color: #00BCD4; font-weight: bold;");
        const { from, scenario, block_input } = data;
        const sceneToLaunch = 'NovelOverlayScene';

        // 1. もし古いNovelOverlaySceneが残っていたら、念のため削除する
        if (this.systemScene.scene.get(sceneToLaunch)) {
            this.systemScene.scene.remove(sceneToLaunch);
            console.log(`[OverlayManager] Removed stale instance of '${sceneToLaunch}'.`);
        }

        // 2. 起動する前に、必ずシーンをPhaserに「追加」する
        this.systemScene.scene.add(sceneToLaunch, NovelOverlayScene, false);
        console.log(`[OverlayManager] Added a new, clean instance of '${sceneToLaunch}'.`);

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
     * NovelOverlaySceneの場合は、シーンを完全に削除する。
     * @param {object} data - { from, returnTo(NovelOverlay用), inputWasBlocked(NovelOverlay用) }
     */
    closeOverlay(data) {
        console.group(`%c[OverlayManager] Group: closeOverlay (with scene removal)`, "color: #00BCD4;");
        console.log(`Request data:`, data);

        const closingSceneKey = data.from;

        if (this.systemScene.scene.isActive(closingSceneKey)) {
            this.systemScene.scene.stop(closingSceneKey);
            console.log(`Scene '${closingSceneKey}' stopped.`);

            // NovelOverlaySceneは再利用せず、毎回破棄する
            if (closingSceneKey === 'NovelOverlayScene') {
                this.systemScene.scene.remove(closingSceneKey);
                console.log(`%c[OverlayManager] Scene '${closingSceneKey}' was completely removed to ensure clean state on next launch.`, "color: #E91E63; font-weight: bold;");
            }
        }

        const sceneToResumeKey = this.systemScene.sceneStack.length > 0
            ? this.systemScene.sceneStack[this.systemScene.sceneStack.length - 1]
            : null;

        if (sceneToResumeKey) {
            const uiScene = this.systemScene.scene.get('UIScene');
            if (uiScene) {
                uiScene.onSceneTransition(sceneToResumeKey);
            }
        }
        
        if (data.inputWasBlocked) {
            const returnScene = this.systemScene.scene.get(data.returnTo);
            if (returnScene?.scene.isPaused()) {
                returnScene.input.enabled = true;
            }
        }

        this.systemScene.events.emit('overlay-closed', { from: closingSceneKey, to: sceneToResumeKey });
        console.log(`Event 'overlay-closed' emitted.`);
        console.groupEnd();
    }
}