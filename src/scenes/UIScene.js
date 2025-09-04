import { uiRegistry, sceneUiVisibility } from './index.js'; // ★ UI定義を外部からインポート

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        
        /** @type {Map<string, Phaser.GameObjects.GameObject>} */
        this.uiElements = new Map(); // すべてのUI要素を名前で管理するマップ

        // ハードコードする要素への参照
        this.menuButton = null;
        this.panel = null;
        this.isPanelOpen = false;
    }

    create() {
        console.log("UIScene: UIの器として初期化");
        this.scene.bringToTop();
        
        // --- 1. データ駆動でUI要素を生成・登録 ---
        const layoutData = this.cache.json.get(this.scene.key);
        this.buildUiFromLayout(layoutData);

        // --- 2. ハードコードするUI要素を生成・登録 ---
        this.createHardcodedUI();
        
        // --- 3. SystemSceneからの通知を受け取るリスナー ---
        const systemScene = this.scene.get('SystemScene');
        systemScene.events.on('transition-complete', this.onSceneTransition, this);
        
        this.events.emit('scene-ready');
    }

    /**
     * レイアウトJSONからUI要素を生成し、シーンと管理マップに追加する
     */
    buildUiFromLayout(layoutData) {
        if (!layoutData || !layoutData.objects) return;

        layoutData.objects.forEach(layout => {
            const definition = uiRegistry[layout.name];
            if (definition && typeof definition.creator === 'function') {
                const uiElement = definition.creator(this, layout.params);
                this.registerUiElement(layout.name, uiElement, layout);
            }
        });
    }
    
    /**
     * ハードコードで管理するUI要素（メニューなど）を生成する
     */
    createHardcodedUI() {
        // メニューボタン
        this.menuButton = this.add.text(100, 670, 'MENU', { fontSize: '36px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        this.registerUiElement('menu_button', this.menuButton);
        this.menuButton.on('pointerdown', () => this.togglePanel());

        // パネル (ここではContainerだけ作り、中身はヘルパーメソッドで)
        this.panel = this.createBottomPanel();
        this.panel.setPosition(0, 840); // 初期位置は画面外
        this.registerUiElement('bottom_panel', this.panel);
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
        saveButton.on('pointerdown', (e) => { this.openScene('SaveLoadScene', { mode: 'save' }); e.stopPropagation(); });
        loadButton.on('pointerdown', (e) => { this.openScene('SaveLoadScene', { mode: 'load' }); e.stopPropagation(); });
        backlogButton.on('pointerdown', (e) => { this.openScene('BacklogScene'); e.stopPropagation(); });
        configButton.on('pointerdown', (e) => { this.openScene('ConfigScene'); e.stopPropagation(); });
        autoButton.on('pointerdown', (e) => { this.toggleGameMode('auto'); e.stopPropagation(); });
        skipButton.on('pointerdown', (e) => { this.toggleGameMode('skip'); e.stopPropagation(); });
        
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
     * シーン遷移時に、UIの表示/非表示をグループ単位で制御する
     */
    onSceneTransition(newSceneKey) {
        console.log(`[UIScene] シーン遷移検知: ${newSceneKey}。UI表示を更新します。`);

        // 表示すべきUIグループを取得 (設定がなければ空配列)
        const visibleGroups = sceneUiVisibility[newSceneKey] || [];

        // 全てのUI定義をチェック
        for (const name in uiRegistry) {
            const definition = uiRegistry[name];
            const uiElement = this.uiElements.get(name);

            if (uiElement) {
                // UIのグループのいずれかが、表示すべきグループに含まれているか
                const shouldBeVisible = definition.groups.some(group => visibleGroups.includes(group));
                uiElement.setVisible(shouldBeVisible);
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