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
        const fromScene = this.systemScene.scene.get(data.from);
        if (fromScene?.scene.isActive()) {
            this.systemScene.scene.pause(data.from);
            this.systemScene.sceneStack.push(data.from); // ★ PUSH
            this.systemScene.gameState = 'MENU';
    this.systemScene.scene.launch('OverlayScene', { layoutKey: data.layoutKey, ...data.params });
}}

    /**
     * ★ ノベルパートのオーバーレイを開く ★
     * 主に [run_scenario] で使用。
     * @param {object} data - { from, scenario, block_input }
     */
   openNovelOverlay(data) {
        const fromScene = this.systemScene.scene.get(data.from);
        if (fromScene?.scene.isActive()) {
            // ★★★ 1. シーンをポーズし、スタックに積む処理を追加 ★★★
            this.systemScene.scene.pause(data.from);
            this.systemScene.sceneStack.push(data.from);

            const shouldBlockInput = (data.block_input !== false);
            // 入力ブロックは pause とは別に行う
            if (shouldBlockInput) {
                fromScene.input.enabled = false;
                this.inputBlockedScene = fromScene;
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
  // src/core/OverlayManager.js の中に、このメソッドを貼り付け（または上書き）してください

    /**
     * ★ 全てのオーバーレイに共通の「閉じる」処理 (デバッグログ強化版) ★
     * @param {object} data - { from, returnTo(NovelOverlay用), inputWasBlocked(NovelOverlay用) }
     */
    closeOverlay(data) {
        console.group(`%c[OverlayManager] Group: closeOverlay`, "color: #00BCD4;");
        console.log(`Request data:`, data);
        console.log(`Scene stack BEFORE pop:`, [...this.systemScene.sceneStack]);

        const closingSceneKey = data.from;

        if (this.systemScene.sceneStack.length === 0) {
            console.error("Scene stack is empty! Cannot close overlay.");
            console.groupEnd();
            return;
        }
        const sceneToResumeKey = this.systemScene.sceneStack.pop();
        console.log(`Scene to resume from stack: '${sceneToResumeKey}'`);
        console.log(`Scene stack AFTER pop:`, [...this.systemScene.sceneStack]);

        // --- オーバーレイシーンを停止 ---
        if (this.systemScene.scene.isActive(closingSceneKey)) {
            this.systemScene.scene.stop(closingSceneKey);
            console.log(`Scene '${closingSceneKey}' stopped.`);
        }

        // --- 復帰先シーンの後処理 ---
        const sceneToResume = this.systemScene.scene.get(sceneToResumeKey);
        if (sceneToResume) {
            console.log(`Found scene to resume: '${sceneToResumeKey}'.`);
            // 1. シーンを再開
            if (sceneToResume.scene.isPaused()) {
                sceneToResume.scene.resume();
                console.log(`Scene '${sceneToResumeKey}' resumed.`);
            } else {
                sceneToResume.scene.run();
                sceneToResume.scene.bringToTop();
                this.systemScene.scene.bringToTop('UIScene');
                console.log(`Scene '${sceneToResumeKey}' was not paused, called run() instead.`);
            }

            // 2. UISceneを更新
            const uiScene = this.systemScene.scene.get('UIScene');
            if (uiScene) {
                console.log(`%c[OverlayManager] Command: Calling uiScene.onSceneTransition('${sceneToResumeKey}')`, "color: #E91E63; font-weight: bold;");
                uiScene.onSceneTransition(sceneToResumeKey);
            }
            
            // 3. 入力ブロックを解除 (私の前回の提案を反映させます)
            if (this.inputBlockedScene && this.inputBlockedScene === sceneToResume) {
                console.log(`%c[OverlayManager] Re-enabling input for scene: ${this.inputBlockedScene.scene.key}`, "color: #00BCD4; font-weight: bold;");
                this.inputBlockedScene.input.enabled = true;
                this.inputBlockedScene = null;
            }
        } else {
            console.error(`Could not find scene to resume: '${sceneToResumeKey}'`);
        }
        
        // --- ゲーム状態を更新 ---
        this.systemScene.gameState = (sceneToResumeKey === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';
        console.log(`Game state changed to: ${this.systemScene.gameState}`);

        // --- 外部に終了を通知 ---
        this.systemScene.events.emit('overlay-closed', { from: closingSceneKey, to: sceneToResumeKey });
        console.log(`Event 'overlay-closed' emitted.`);

        console.groupEnd();
    }
}
