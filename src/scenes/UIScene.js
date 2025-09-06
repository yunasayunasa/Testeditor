import { uiRegistry, sceneUiVisibility } from '../ui/index.js';

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.uiElements = new Map();
        this.isPanelOpen = false;
        // ★ this.menuButton や this.panel プロパティは削除しても良いが、互換性のために残してもOK
    }

  // src/scenes/UIScene.js (修正後のコード)

      // createメソッドは非同期である必要はない
      async create() {
        console.log("UIScene: Data-Driven Initialization Started");
        this.scene.bringToTop();

        try {
            // ステップ1: UIの構築を待つ
            const layoutData = this.cache.json.get(this.scene.key);
            await this.buildUiFromLayout(layoutData);
            console.log("UIScene: UI build complete.");

            // ステップ2: 連携設定を行う
            const systemScene = this.scene.get('SystemScene');
            if (systemScene) {
                systemScene.events.on('transition-complete', this.onSceneTransition, this);
                console.log("UIScene: SystemSceneとの連携を設定しました。");
            } else {
                console.warn("UIScene: SystemSceneが見つかりませんでした。");
            }

            // ステップ3: すべての準備が完了してから、成功を通知する
            console.log("UIScene: Finalizing setup and emitting scene-ready.");
            this.events.emit('scene-ready');

        } catch (err) {
            // どこかでエラーが起きれば、必ずここに来る
            console.error("UIScene: create処理中にエラーが発生しました。", err);
            // (オプション) エラーが発生したことを明確に示すために、エラーメッセージを画面に表示するなど
            this.add.text(this.scale.width / 2, this.scale.height / 2, 'UIScene FAILED TO INITIALIZE', { color: 'red', fontSize: '32px' }).setOrigin(0.5);
        }
    }

    // layoutDataを引数として受け取る、正しい非同期ビルドメソッド
    async buildUiFromLayout(layoutData) {
        const processedUiRegistry = this.registry.get('uiRegistry');
        if (!processedUiRegistry) {
            return Promise.reject('uiRegistry not found');
        }

        if (!layoutData || !layoutData.objects) {
            console.warn(`[UIScene] No layout data in ${this.scene.key}.json. Building UI from registry defaults.`);
        }

        const stateManager = this.registry.get('stateManager');

        const creationPromises = Object.keys(processedUiRegistry).map(name => {
            return new Promise(async (resolve, reject) => {
                try {
                    const definition = processedUiRegistry[name];
                    const layout = (layoutData && layoutData.objects) 
                        ? layoutData.objects.find(obj => obj.name === name) || {}
                        : {};
                    const params = { ...definition.params, ...layout, name, stateManager };

                    let uiElement = null;

                    if (definition.component) {
                        uiElement = new definition.component(this, params);
                    } else if (typeof definition.creator === 'function') {
                        uiElement = definition.creator(this, params);
                    }

                    if (uiElement) {
                        this.registerUiElement(name, uiElement, params);
                    }
                    
                    resolve();
                } catch (e) {
                    console.error(`[UIScene] Failed to create UI element '${name}'`, e);
                    reject(e);
                }
            });
        });

        await Promise.all(creationPromises);
    }

// ... registerUiElementと他のメソッドは変更なし ...
    
    // registerUiElementは変更なしでOK
    registerUiElement(name, element, params) {
        element.name = name;
        this.add.existing(element);
        this.uiElements.set(name, element);
        
        if (params.x !== undefined && params.y !== undefined) {
            element.setPosition(params.x, params.y);
        }
        
        if (params.depth !== undefined) {
            element.setDepth(params.depth);
        }

        if (params.width && params.height) {
            element.setSize(params.width, params.height);
        }
        
        // ★★★ setInteractiveの呼び出しを安全にする ★★★
        // setSizeが呼ばれていないと当たり判定が作れない場合があるため、
        // widthとheightがある、または入力判定用の図形が定義されている場合に呼ぶのがより安全
        if ((params.width && params.height) || element.input) {
             element.setInteractive();
        }
        
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(element, this);
        }
    }

