import { uiRegistry, sceneUiVisibility } from '../ui/index.js';

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.uiElements = new Map();
        this.isPanelOpen = false;
        // ★ this.menuButton や this.panel プロパティは削除しても良いが、互換性のために残してもOK
    }

  // src/scenes/UIScene.js (修正後のコード)

    create() { // ★ async を削除
        console.log("UIScene: Data-Driven Initialization Started");
        this.scene.bringToTop();

        const layoutData = this.cache.json.get(this.scene.key);
        
        // buildUiFromLayout は Promise を返すので、.then() で完了を待つ
        this.buildUiFromLayout(layoutData).then(() => {
            // ▼▼▼ 非同期処理がすべて完了した後に実行したい処理を、すべてこの中に入れる ▼▼▼

            console.log("UIScene: UI build complete. Finalizing setup.");

            // SystemSceneとの連携設定
            const systemScene = this.scene.get('SystemScene');
            systemScene.events.on('transition-complete', this.onSceneTransition, this);
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ ここが最も重要な変更点です ★★★
            // ★★★ UIの構築が100%完了したこのタイミングで ready を発行する
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            this.events.emit('scene-ready');

        }).catch(err => {
            // もしUI構築中にエラーが起きたらコンソールに出す
            console.error("UIScene: Failed to build UI from layout.", err);
        });
        
        // ▲▲▲ createメソッド自体は、Promiseを開始したらすぐに終了する ▲▲▲
    }

    // buildUiFromLayout メソッド自体は async のままでOK
    async buildUiFromLayout(layoutData) {
        if (!layoutData || !layoutData.objects) {
            console.warn("UIScene: No layout data found. Skipping UI build.");
            return;
        }

        const creationPromises = layoutData.objects.map(async (layout) => {
            const definition = uiRegistry[layout.name];
            if (!definition) return;

            let uiElement = null;
            
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ これが原因2を解決する修正です ★★★
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            
            // StateManagerを先に取得しておく
            const stateManager = this.registry.get('stateManager');
            // JSONのレイアウト情報に、動的なパラメータ（stateManagerなど）を結合する
            const params = { ...definition.params, ...layout, stateManager };

            if (definition.path) {
                try {
                    const module = await import(`../ui/${definition.path.replace('./', '')}`);
                    const UiClass = module.default;
                    // ★ 結合したparamsをコンストラクタの第2引数として渡す
                    uiElement = new UiClass(this, params);
                } catch (err) {
                    console.error(`Failed to load UI component '${layout.name}'`, err);
                }
            } else if (typeof definition.creator === 'function') {
                // creatorにも結合したparamsを渡す
                uiElement = definition.creator(this, params);
            }
            
            if (uiElement) {
                this.registerUiElement(layout.name, uiElement, layout);
                if (layout.name === 'bottom_panel') {
                    this.panel = uiElement;
                }
            }
        });
        await Promise.all(creationPromises);
    }
    
    registerUiElement(name, element, layout) {
        element.name = name;
        this.add.existing(element);
        this.uiElements.set(name, element);
        element.setPosition(layout.x, layout.y);
        
         // layoutオブジェクトにdepthプロパティが存在すれば、それを適用する
        if (layout.depth !== undefined) {
            element.setDepth(layout.depth);
        }


        // 1. JSONレイアウトにwidthとheightが定義されているかチェックする
        if (layout.width && layout.height) {
            // 2. もし定義されていれば、それをコンテナのサイズとして設定する
            //    これにより、Phaserはクリック範囲を認識できるようになる
            element.setSize(layout.width, layout.height);
        }
        
        // 3. サイズが確定した後で、setInteractiveを呼び出す！
        //    (creator関数で作られたテキストボタンなどは、元からサイズがあるので問題なく動作する)
        element.setInteractive();
        
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        
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

    // --- UI生成ヘルパーメソッド群 (creatorから呼ばれる) ---
    createMenuButton(layout) {
const button = this.add.text(0, 0, 'MENU', { fontSize: '36px', fill: '#fff' })
.setOrigin(0.5)
.setInteractive();

// ★★★ 修正の核心 ★★★
    // クリックされたら、'bottom_panel'という名前のUI要素を探して動かすように命令する
    button.on('pointerdown', () => {
        console.log("Menu button clicked. Toggling 'bottom_panel'.");
        this.togglePanelByName('bottom_panel');
    });
    
    return button;
}


        /**
     * ハードコードで管理するボトムパネルとその中のボタンを生成するヘルパーメソッド
     * @returns {Phaser.GameObjects.Container} 生成されたパネルコンテナ
     */
    createBottomPanel() {
        const gameWidth = 1280; // or this.scale.width
        const panel = this.add.container(0, 0);

        // パネルの背景 (クリックイベントを止める役割も持つ)
        const panelBg = this.add.rectangle(gameWidth / 2, 0, gameWidth, 120, 0x000000, 0.8)
            .setInteractive();
        panelBg.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
        });

        // パネル内の各ボタンを生成
        const saveButton = this.add.text(0, 0, 'セーブ', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('save_button');
        const loadButton = this.add.text(0, 0, 'ロード', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('load_button');
        const backlogButton = this.add.text(0, 0, '履歴', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('backlog_button');
        const configButton = this.add.text(0, 0, '設定', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('config_button');
        const autoButton = this.add.text(0, 0, 'オート', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('auto_button');
        const skipButton = this.add.text(0, 0, 'スキップ', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive().setName('skip_button');
        
        panel.add([panelBg, saveButton, loadButton, backlogButton, configButton, autoButton, skipButton]);

        // ボタンのレイアウトを計算して配置
        const buttons = [saveButton, loadButton, backlogButton, configButton, autoButton, skipButton];
        const areaStartX = 250;
        const areaWidth = gameWidth - areaStartX - 100;
        const buttonMargin = areaWidth / buttons.length;
        buttons.forEach((button, index) => {
            button.setX(areaStartX + (buttonMargin * index) + (buttonMargin / 2));
        });

        // 各ボタンにイベントリスナーを設定
        saveButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.openScene('SaveLoadScene', { mode: 'save' }); 
            event.stopPropagation(); // ★ 4番目の引数 event を使う
        });
        loadButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.openScene('SaveLoadScene', { mode: 'load' }); 
            event.stopPropagation(); 
        });
        backlogButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.openScene('BacklogScene'); 
            event.stopPropagation(); 
        });
        configButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.openScene('ConfigScene'); 
            event.stopPropagation(); 
        });
        autoButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.toggleGameMode('auto'); 
            event.stopPropagation(); 
        });
        skipButton.on('pointerdown', (pointer, localX, localY, event) => { 
            this.toggleGameMode('skip'); 
            event.stopPropagation(); 
        });
        
        return panel;
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
     shutdown() {
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.off('transition-complete', this.onSceneTransition, this);
        }
    }
}