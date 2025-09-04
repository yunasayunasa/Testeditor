// src/scenes/UIScene.js (データ駆動アーキテクチャ・最終完成版)

import { CUSTOM_UI_MAP } from '../ui/index.js';

export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.isPanelOpen = false;
    }

    create() {
        console.log("UIScene: データ駆動でUIを生成します。");
        this.scene.bringToTop();
        
        // --- 1. UIScene.json を読み込み、全てのUI要素を生成・配置 ---
        const sceneKey = this.scene.key;
        const layoutData = this.cache.json.get(sceneKey);

        if (layoutData && layoutData.objects) {
            for (const layout of layoutData.objects) {
                const gameObject = this.createUiObject(layout);
                if (gameObject) {
                    this.applyUiProperties(gameObject, layout);
                    this[layout.name] = gameObject;
                }
            }
        } else {
            console.warn(`[${sceneKey}] No layout data found. UI will not be generated from data.`);
        }
        
        // --- 2. メッセージウィンドウの転送処理 (あなたの安定版ロジック) ---
        this.transferMessageWindow();

        // --- 3. イベントリスナーを、生成されたオブジェクトに設定 ---
        this.assignEventListeners();

        // --- 4. SystemSceneからの通知を受け取るリスナー ---
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.on('transition-complete', this.onSceneTransition, this);
        }
        
        // 最初のシーンのために、手動で表示を更新
        // (GameSceneが最初に起動することを想定)
        this.onSceneTransition('GameScene');
        
        console.log("UIScene: UI生成完了");
    }

    createUiObject(layout) {
        let uiElement = null;
        const stateManager = this.registry.get('stateManager');
        const CustomUIClass = CUSTOM_UI_MAP[layout.type];

        if (CustomUIClass) {
            uiElement = new CustomUIClass(this, { ...layout, ...layout.params, stateManager });
        } else {
            switch (layout.type) {
                case 'Text':
                    uiElement = this.add.text(0, 0, layout.params.text, layout.params.style).setOrigin(0.5);
                    break;
                case 'Image':
                    uiElement = this.add.image(0, 0, layout.texture);
                    break;
                case 'Panel':
                    uiElement = this.createBottomPanelFromData(layout);
                    break;
                default:
                     console.warn(`[UIScene] Unknown UI type in layout data: '${layout.type}'`);
            }
        }
        return uiElement;
    }

    applyUiProperties(gameObject, layout) {
        gameObject.name = layout.name;
        gameObject.setPosition(layout.x, layout.y);
        gameObject.setScale(layout.scaleX || 1, layout.scaleY || 1);
        gameObject.setAngle(layout.angle || 0);
        gameObject.setAlpha(layout.alpha === undefined ? 1 : layout.alpha);
        gameObject.setDepth(layout.depth || 0);
        
        if (gameObject instanceof Phaser.GameObjects.Container) {
            if (layout.width && layout.height) gameObject.setSize(layout.width, layout.height);
        }
        gameObject.setInteractive();
        
        const editor = this.plugins.get('EditorPlugin');
        if (editor) editor.makeEditable(gameObject, this);
    }

    transferMessageWindow() {
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.messageWindow) {
            gameScene.children.remove(gameScene.messageWindow);
            this.add.existing(gameScene.messageWindow);
            gameScene.messageWindow.setDepth(100);
            const editor = this.plugins.get('EditorPlugin');
            if (editor) {
                gameScene.messageWindow.name = 'message_window';
                gameScene.messageWindow.setSize(1280, 180);
                editor.makeEditable(gameScene.messageWindow, this);
            }
        }
    }

    assignEventListeners() {
        if (this.menu_button) this.menu_button.on('pointerdown', (e) => { this.togglePanel(); e.stopPropagation(); });
        
        if (this.bottom_panel) {
            this.bottom_panel.list.forEach(button => {
                if (!button.name) return; // 背景などは無視
                
                button.on('pointerdown', (e) => {
                    e.stopPropagation();
                    switch(button.name) {
                        case 'save_button': this.openScene('SaveLoadScene', {mode: 'save'}); break;
                        case 'load_button': this.openScene('SaveLoadScene', {mode: 'load'}); break;
                        case 'backlog_button': this.openScene('BacklogScene'); break;
                        case 'config_button': this.openScene('ConfigScene'); break;
                        case 'auto_button': this.toggleGameMode('auto'); break;
                        case 'skip_button': this.toggleGameMode('skip'); break;
                    }
                });
            });
        }
        
        if (this.jump_button) {
            this.jump_button.on('pointerdown', () => {
                const playerController = this.scene.get('JumpScene')?.player?.components?.PlayerController;
                if (playerController) playerController.jump();
            });
        }
    }
    
    createBottomPanelFromData(layout) {
        const gameWidth = this.scale.width;
        const panel = this.add.container(0, 0);
        const panelBg = this.add.rectangle(0, 0, layout.width, layout.height, 0x000000, 0.8);
        panel.add(panelBg);
        
        const buttonStyle = { fontSize: '32px', fill: '#fff' };
        const buttonDefs = [
            { name: 'save_button', text: 'セーブ' }, { name: 'load_button', text: 'ロード' },
            { name: 'backlog_button', text: '履歴' }, { name: 'config_button', text: '設定' },
            { name: 'auto_button', text: 'オート' }, { name: 'skip_button', text: 'スキップ' }
        ];

        const areaStartX = 250 - (gameWidth / 2);
        const areaWidth = (gameWidth - 250 - 100);
        const buttonMargin = areaWidth / buttonDefs.length;

        buttonDefs.forEach((def, index) => {
            const button = this.add.text(0, 0, def.text, buttonStyle).setOrigin(0.5).setName(def.name).setInteractive();
            button.setX(areaStartX + (buttonMargin * index) + (buttonMargin / 2));
            panel.add(button);
        });
        
        return panel;
    }
    
    onSceneTransition(newSceneKey) {
        console.log(`[UIScene] Updating visibility for scene: ${newSceneKey}`);
        const layoutData = this.cache.json.get(this.scene.key);
        if (!layoutData || !layoutData.objects) return;

        for (const layout of layoutData.objects) {
            const gameObject = this.children.list.find(obj => obj.name === layout.name);
            if (gameObject) {
                const shouldBeVisible = layout.visible_in && layout.visible_in.includes(newSceneKey);
                gameObject.setVisible(shouldBeVisible);
            }
        }
    }
    
    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        if (this.bottom_panel) {
            const targetY = this.isPanelOpen ? 720 - (this.bottom_panel.height / 2) : 720 + (this.bottom_panel.height / 2);
            this.tweens.add({ targets: this.bottom_panel, y: targetY, duration: 300, ease: 'Cubic.easeInOut' });
        }
    }
    
    openScene(sceneKey, data = {}) {
        const activeGameScene = this.scene.manager.getScenes(true).find(s => s.scene.key.toLowerCase().includes('scene') && s.scene.key !== 'UIScene' && s.scene.key !== 'SystemScene');
        if (activeGameScene) this.scene.pause(activeGameScene.scene.key);
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
     
    shutdown() {
        const systemScene = this.scene.get('SystemScene');
        if (systemScene) {
            systemScene.events.off('transition-complete', this.onSceneTransition, this);
        }
        super.shutdown();
    }
}