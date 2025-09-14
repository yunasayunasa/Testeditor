
import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import { ComponentRegistry } from '../components/index.js';
export default class JumpScene extends BaseGameScene {

     constructor() {
        super({ key: 'JumpScene' });
        this.joystick = null;
        this.playerController = null; // ★ playerControllerもnullで初期化
        this.actionInterpreter = null;
    }

  create() {
        console.log("[JumpScene] Create started.");
        
     this.actionInterpreter = new ActionInterpreter();
        this.cameras.main.setBackgroundColor('#4488cc');
        
        const soundManager = this.registry.get('soundManager');
        if (soundManager) soundManager.playBgm('bgm_action');

        const worldWidth = 3840;
        const worldHeight = 1440;

        // ★★★ ここからがMatter.jsへの対応です ★★★
        // 1. Matter.jsのAPIを使って、世界の境界を設定する
        this.matter.world.setBounds(0, 0, worldWidth, worldHeight);

        // 2. カメラの境界設定は、物理エンジンとは無関係なので、そのまま使える
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        // ★★★ ここまで ★★★

        // データからシーンを構築する命令は最後に呼ぶ
         this.initSceneWithData();
      const uiScene = this.scene.get('UIScene');

    /*    // --- 2. ゲーム開始時には、メッセージウィンドウは不要なので非表示にする ---
        if (uiScene) {
            uiScene.setElementVisible('message_window', false);
        }*/
     // --------------------------------------------------------------------
        // --- デバッグモードでない時だけ、ジョイスティックを生成する ---
        const isDebug = new URLSearchParams(window.location.search).has('debug');

        if (!isDebug) {
            this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
                x: 150, y: 550, radius: 100,
                base: this.add.circle(0, 0, 100, 0x888888, 0.5),
                thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8),
            });
        } else {
            // デバッグモードの時は、joystickをnullのままにしておく
            this.joystick = null;
        }
    }
     dumpJoyStickState() {
        // このメソッドは、PlayerControllerのupdateで直接参照するため、
        // デバッグ以外では空でも良い
    }
       /**
     * ★★★ 修正版 ★★★
     * JumpSceneに特有のロジック（SpriteかImageかの判定）だけを行い、
     * 残りの共通処理はすべて親クラスに委譲する。
     */
    addObjectFromEditor(assetKey, newName, layerName) {
        // --- JumpScene固有の処理 ---
        const isSpriteSheet = this.game.cache.json.get(assetKey + '_spritesheet') ? true : false;
        const type = isSpriteSheet ? 'Sprite' : 'Image';
        
        // --- 共通処理は親クラス(super)を呼び出す ---
        return super._addObjectFromEditorCore({ texture: assetKey, type: type }, newName, layerName);
    }

     /**
     * コンポーネントをGameObjectにアタッチする (動的読み込み対応版)
     */
    addComponent(target, componentType, params = {}) {
        
        // ▼▼▼【ここからが修正箇所 2/2】▼▼▼
        // --------------------------------------------------------------------
        // --- 1. ComponentRegistryに、指定された名前のコンポーネントが存在するか確認 ---
        const ComponentClass = ComponentRegistry[componentType];

        if (ComponentClass) {
            // --- 2. 存在すれば、そのクラスをインスタンス化する ---
            const componentInstance = new ComponentClass(this, target, params);

            // --- 3. GameObjectにインスタンスを格納する (以降の処理は変更なし) ---
            if (!target.components) {
                target.components = {};
            }
            target.components[componentType] = componentInstance;

            const currentData = target.getData('components') || [];
            if (!currentData.some(c => c.type === componentType)) {
                currentData.push({ type: componentType, params: params });
                target.setData('components', currentData);
            }
            console.log(`[JumpScene] Component '${componentType}' added to '${target.name}'.`);

        } else {
            // --- 4. 存在しないコンポーネントが指定された場合は、警告を出す ---
            console.warn(`[JumpScene] Attempted to add an unknown component: '${componentType}'`);
        }
        // --------------------------------------------------------------------
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
    }

  
    /**
     * ★★★ 以下のメソッドで、既存の onSetupComplete を完全に置き換えてください ★★★
     */
    onSetupComplete() {
        // ★★★ プレイヤーの参照取得は、ここで行うのが最も確実 ★★★
        this.player = this.children.list.find(obj => obj.getData('group') === 'player');
        
        if (this.player) {
            this.playerController = this.player.components?.PlayerController;
            this.player.setFixedRotation(); 
        }
        
        // --- ジャンプボタンのイベント処理をここで行う ---
        const uiScene = this.scene.get('UIScene');
        if (uiScene) {
            const jumpButton = uiScene.uiElements.get('jump_button');
            if (jumpButton) {
                jumpButton.on('button_pressed', () => {
                    if (this.playerController) {
                        this.playerController.jump();
                    }
                }, this);
            }
        }
    }

    /**
     * ★★★ 以下のメソッドで、既存の update を完全に置き換えてください ★★★
     */
    update(time, delta) {
        
     

        // --- 1. PlayerControllerのための特別な更新 ---
        if (this.playerController) {
            this.playerController.updateWithJoystick(this.joystick);
        }
        
        // --- 2. その他の全てのコンポーネントのための汎用的な更新ループ ---
        for (const gameObject of this.children.list) {
            if (gameObject.components) {
                for (const componentName in gameObject.components) {
                    // PlayerControllerはすでに更新したので、スキップする
                    if (componentName === 'PlayerController') continue;
                    
                    const component = gameObject.components[componentName];
                    if (component && typeof component.update === 'function') {
                        component.update(time, delta);
                    }
                }
            }
        }
    }
    /**
     * シーン終了時に、全GameObjectのコンポーネントを破棄する
     * ★★★ 以下のメソッドで、既存の shutdown を完全に置き換えてください ★★★
     */
    shutdown() {
        console.log("[JumpScene] Shutdown.");
        // シーン上の全GameObjectを走査
        if (this.children) { // シーンが正常に破棄されることを確認
            for (const gameObject of this.children.list) {
                if (gameObject.components) {
                    for (const key in gameObject.components) {
                        const component = gameObject.components[key];
                        if (component && typeof component.destroy === 'function') {
                            component.destroy();
                        }
                    }
                }
            }
        }
        super.shutdown();
    }
}