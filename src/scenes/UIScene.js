import CoinHud from '../ui/CoinHud.js';
import HpBar from '../ui/HpBar.js';
import VirtualStick from '../ui/VirtualStick.js'; // ★ インポート


export default class UIScene extends Phaser.Scene {
    
    constructor() {
        super({ key: 'UIScene', active: false });
        this.menuButton = null;
        this.panel = null;
        this.isPanelOpen = false;
        this.virtualStick = null;
        this.jumpButton = null;
        // 管理するHUDをプロパティとして初期化
        this.coinHud = null;
        this.playerHpBar = null;
        this.enemyHpBar = null; // バトルシーン用に敵HPバーも管理
    }

    create() {
        console.log("UIScene: 作成・初期化");
        this.scene.bringToTop();
        
        const stateManager = this.sys.registry.get('stateManager');
        const gameWidth = 1280;
        const gameHeight = 720;
// --- 仮想スティックの生成 ---
        this.virtualStick = new VirtualStick(this, {
            x: 150,
            y: 550,
            texture_base: 'stick_base',   // 仮のアセットキー
            texture_stick: 'stick_knob' // 仮のアセットキー
        });
         // --- ジャンプボタンの生成 ---
   /*     this.jumpButton = this.add.image(1150, 550, 'jump_button_texture') // 仮のアセットキー
            .setInteractive()
            .setScrollFactor(0);*/

        // --- 1. パネルと、その中のボタンを生成 ---
        this.panel = this.add.container(0, gameHeight + 120); // 初期位置は画面下
        
        const panelBg = this.add.rectangle(gameWidth / 2, 0, gameWidth, 120, 0x000000, 0.8).setInteractive();
        const saveButton = this.add.text(0, 0, 'セーブ', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        const loadButton = this.add.text(0, 0, 'ロード', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        const backlogButton = this.add.text(0, 0, '履歴', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        const configButton = this.add.text(0, 0, '設定', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        const autoButton = this.add.text(0, 0, 'オート', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        const skipButton = this.add.text(0, 0, 'スキップ', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5).setInteractive();
        
        this.panel.add([panelBg, saveButton, loadButton, backlogButton, configButton, autoButton, skipButton]);

        // --- 2. パネル内のボタンのレイアウトを確定 ---
        const buttons = [saveButton, loadButton, backlogButton, configButton, autoButton, skipButton];
        const areaStartX = 250;
        const areaWidth = gameWidth - areaStartX - 100;
        const buttonMargin = areaWidth / buttons.length;
        buttons.forEach((button, index) => {
            button.setX(areaStartX + (buttonMargin * index) + (buttonMargin / 2));
        });

        // --- 3. メインの「メニュー」ボタンを生成・配置 ---
        this.menuButton = this.add.text(100, gameHeight - 50, 'MENU', { fontSize: '36px', fill: '#fff' }).setOrigin(0.5).setInteractive();

        // --- 4. すべてのイベントリスナーを、ここで一括設定 ---
        
        // パネル背景は、クリックイベントを止めるだけ
        panelBg.on('pointerdown', (pointer, localX, localY, event) => {
            event.stopPropagation();
        });

        // メニューボタンは、パネルの開閉をトリガー
        this.menuButton.on('pointerdown', (pointer, localX, localY, event) => {
            this.togglePanel();
            event.stopPropagation();
        });

        // 各機能ボタン
        saveButton.on('pointerdown', (pointer, localX, localY, event) => {
            this.openScene('SaveLoadScene', { mode: 'save' });
            event.stopPropagation();
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
        
        // --- HUDのインスタンスを生成 ---
        this.coinHud = new CoinHud(this, { x: 100, y: 50, stateManager: stateManager });
        this.playerHpBar = new HpBar(this, { x: 100, y: 100, width: 200, height: 25, type: 'player', stateManager: stateManager });
        // BattleSceneにしか出てこない敵HPバーもここで作ってしまう
        this.enemyHpBar = new HpBar(this, { x: this.scale.width - 100 - 250, y: 100, width: 250, height: 25, type: 'enemy', stateManager: stateManager });
 // 1. GameSceneのインスタンスを取得する
        const gameScene = this.scene.get('GameScene');

        // 2. GameSceneがメッセージウィンドウを持っているか確認
        if (gameScene && gameScene.messageWindow) {
            
            // 3. GameSceneの表示リストから、メッセージウィンドウを「取り除く」
            //    (messageWindowはContainerなので、GameSceneのルートにいるはず)
            gameScene.children.remove(gameScene.messageWindow);

            // 4. UISceneの表示リストに、そのメッセージウィンドウを「追加」する
            this.add.existing(gameScene.messageWindow);
            
            // 5. 念のため、最前面に表示されるようにDepthを設定
            gameScene.messageWindow.setDepth(100);

            // 6. エディタに登録
            const editor = this.plugins.get('EditorPlugin');
            if (editor) {
                gameScene.messageWindow.name = 'message_window';
                gameScene.messageWindow.setSize(1280, 180);
                editor.makeEditable(gameScene.messageWindow, this); // ★ シーンはUISceneとして登録
            }
            
            console.log("[UIScene] MessageWindow has been moved to the top layer.");
        }
        // --- SystemSceneからの通知を受け取るリスナー ---
        const systemScene = this.scene.get('SystemScene');
        systemScene.events.on('transition-complete', this.onSceneTransition, this);
        
       
      const editor = this.plugins.get('EditorPlugin');
         // --- 4. 各UIオブジェクトに、エディタ用の名前を付ける ---
        this.menuButton.name = 'menu_button';
        this.panel.name = 'bottom_panel';
        this.coinHud.name = 'coin_hud';
        this.playerHpBar.name = 'player_hp_bar';
        this.enemyHpBar.name = 'enemy_hp_bar';
         // 新しいUIも、エディタで編集可能にする
            this.virtualStick.name = 'virtual_stick';
            this.jumpButton.name = 'jump_button';
            // VirtualStickはContainerなので、setSizeが必要
            this.virtualStick.setSize(this.virtualStick.base.width, this.virtualStick.base.height);
            
          

        // --- 5. レイアウトJSONを読み込み、位置を上書きする ---
        const sceneKey = this.scene.key;
        const layoutData = this.cache.json.get(sceneKey); // PreloadSceneでロード済み

        if (layoutData && layoutData.objects) {
            console.log(`[${sceneKey}] Applying layout data to UI elements...`);
            // シーンが持つ全ての子オブジェクトをチェック
            this.children.list.forEach(gameObject => {
                if (gameObject.name) {
                    const layout = layoutData.objects.find(obj => obj.name === gameObject.name);
                    if (layout) {
                        // JSONにデータがあれば、その位置やスケールで上書き
                        gameObject.setPosition(layout.x, layout.y);
                        gameObject.setScale(layout.scaleX, layout.scaleY);
                        gameObject.setAngle(layout.angle);
                        gameObject.setAlpha(layout.alpha);
                    }
                }
            });
        }
        
        // --- 6. 最後に、全てをエディタに登録する ---
       
        if (editor) {
            // コンテナに「先に」サイズを設定
            this.panel.setSize(1280, 120);
            this.coinHud.setSize(150, 50);
            this.playerHpBar.setSize(200, 25);
            this.enemyHpBar.setSize(250, 25);
            
            // 「後から」エディタに登録
            editor.makeEditable(this.menuButton, this);
            editor.makeEditable(this.panel, this);
            editor.makeEditable(this.coinHud, this);
            editor.makeEditable(this.playerHpBar, this);
            editor.makeEditable(this.enemyHpBar, this);
            editor.makeEditable(this.virtualStick, this);
            editor.makeEditable(this.jumpButton, this);

        }


        
        console.log("UI作成完了");
    } // createメソッドの終わり
    /**
     * ★★★ 新規メソッド ★★★
     * レイアウト定義から、正しい種類のUIオブジェクトを生成する
     */
    createObjectFromLayout(layout) {
        let uiElement = null;
        const stateManager = this.registry.get('stateManager');
        const CustomUIClass = CUSTOM_UI_MAP[layout.type];

        if (CustomUIClass) {
            uiElement = new CustomUIClass(this, { ...layout.params, stateManager });
        } else {
            switch (layout.type) {
                case 'Text':
                    uiElement = this.add.text(0, 0, layout.params.text, layout.params.style).setOrigin(0.5);
                    break;
                case 'Panel':
                    uiElement = this.createBottomPanel();
                    break;
            }
        }
        return uiElement;
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
    // --- 以下、このクラスが持つメソッド群 ---
   onSceneTransition(newSceneKey) {
        console.log(`[UIScene] シーン遷移を検知。HUD表示を更新します。新しいシーン: ${newSceneKey}`);

        const isGameScene = (newSceneKey === 'GameScene');
        const isBattleScene = (newSceneKey === 'BattleScene');

        // シーンに応じてHUDの表示/非表示を切り替える
        if (this.coinHud) this.coinHud.setVisible(isGameScene || isBattleScene);
           const showVirtualControls = ['JumpScene', 'ActionScene'].includes(newSceneKey);
        
        if (this.virtualStick) this.virtualStick.setVisible(showVirtualControls);
        if (this.jumpButton) this.jumpButton.setVisible(showVirtualControls);
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここを修正 ★★★
        // ★★★ playerHpBarはBattleSceneの時だけ表示 ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★
        if (this.playerHpBar) this.playerHpBar.setVisible(isBattleScene); 
        
        if (this.enemyHpBar) this.enemyHpBar.setVisible(isBattleScene);
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