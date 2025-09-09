
import BaseGameScene from './BaseGameScene.js';
import ActionInterpreter from '../core/ActionInterpreter.js';
import PlayerController from '../components/PlayerController.js';

export default class JumpScene extends BaseGameScene {

     constructor() {
        super({ key: 'JumpScene' });
        this.joystick = null;
        this.playerController = null; // ★ playerControllerもnullで初期化
        this.actionInterpreter = null;
    }

  create() {
        console.log("[JumpScene] Create started.");
        
        this.actionInterpreter = new ActionInterpreter(this);
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

        this.joystick = this.plugins.get('rexvirtualjoystickplugin').add(this, {
            x: 150, y: 550, radius: 100,
            base: this.add.circle(0, 0, 100, 0x888888, 0.5),
            thumb: this.add.circle(0, 0, 50, 0xcccccc, 0.8),
        });
    }
     dumpJoyStickState() {
        // このメソッドは、PlayerControllerのupdateで直接参照するため、
        // デバッグ以外では空でも良い
    }
    addObjectFromEditor(assetKey, newName) {
        const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2;
        const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2;
        
        // SpritesheetかImageかを判定するロジックはEditorUI側に持たせた方が良いかもしれないが、
        // ここでも機能はする
        const isSpriteSheet = this.game.cache.json.get(assetKey + '_spritesheet') ? true : false;
        
        const newObject = this.createObjectFromLayout({
            texture: assetKey,
            type: isSpriteSheet ? 'Sprite' : 'Image'
        });
        
        this.applyProperties(newObject, {
            name: newName,
            x: Math.round(centerX), 
            y: Math.round(centerY)
        });
        
        return newObject;
    }

    /**
     * コンポーネントをGameObjectにアタッチする (責務を単一化)
     * ★★★ 以下のメソッドで、既存の addComponent を完全に置き換えてください ★★★
     */
    addComponent(target, componentType, params = {}) {
        let componentInstance = null;
        
        // --- 1. インスタンス生成 ---
        if (componentType === 'PlayerController') {
            componentInstance = new PlayerController(this, target, params);
        }
        // ... (将来、EnemyAIなどをここに追加) ...

        if (componentInstance) {
            // --- 2. GameObjectにインスタンスを格納 ---
            // これがコンポーネント管理の「唯一の正しい場所」
            if (!target.components) {
                target.components = {};
            }
            target.components[componentType] = componentInstance;

            // --- 3. 永続化用のデータも保存 ---
            const currentData = target.getData('components') || [];
            if (!currentData.some(c => c.type === componentType)) {
                currentData.push({ type: componentType, params: params });
                target.setData('components', currentData);
            }
            console.log(`[JumpScene] Component '${componentType}' added to '${target.name}'.`);
        }
    }

  
    /**
     * ★★★ 以下のメソッドで、既存の onSetupComplete を完全に置き換えてください ★★★
     */
    onSetupComplete() {
        // ★★★ this.player への参照は、ゲームオーバー判定のために必要なので残す ★★★
        this.player = this.children.list.find(obj => obj.getData('group') === 'player');
        
        if (this.player) {
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
            // ★★★ この startFollow の呪いを、ここから削除する ★★★
            // this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
            // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

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

 update(time, delta) {
        
        // --- 1. プレイヤーコントローラーの更新 (変更なし) ---
        // これにより、プレイヤーはスクロールする世界の中で、自由に行動できる
        if (this.playerController) {
            this.playerController.updateWithJoystick(this.joystick);
        }

        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
        // ★★★ ここからが、世界を動かす、新しいロジックだ ★★★
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        // --- 2. ステージの強制スクロール ---
        // 毎フレーム、カメラのX座標を一定量だけ増加させる
        const scrollSpeed = 2; // この値を調整すれば、ゲームの速度が変わる
        this.cameras.main.scrollX += scrollSpeed;

        // --- 3. (応用) ゲームオーバー判定 ---
        // プレイヤーが、カメラの左端から見切れてしまったら
        if (this.player && this.player.x < this.cameras.main.scrollX - (this.player.width / 2)) {
            // ここにゲームオーバー処理を追加する
            // (例: シーンをリスタートする)
            console.log("GAME OVER");
            this.scene.restart(); 
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