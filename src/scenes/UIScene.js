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

   // src/scenes/UIScene.js

// ... (他のメソッドやimportは変更なし) ...

    /**
     * ★★★ 以下のメソッドで、既存の buildUiFromLayout を完全に置き換えてください ★★★
     * (デバッグ用・JSONレイアウトを無視するシンプル版)
     */
    async buildUiFromLayout(layoutData) { // layoutDataは受け取るが使わない
        console.log("[UIScene] Starting UI build with SIMPLIFIED routine.");

        const uiRegistry = this.registry.get('uiRegistry');
  // ★★★ 2. UISceneがまさに使おうとしているuiRegistryの中身をコンソールに出力 ★★★
        console.log("%c[UIScene] uiRegistry data received from registry:", "color: cyan; font-weight: bold;", uiRegistry);


        if (!uiRegistry) {
            console.error('[UIScene] CRITICAL: uiRegistry not found in game registry.');
            return;
        }

        const stateManager = this.registry.get('stateManager');

        // uiRegistryの全てのキーをループ処理する
        for (const name in uiRegistry) {
            try {
                const definition = uiRegistry[name];
                
                // ★ main.jsで前処理された 'component' プロパティが必須
                const UiComponentClass = definition.component;

                if (UiComponentClass) {
                    // ★ JSONを無視し、registryのparamsだけを使う
                    const params = { ...definition.params, name, stateManager };
                    
                    const uiElement = new UiComponentClass(this, params);
                    this.registerUiElement(name, uiElement, params);
                    console.log(`[UIScene] Successfully created '${name}'.`);
                } else {
                    console.warn(`[UIScene] UI definition for '${name}' is missing a 'component' class.`);
                }
            } catch (e) {
                console.error(`[UIScene] FAILED to create UI element '${name}'.`, e);
            }
        }
    }

// src/scenes/UIScene.js

// ... (buildUiFromLayoutは、先ほどのデバッグ用のシンプル版のままでOKです) ...

    /**
     * ★★★ 以下のメソッドで、既存の registerUiElement を完全に置き換えてください ★★★
     * (setSize/setInteractiveを安全に呼び出す最終確定版)
     */
    /**
     * UI要素を登録し、インタラクティブ化する (最終確定・完成版)
     * ★★★ 以下のメソッドで、既存の registerUiElement を完全に置き換えてください ★★★
     */
    registerUiElement(name, element, params) {
        element.name = name;
        this.add.existing(element);
        this.uiElements.set(name, element);

        if (params.x !== undefined) element.x = params.x;
        if (params.y !== undefined) element.y = params.y;
        if (params.depth !== undefined) element.setDepth(params.depth);
        if (params.group) element.setData('group', params.group);

        // --- ここからが究極の解決策 ---
        
        // 当たり判定用の図形を定義する
        let hitArea = null;
        let hitAreaCallback = null;

        if (params.width && params.height) {
            // Case 1: JSON or params に width/height がある場合
            // これが当たり判定のサイズになる
            element.setSize(params.width, params.height);
            hitArea = new Phaser.Geom.Rectangle(0, 0, params.width, params.height);
            // Containerの場合、当たり判定の中心を左上に合わせる必要がある
            hitArea.centerX = params.width / 2;
            hitArea.centerY = params.height / 2;
            hitAreaCallback = Phaser.Geom.Rectangle.Contains;
            
        } else if (element.width > 0 && element.height > 0) {
            // Case 2: コンポーネント自身がサイズを持つ場合 (Text, Imageなど)
            // 自身のサイズを当たり判定として使う
            // setSizeは不要
            hitArea = new Phaser.Geom.Rectangle(0, 0, element.width, element.height);
            hitArea.centerX = element.width / 2;
            hitArea.centerY = element.height / 2;
            hitAreaCallback = Phaser.Geom.Rectangle.Contains;

        } else if (element instanceof Phaser.GameObjects.Container) {
            // Case 3: サイズのないコンテナの場合 (HpBar, MessageWindowなど)
            // ★ デフォルトの当たり判定を与える！ ★
            const defaultWidth = 200; // デフォルトの編集用サイズ
            const defaultHeight = 100;
            
            // ★ setSizeで当たり判定のサイズだけを設定する
            element.setSize(defaultWidth, defaultHeight);

            hitArea = new Phaser.Geom.Rectangle(0, 0, defaultWidth, defaultHeight);
            hitArea.centerX = defaultWidth / 2;
            hitArea.centerY = defaultHeight / 2;
            hitAreaCallback = Phaser.Geom.Rectangle.Contains;
            
            // ★（任意）デバッグ用に、当たり判定を可視化する
            // const debugRect = this.add.graphics().lineStyle(1, 0x00ff00).strokeRectShape(hitArea);
            // element.add(debugRect); // コンテナに追加することで、追従する
        }

        // ★ 当たり判定が定義できた場合のみ、インタラクティブにする
        if (hitArea) {
            element.setInteractive(hitArea, hitAreaCallback);
        }

        // --- EditorPluginへの登録は変更なし ---
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            editor.makeEditable(element, this);
        }
    }
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
    // showMessageWindow と hideMessageWindow を、これで置き換えてください

    hideMessageWindow(time = 0) { // アニメーションはオプションにする
        const messageWindow = this.uiElements.get('message_window');
        if (messageWindow) {
            // 即座に隠す
            messageWindow.y = this.scale.height + (messageWindow.height / 2);
        }
    }

    showMessageWindow(time = 0) {
        this.scene.bringToTop();
        const messageWindow = this.uiElements.get('message_window');
        const layoutData = this.cache.json.get('UIScene');
        if (messageWindow && layoutData) {
            const windowLayout = layoutData.objects.find(obj => obj.name === 'message_window');
            if (windowLayout) {
                // 即座に表示位置に戻す
                messageWindow.y = windowLayout.y;
            }
        }
    }
     shutdown() {
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.off('transition-complete', this.onSceneTransition, this);
        }
    }
}