// ... 以降のメソッドは変更なし ...

    onSceneTransition(newSceneKey) {
        const visibleGroups = sceneUiVisibility[newSceneKey] || [];
        for (const [name, uiElement] of this.uiElements.entries()) {
            const definition = uiRegistry[name];
            if (definition) {
                const shouldBeVisible = definition.groups.some(group => visibleGroups.includes(group));
                uiElement.setVisible(shouldBeVisible);
            }
        }
    }
    
// src/scenes/UIScene.js

    // ... onSceneTransition メソッドなどの後に追加 ...

    /**
     * StateManagerからの変数変更通知を受け取り、
     * "監視" を登録しているUI要素に更新を自動的に委譲する。
     * 存在しないメソッド呼び出しによるTypeErrorを防ぎ、データ駆動の連携を完成させる。
     * @param {string} key - 変更された変数のキー (例: 'player_hp')
     * @param {*} value - 新しい値 (このメソッド内では直接使わないが、将来のために受け取っておく)
     */
    updateHud(key, value) {
        // デバッグログ：GameSceneからの呼び出しが成功したことを確認
        // console.log(`[UIScene.updateHud] Received update for key: ${key}`);

        const uiRegistry = this.registry.get('uiRegistry'); // uiRegistryをどこかから取得する必要があるかもしれません
        const stateManager = this.registry.get('stateManager');

        if (!uiRegistry || !stateManager) {
            console.error('[UIScene.updateHud] uiRegistry or stateManager is not available.');
            return;
        }

        // 変更されたキー(key)を 'watch' しているUI要素をすべて探す
        for (const [name, uiElement] of this.uiElements.entries()) {
            const definition = uiRegistry[name];

            // 1. UI定義が存在し、'watch'配列が定義されているかチェック
            // 2. 'watch'配列に、変更があったキー(key)が含まれているかチェック
            if (definition && definition.watch && definition.watch.includes(key)) {
                
                // 更新処理をUI要素自身に丸投げする
                // UI要素が 'updateValue' という標準メソッドを持っていることを規約とする
                if (typeof uiElement.updateValue === 'function') {
                    // StateManagerの最新の状態(f)を丸ごと渡す
                    uiElement.updateValue(stateManager.f);
                } else {
                    // 'watch'しているのに更新メソッドがない場合は警告を出す
                    console.warn(`UI Element '${name}' is watching '${key}' but does not have an updateValue() method.`);
                }
            }
        }
    }

    
     
   

    /**
     * ★★★ GameSceneからコピー ★★★
     * オブジェクトにプロパティを適用する
     */
    applyProperties(gameObject, layout) {
        gameObject.name = layout.name;
        gameObject.setPosition(layout.x, layout.y);
        gameObject.setScale(layout.scaleX, layout.scaleY);
        gameObject.setAngle(layout.angle);
        gameObject.setAlpha(layout.alpha);
        
        // コンテナの場合、当たり判定のサイズもJSONから設定
        if (gameObject instanceof Phaser.GameObjects.Container) {
            if (layout.width && layout.height) {
                gameObject.setSize(layout.width, layout.height);
            }
        }

        gameObject.setInteractive(); // ★ ここでインタラクティブにする
        
        const editor = this.plugins.get('EditorPlugin');
        if (editor) {
            editor.makeEditable(gameObject, this);
        }
    }
  
   /**
     * 指定された名前のパネルUI要素の表示/非表示を切り替える (Depth制御付き)
     * @param {string} panelName - uiElementsマップに登録されたパネルの名前
     */
    togglePanelByName(panelName) {
        const panelToToggle = this.uiElements.get(panelName);
        if (!panelToToggle) {
            console.error(`togglePanelByName: Panel with name '${panelName}' not found.`);
            return;
        }

        this.isPanelOpen = !this.isPanelOpen;

        const gameHeight = this.scale.height;
        const panelHeight = panelToToggle.height || 120;
        const targetY = this.isPanelOpen 
            ? gameHeight - (panelHeight / 2) 
            : gameHeight + (panelHeight / 2);

       
        if (this.isPanelOpen) {
            // パネルを開くとき：
            // depthを非常に大きな値に設定し、強制的に最前面に持ってくる
            panelToToggle.setDepth(10000); 
            console.log(`[UIScene] Bringing '${panelName}' to front with depth 100.`);
        }
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        this.tweens.add({
            targets: panelToToggle,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeInOut',
            onComplete: () => {
                if (!this.isPanelOpen) {
                    // パネルを閉じた後：
                    // depthを元に戻すか、低い値に設定する（任意）
                    // これにより、他のUI要素との予期せぬ競合を防ぐ
                    panelToToggle.setDepth(50); // 例えば、通常のUIよりは手前だが、最前面ではない値
                    console.log(`[UIScene] Resetting '${panelName}' depth to 50.`);
                }
            }
        });
    }
    /*togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        const targetY = this.isPanelOpen ? 720 - 60 : 720 + 120;
        this.tweens.add({
            targets: this.panel,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeInOut'
        });
    }*/

    openScene(sceneKey, data = {}) {
        this.scene.pause('GameScene');
        // Config, Backlog, SaveLoadシーンを開くときは、UI自身も止める
      /*  if (['ConfigScene', 'BacklogScene', 'SaveLoadScene'].includes(sceneKey)) {
            this.scene.pause();
        }*/
        this.scene.launch(sceneKey, data);
    }
    
    toggleGameMode(mode) {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.scenarioManager) {
            const currentMode = gameScene.scenarioManager.mode;
            const newMode = currentMode === mode ? 'normal' : mode;
            gameScene.scenarioManager.setMode(newMode);
        }
    }
  setVisible(isVisible) {
        console.log(`UIScene: setVisible(${isVisible}) が呼ばれました。`);
        // UIScene内の全ての表示オブジェクトの可視性を切り替える
        if (this.menuButton) this.menuButton.setVisible(isVisible);
        if (this.panel) this.panel.setVisible(isVisible); 
        
        // パネルが開いている状態でも、パネルを非表示にする
        if (!isVisible && this.isPanelOpen) {
            this.isPanelOpen = false; // 状態をリセット
            // Tweenなしで即座に隠す
            if (this.panel) this.panel.y = this.scale.height + 120; 
        }
    }
      /**
     * メッセージウィンドウを画面外へ隠す
     * @param {number} time - アニメーション時間(ms)
     * @returns {Promise<void>} アニメーション完了時に解決されるPromise
     */
