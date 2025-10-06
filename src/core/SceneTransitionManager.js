// src/core/SceneTransitionManager.js

/**
 * ゲーム全体のシーン遷移を管理する専門クラス。
 * SystemSceneから遷移ロジックを委譲される。
 */
export default class SceneTransitionManager {
    /** @type {import('../scenes/SystemScene.js').default} */
    systemScene;

    constructor(systemSceneInstance) {
        this.systemScene = systemSceneInstance;
        this.isProcessing = false;
    }

    /**
     * [jump]や[transition_scene]から呼ばれる、最も基本的なシーン遷移
     * @param {object} data - { from, to, params }
     */
    handleSimpleTransition(data) {
        console.log(`%c[SceneTransitionManager] Handling simple transition: ${data.from} -> ${data.to}`, "color: #FF9800; font-weight: bold;");
        const { from, to, params } = data;

        // ★ gameStateの管理は、まだSystemSceneが担当する
        this.systemScene.gameState = (to === 'GameScene') ? 'NOVEL' : 'GAMEPLAY';
        this.systemScene.sceneStack = [to];

        const sceneToStop = this.systemScene.scene.get(from);

        if (sceneToStop && sceneToStop.scene.isActive() && from !== 'UIScene') {
            sceneToStop.events.once('shutdown', () => {
                this._startAndMonitorScene(to, params);
            });
            this.systemScene.scene.stop(from);
        } else {
            this._startAndMonitorScene(to, params);
        }
    }

    /**
     * [return_novel]から呼ばれる、ノベルパートへの復帰
     * @param {object} data - { from, params }
     */
    handleReturnToNovel(data) {
        console.log(`%c[SceneTransitionManager] Handling return to novel from ${data.from}`, "color: #FF9800; font-weight: bold;");
        const { from, params } = data; // paramsを受け取る

        if (this.systemScene.scene.isActive(from) && from !== 'UIScene') {
            this.systemScene.scene.stop(from);
        }
        
        // ★ GameSceneに渡すパラメータを構築
        const sceneParams = { 
            ...params, // return_novelタグから渡されたパラメータ
            loadSlot: 0, 
            charaDefs: this.systemScene.globalCharaDefs
        };
        this._startAndMonitorScene('GameScene', sceneParams);

        this.systemScene.gameState = 'NOVEL';
        this.systemScene.sceneStack = ['GameScene'];
    }


    /**
     * 中核となるシーン起動ヘルパー (SystemSceneから移植)
     * @private
     */
    _startAndMonitorScene(sceneKey, params = {}) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this.systemScene.game.input.enabled = false;

        const targetScene = this.systemScene.scene.get(sceneKey);
        const completionEvent = (sceneKey === 'GameScene') ? 'gameScene-load-complete' : 'scene-ready';

        targetScene.events.once(completionEvent, () => {
            const uiScene = this.systemScene.scene.get('UIScene');
            if (uiScene) uiScene.onSceneTransition(sceneKey);

            this.systemScene.cameras.main.fadeFrom(300, 0, 0, 0, false, (camera, progress) => {
                if (progress === 1) {
                    this.isProcessing = false;
                    this.systemScene.game.input.enabled = true;
                    this.systemScene.events.emit('transition-complete', sceneKey);
                }
            });
        });

        this.systemScene.scene.run(sceneKey, params);
    }
}