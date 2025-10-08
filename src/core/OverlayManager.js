// ▼▼▼【これが最も重要です】▼▼▼
// ファイルの先頭で、NovelOverlaySceneクラスを静的にインポートします。
// これにより、JavaScriptエンジンはOverlayManagerを読み込む時点で
// NovelOverlaySceneの存在を確実に知ることができます。
import NovelOverlayScene from '../scenes/NovelOverlayScene.js';

export default class OverlayManager {
    /** @type {import('../scenes/SystemScene.js').default} */
    systemScene;

    constructor(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
    }

    openMenuOverlay(data) {
        console.log(`%c[OverlayManager] Launching Menu Overlay (Layout: ${data.layoutKey})`, "color: #00BCD4; font-weight: bold;");
        this.systemScene.scene.launch('OverlayScene', { layoutKey: data.layoutKey, ...data.params });
    }

    openNovelOverlay(data) {
        console.log(`%c[OverlayManager] Opening Novel Overlay (Scenario: ${data.scenario})`, "color: #00BCD4; font-weight: bold;");
        const { from, scenario, block_input } = data;
        const sceneToLaunch = 'NovelOverlayScene';

        if (this.systemScene.scene.get(sceneToLaunch)) {
            this.systemScene.scene.remove(sceneToLaunch);
            console.log(`[OverlayManager] Removed stale instance of '${sceneToLaunch}'.`);
        }

        // ▼▼▼【エラーを解決する核心部分】▼▼▼
        // 先頭でimportした NovelOverlayScene クラスをここで使います。
        // 'require' はもう使いません。
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

    closeOverlay(data) {
        console.group(`%c[OverlayManager] Group: closeOverlay (with scene removal)`, "color: #00BCD4;");
        console.log(`Request data:`, data);

        const closingSceneKey = data.from;

        if (this.systemScene.scene.isActive(closingSceneKey)) {
            this.systemScene.scene.stop(closingSceneKey);
            console.log(`Scene '${closingSceneKey}' stopped.`);

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