hideMessageWindow(time = 300) {
        // ★★★ return new Promise(...) で全体を囲む ★★★
        return new Promise(resolve => {
            const messageWindow = this.uiElements.get('message_window');
            if (messageWindow) {
                this.tweens.add({
                    targets: messageWindow,
                    y: this.scale.height + (messageWindow.height / 2),
                    duration: time,
                    ease: 'Cubic.easeInOut',
                    onComplete: resolve // ★ Tween完了時にPromiseを解決
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * メッセージウィンドウを画面内の定位置へ表示する (Promise対応版)
     */
    showMessageWindow(time = 300) {
        // ★★★ return new Promise(...) で全体を囲む ★★★
        return new Promise(resolve => {
            const messageWindow = this.uiElements.get('message_window');
            const layoutData = this.cache.json.get('UIScene');
            
            if (messageWindow && layoutData) {
                const windowLayout = layoutData.objects.find(obj => obj.name === 'message_window');
                if (windowLayout) {
                    this.tweens.add({
                        targets: messageWindow,
                        y: windowLayout.y,
                        duration: time,
                        ease: 'Cubic.easeInOut',
                        onComplete: resolve // ★ Tween完了時にPromiseを解決
                    });
                } else { resolve(); }
            } else {
                resolve();
            }
        });
    }
     shutdown() {
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.off('transition-complete', this.onSceneTransition, this);
        }
    }
}