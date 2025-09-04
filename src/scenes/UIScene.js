import { uiRegistry, sceneUiVisibility } from '../ui/index.js';

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.uiElements = new Map();
        this.isPanelOpen = false;
        // ★ this.menuButton や this.panel プロパティは削除しても良いが、互換性のために残してもOK
    }

    async create() {
        console.log("UIScene: 100% Data-Driven Initialization");
        this.scene.bringToTop();
        
        // ★★★ レイアウトからのビルドが唯一のUI生成処理になる ★★★
        const layoutData = this.cache.json.get(this.scene.key);
        await this.buildUiFromLayout(layoutData);
        
        // ★ createHardcodedUI() の呼び出しは完全に削除

        const systemScene = this.scene.get('SystemScene');
        systemScene.events.on('transition-complete', this.onSceneTransition, this);
        
        this.events.emit('scene-ready');
    }

    async buildUiFromLayout(layoutData) {
        if (!layoutData || !layoutData.objects) return;

        const creationPromises = layoutData.objects.map(async (layout) => {
            const definition = uiRegistry[layout.name];
            if (!definition) return;

            let uiElement = null;
            if (definition.path) { // 動的インポートで生成
                try {
                    const module = await import(`../ui/${definition.path.replace('./', '')}`);
                    const UiClass = module.default;
                    const stateManager = this.registry.get('stateManager');
                    const params = { ...definition.params, ...layout.params, stateManager };
                    uiElement = new UiClass(this, { ...layout, ...params });
                } catch (err) {
                    console.error(`Failed to load UI component '${layout.name}'`, err);
                }
            } else if (typeof definition.creator === 'function') { // ヘルパーメソッドで生成
                uiElement = definition.creator(this, layout);
            }
            
            if (uiElement) {
                this.registerUiElement(layout.name, uiElement, layout);
            }
        });
        await Promise.all(creationPromises);
    }
    
    registerUiElement(name, element, layout) {
        element.name = name;
        this.add.existing(element);
        this.uiElements.set(name, element);
        element.setPosition(layout.x, layout.y);
        
        if (layout.width && layout.height) {
            element.setSize(layout.width, layout.height);
        }
        element.setInteractive();
        
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
    
    // --- UI生成ヘルパーメソッド群 (creatorから呼ばれる) ---
    createMenuButton(layout) {
        const button = this.add.text(0, 0, 'MENU', { fontSize: '36px', fill: '#fff' }).setOrigin(0.5);
        button.on('pointerdown', () => this.togglePanel());
        return button;
    }

    createBottomPanel(layout) {
        const panel = this.add.container(0, 0);
        // ... (createBottomPanelのロジックは前回と同じ)
        return panel;
    }
    
    togglePanel() {
        const panel = this.uiElements.get('bottom_panel');
        if (!panel) return;
        this.isPanelOpen = !this.isPanelOpen;
        // ... (tweenのロジック)
    }

    // ... (shutdownなどの他のメソッド)
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
     * UI要素をシーンと管理マップに登録し、プロパティとエディタ機能を適用する
     */
    registerUiElement(name, element, layout = {}) {
        element.name = name;
        this.add.existing(element);
        this.uiElements.set(name, element);

        // レイアウトデータがあれば適用
        if (layout.x !== undefined) element.setPosition(layout.x, layout.y);
        // ... (scale, alphaなども同様に適用)

        // エディタ登録
        element.setInteractive();
        const editor = this.plugins.get('EditorPlugin');
        if (editor && editor.isEnabled) {
            if (element instanceof Phaser.GameObjects.Container && layout.width) {
                element.setSize(layout.width, layout.height);
            }
            editor.makeEditable(element, this);
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
  
    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        const targetY = this.isPanelOpen ? 720 - 60 : 720 + 120;
        this.tweens.add({
            targets: this.panel,
            y: targetY,
            duration: 300,
            ease: 'Cubic.easeInOut'
        });
    }

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